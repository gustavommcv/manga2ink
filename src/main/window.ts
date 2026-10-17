import path from 'node:path';

import { app, BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';

import { rendererUrl } from './app-protocol';
import { type Theme, themeWindowColors } from '@/domain/theme';
import { minimumWindowSize } from '@/domain/window-state';

import type { LeavingGuard } from './leaving';
import { isPermissionGranted } from './permission-policy';
import type { WindowStateKeeper } from './window-state';

/**
 * The window's own buttons, drawn by the system over the top 48px: the same height as the title bar
 * in the page, which draws no line of its own for that reason (see Titlebar), in the colors of the
 * theme.
 */
const titleBarOverlay = (theme: Theme): { color: string; height: number; symbolColor: string } => ({
  color: themeWindowColors[theme].background,
  height: 48,
  symbolColor: themeWindowColors[theme].foreground,
});

/**
 * Makes the parts of the app that the system draws (dialogs, menus, scrollbars) the scheme of the
 * theme, so they sit with the page whatever the system itself is set to (ADR 0067).
 */
export function applyThemeToApp(
  system: { themeSource: 'dark' | 'light' | 'system' },
  theme: Theme,
): void {
  system.themeSource = themeWindowColors[theme].scheme;
}

/**
 * Gives a window the colors of a theme where the system, and not the page, draws them: what it is
 * painted with before the page does, and the overlay of its buttons (not on macOS, where they are the
 * system's own). The page itself follows the theme through its own variables (ADR 0066).
 */
export function applyThemeToWindow(
  window: Pick<BrowserWindow, 'setBackgroundColor' | 'setTitleBarOverlay'>,
  theme: Theme,
): void {
  window.setBackgroundColor(themeWindowColors[theme].background);
  if (process.platform !== 'darwin') window.setTitleBarOverlay(titleBarOverlay(theme));
}

/**
 * Opens the window of the app. `leaving` is asked before the window closes where that ends the app
 * (not on macOS, where closing the last window leaves it running, and a conversion with it: the
 * books it makes are there to reopen), so a conversion is not lost to a click on the wrong button.
 * It opens as it was left, size and place, when that can still be had on the displays there are now
 * (ADR 0062), and in the colors of the theme that was chosen (ADR 0066).
 */
export const createMainWindow = (
  leaving: LeavingGuard,
  windowState: Pick<WindowStateKeeper, 'placement' | 'track'>,
  theme: Theme,
): BrowserWindow => {
  const { maximized, ...placement } = windowState.placement();
  const iconName = process.platform === 'win32' ? 'mangabound.ico' : 'mangabound.png';
  const platformTitleBar: Pick<
    BrowserWindowConstructorOptions,
    'titleBarOverlay' | 'trafficLightPosition'
  > =
    process.platform === 'darwin'
      ? { trafficLightPosition: { x: 16, y: 16 } }
      : { titleBarOverlay: titleBarOverlay(theme) };
  const window = new BrowserWindow({
    icon: app.isPackaged
      ? path.join(process.resourcesPath, iconName)
      : path.join(app.getAppPath(), 'assets', 'icons', iconName),
    // Electron cannot read CSS variables: the hex values of a theme are in src/domain/theme.ts, and a
    // test keeps them in step with its --background and --foreground in src/renderer/styles.css.
    // No show:false/'ready-to-show':
    // Electron's own docs recommend showing immediately on a matching backgroundColor instead, for
    // exactly the case this project hit - 'ready-to-show' arriving late enough to make the app feel
    // like it never started at all. This also removes the class of bug that was possible with it: a
    // window and its process tree alive indefinitely because nothing ever called show().
    backgroundColor: themeWindowColors[theme].background,
    // The size, and the place when there is one to keep: otherwise the system chooses it.
    ...placement,
    // Small enough for half of a 1366px-wide screen with a tiling window manager's gaps and a
    // reader beside it: a tiled window is not allowed under its minimum, so a larger one is drawn
    // past the edge of the screen instead of being made to fit. The pages are laid out and checked
    // down to this width (tests/visual/narrow-window.visual.spec.ts).
    minHeight: minimumWindowSize.height,
    minWidth: minimumWindowSize.width,
    title: 'Mangabound',
    titleBarStyle: 'hidden',
    ...platformTitleBar,
    webPreferences: {
      // The preload runs sandboxed, with no access to the main-process-only `app` module; this is
      // the standard way to hand it a value from main without a round trip through IPC.
      additionalArguments: [`--app-version=${app.getVersion()}`],
      contextIsolation: true,
      nodeIntegration: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      sandbox: true,
    },
  });
  // Asked for before the window is drawn, so it does not open in one size and jump to the other.
  if (maximized) window.maximize();
  // Through the emitter every window is, which takes the events the keeper listens for by name.
  const emitter: NodeJS.EventEmitter = window;
  windowState.track({
    on: (event, listener) => emitter.on(event, listener),
    getNormalBounds: () => window.getNormalBounds(),
    isMaximized: () => window.isMaximized(),
    isDestroyed: () => window.isDestroyed(),
  });
  // Request, check and device handlers are three separate doors: each one that is left alone
  // answers "yes" for everything.
  const { session } = window.webContents;
  session.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(isPermissionGranted(permission));
  });
  session.setPermissionCheckHandler((_contents, permission) => isPermissionGranted(permission));
  session.setDevicePermissionHandler(() => false);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  if (process.platform !== 'darwin') {
    window.on('close', (event) => {
      const leave = (): void => {
        window.close();
      };
      if (!leaving.allows(leave)) event.preventDefault();
    });
  }

  // Two different ways the entry point can fail to ever appear, needing two different signals:
  // loadURL()'s own rejection (tied to did-fail-load) covers the page failing to load; it does not
  // cover the renderer process dying outright (a crash doesn't reject the navigation, it just never
  // resolves it), which render-process-gone is Electron's dedicated signal for. Either way, quit
  // rather than leave an empty window and its process tree running with nothing to show for it -
  // but only before the first successful load: the same failures after a real session is already up
  // are a different situation this isn't meant to touch.
  let hasLoadedOnce = false;
  window.webContents.once('render-process-gone', () => {
    if (!hasLoadedOnce) app.quit();
  });
  window
    .loadURL(rendererUrl)
    .then(() => {
      hasLoadedOnce = true;
    })
    .catch(() => {
      app.quit();
    });

  return window;
};
