import { tmpdir } from 'node:os';
import path from 'node:path';

import { app, BrowserWindow, ipcMain, screen } from 'electron';
import started from 'electron-squirrel-startup';

import { directoryExists } from '@/adapters/library/directory-exists';
import { FsCoverStore } from '@/adapters/covers/fs-cover-store';
import { removeStaleScratch } from '@/adapters/fs/stale-scratch';
import { FsPendingRuns } from '@/adapters/library/fs-pending-runs';
import { FileLog } from '@/adapters/log/file-log';
import { ProcessingFolders } from '@/adapters/library/processing-folders';
import { moveLegacyStorage } from '@/adapters/library/legacy-storage';
import { coversRoot, legacyStorageMove, pendingRoot } from '@/adapters/library/pending-path';
import { FsAppSettingsStore } from '@/adapters/settings/fs-app-settings-store';
import { FsWindowStateStore } from '@/adapters/settings/fs-window-state-store';
import { FsSettingsStore } from '@/adapters/settings/fs-settings-store';
import { AppSettingsWorkflow } from '@/application/workflows/app-settings';
import { PreferencesWorkflow } from '@/application/workflows/preferences';

import { registerRendererScheme, serveRenderer } from './app-protocol';
import { createMainContext } from './context';
import { settleEarlierFolders } from './processing-status';
import { cleanUpBeforeQuit } from './quit-cleanup';
import { WindowStateKeeper, windowPositionsAreKnown } from './window-state';
import { askToLeave, LeavingGuard } from './leaving';
import { installLog, logFolder } from './log';
import { registerArtifactHandlers } from './ipc/artifacts';
import { registerConversionHandlers } from './ipc/conversion';
import { registerCoverHandlers } from './ipc/covers';
import { registerInputHandlers } from './ipc/inputs';
import { registerMetadataHandlers } from './ipc/metadata';
import { registerOpdsHandlers } from './ipc/opds';
import { dialogWords } from './ipc/dialog-words';
import { registerPendingHandlers } from './ipc/pending';
import { registerPendingCleanupHandlers } from './ipc/pending-cleanup';
import { registerProcessingFolderHandlers } from './ipc/processing-folder';
import { registerTroubleshootingHandlers } from './ipc/troubleshooting';
import { registerProjectLinkHandlers } from './ipc/project-links';
import { registerAppSettingsHandlers } from './ipc/app-settings';
import { registerSettingsHandlers } from './ipc/settings';
import { bootstrapToolchain } from './toolchain-bootstrap';
import { createMainWindow } from './window';

if (started) app.quit();

// Electron accepts a new scheme's privileges only before the app is ready.
registerRendererScheme();

// A second copy would share the settings and the pending books with the first, and its start-up
// cleanup could remove the folder the first has just made for a conversion. The second one asks the
// first to come forward and quits.
const holdsTheLock = app.requestSingleInstanceLock();
if (!holdsTheLock) app.quit();
app.on('second-instance', () => {
  const [window] = BrowserWindow.getAllWindows();
  if (window === undefined) return;
  if (window.isMinimized()) window.restore();
  window.focus();
});

const context = createMainContext();
// Asked before the app is closed while a conversion runs, whichever way it is closed (ADR 0059).
const leaving = new LeavingGuard(
  () => context.conversions.size > 0,
  () => askToLeave(dialogWords(context).leaveWhileConverting, BrowserWindow.getAllWindows()[0]),
);
const oneDay = 24 * 60 * 60 * 1000;
let cleanupStarted = false;
// The size and place of the window, kept between sessions (ADR 0062); built when the app is ready.
let windowState: WindowStateKeeper | undefined;

void app.whenReady().then(async () => {
  if (!holdsTheLock) return;
  // First, so that what goes wrong from here on is in the log (ADR 0058). A line the log could not
  // write is told on the terminal, which it has not yet taken over.
  context.log = new FileLog({
    directory: logFolder(app.getPath('userData')),
    onFailure: console.warn.bind(console),
  });
  installLog(
    context.log,
    { console, process },
    `Mangabound ${app.getVersion()} started (${app.isPackaged ? 'packaged' : 'development build'}, Electron ${process.versions.electron}, ${process.platform} ${process.arch}).`,
  );
  // Before anything reads them: an earlier version kept these in the installer's own folder on
  // Windows, which uninstalling the app empties.
  const legacyMove = legacyStorageMove(process.platform, process.env, app.getPath('home'));
  if (legacyMove !== undefined) {
    await moveLegacyStorage({
      ...legacyMove,
      onProblem: (message, cause) => {
        console.error(message, cause);
      },
    });
  }
  context.coverStore = new FsCoverStore(
    coversRoot(process.platform, process.env, app.getPath('home')),
  );
  // Where the app works depends on what a person chose, so the app settings come first (ADR 0056).
  const appSettingsWorkflow = new AppSettingsWorkflow(
    new FsAppSettingsStore(path.join(app.getPath('userData'), 'app-settings.json')),
    () => app.getPreferredSystemLanguages(),
  );
  context.appSettings = appSettingsWorkflow;
  await appSettingsWorkflow.restore();
  context.processing = new ProcessingFolders(
    {
      pending: pendingRoot(process.platform, process.env, app.getPath('home')),
      scratch: tmpdir(),
    },
    () => appSettingsWorkflow.processing(),
  );
  const toolchainStatus = await bootstrapToolchain(context);
  context.toolchainStatus = toolchainStatus;
  ipcMain.handle('toolchain:get-status', () => toolchainStatus);

  const preferencesWorkflow = new PreferencesWorkflow(
    new FsSettingsStore(path.join(app.getPath('userData'), 'settings.json')),
    directoryExists,
  );
  context.preferences = preferencesWorkflow;
  context.pendingRuns = new FsPendingRuns(
    context.processing.asPendingRoots(),
    context.libraryStore,
  );
  // Sharing the ready books serves the folder they are in now, every conversion in it.
  const processing = context.processing;
  context.pendingCatalog.useRoot(() => processing.pendingRoot());
  await context.pendingRuns.pruneCompleted().catch((error: unknown) => {
    console.error('Could not clear previously exported pending books.', error);
  });
  // What a run that was killed left behind: a half-made first book in a pending folder, and the
  // scratch copies of its volumes in a scratch one. Anything newer than a day may belong to
  // another copy of the app that is still working.
  await context.pendingRuns.pruneAbandoned(oneDay).catch((error: unknown) => {
    console.error('Could not clear a run that was interrupted before its first book.', error);
  });
  for (const scratchRoot of processing.scratchRoots()) {
    await removeStaleScratch(scratchRoot, oneDay).catch((error: unknown) => {
      console.error('Could not clear scratch folders an earlier run left behind.', error);
    });
  }
  await settleEarlierFolders(context).catch((error: unknown) => {
    console.error('Could not tell which earlier folders still hold books.', error);
  });

  registerSettingsHandlers(context, preferencesWorkflow);
  registerAppSettingsHandlers(appSettingsWorkflow);
  registerProcessingFolderHandlers(context);
  registerProjectLinkHandlers();
  registerTroubleshootingHandlers(context);
  registerInputHandlers(context);
  registerConversionHandlers(context);
  registerCoverHandlers(context);
  registerMetadataHandlers(context);
  registerArtifactHandlers(context);
  registerPendingHandlers(context);
  registerPendingCleanupHandlers(context);
  registerOpdsHandlers(context);

  serveRenderer();
  const keeper = new WindowStateKeeper(
    new FsWindowStateStore(path.join(app.getPath('userData'), 'window-state.json')),
    () => {
      // The main display first, since a window that cannot be placed goes there.
      const main = screen.getPrimaryDisplay();
      return [main, ...screen.getAllDisplays().filter((display) => display.id !== main.id)].map(
        (display) => display.workArea,
      );
    },
    windowPositionsAreKnown(process.platform, process.env),
    (message, cause) => {
      console.error(message, cause);
    },
  );
  windowState = keeper;
  await keeper.restore();
  createMainWindow(leaving, keeper);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow(leaving, keeper);
  });
});

app.on('before-quit', (event) => {
  if (cleanupStarted) return;
  event.preventDefault();
  // Quitting is held either way; once the person has agreed it goes on, and `quit` comes back here.
  if (
    !leaving.allows(() => {
      app.quit();
    })
  ) {
    return;
  }
  cleanupStarted = true;
  void cleanUpBeforeQuit(
    {
      activeJobs: context.activeJobs,
      // A change made an instant before quitting is still written.
      releaseAll: context.workflow === undefined ? undefined : () => context.workflow!.releaseAll(),
      stopSharing:
        context.activeSharing === undefined ? undefined : () => context.activeSharing!.stop(),
      settlePreferences:
        context.preferences === undefined ? undefined : () => context.preferences!.settled(),
      settleAppSettings:
        context.appSettings === undefined ? undefined : () => context.appSettings!.settled(),
      pruneCompleted:
        context.pendingRuns === undefined ? undefined : () => context.pendingRuns!.pruneCompleted(),
      // The window as it is now, since the quit may go on before its own last move is written.
      settleWindowState: windowState === undefined ? undefined : () => windowState!.flush(),
      settleLog: context.log === undefined ? undefined : () => context.log!.settled(),
    },
    () => {
      app.quit();
    },
    (message, cause) => {
      console.error(message, cause);
    },
  );
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
