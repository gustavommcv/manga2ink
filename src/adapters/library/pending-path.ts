import path from 'node:path';

/**
 * The name the app had before it was Manga2Ink (ADR 0085). Its folders are found under it until
 * they are moved; the hidden `.mangabound` folder in a person's own folders keeps it for good.
 */
export const formerName = 'Mangabound';

/** A move of some of the app's folders from where an earlier version kept them. */
export interface StorageMove {
  readonly from: string;
  readonly to: string;
  readonly folders: readonly string[];
}

/**
 * Where the app's own folders are on Windows. Not `Manga2Ink`: the installer puts the app in
 * `%LOCALAPPDATA%\manga2ink`, which Windows takes for the same name, and uninstalling removes
 * everything in that folder, a person's unsaved books with it.
 */
const windowsStorageFolder = 'Manga2Ink Data';

function windowsLocalAppData(environment: NodeJS.ProcessEnv, home: string): string {
  const localAppData = environment.LOCALAPPDATA;
  return localAppData !== undefined && path.isAbsolute(localAppData)
    ? localAppData
    : path.join(home, 'AppData', 'Local');
}

function linuxDataHome(environment: NodeJS.ProcessEnv, home: string): string {
  const dataHome = environment.XDG_DATA_HOME;
  return dataHome !== undefined && path.isAbsolute(dataHome)
    ? dataHome
    : path.join(home, '.local', 'share');
}

function chosen(value: string | undefined): boolean {
  return value !== undefined && path.isAbsolute(value);
}

/**
 * What to move from where Mangabound kept pending books and covers to where Manga2Ink keeps them
 * (ADR 0085), or `undefined` where there is nothing to move: macOS, where they were in the folder
 * of the settings and move with it, or a root chosen by the environment. A covers root chosen by
 * the environment is left out, as in {@link legacyStorageMove}.
 */
export function formerStorageMove(
  platform: NodeJS.Platform,
  environment: NodeJS.ProcessEnv,
  home: string,
): StorageMove | undefined {
  if (platform === 'darwin' || chosen(environment.MANGA2INK_PENDING_ROOT)) return undefined;
  const windows = platform === 'win32';
  const folders = windows ? ['Pending', 'Covers'] : ['pending', 'covers'];
  return {
    from: windows
      ? path.join(windowsLocalAppData(environment, home), `${formerName} Data`)
      : path.join(linuxDataHome(environment, home), formerName.toLowerCase()),
    to: path.dirname(pendingRoot(platform, environment, home)),
    folders: chosen(environment.MANGA2INK_COVERS_ROOT) ? folders.slice(0, 1) : folders,
  };
}

/**
 * What to move out of the folder an earlier version kept pending books and covers in (the
 * installer's own) into where they are kept now, or `undefined` where there is nothing to move: a
 * platform that never had that installer, or a root chosen by the environment, which no version
 * kept in the installer's folder. A covers root chosen by the environment is left out of the
 * move, since nothing reads the covers from the folder they would be moved to.
 */
export function legacyStorageMove(
  platform: NodeJS.Platform,
  environment: NodeJS.ProcessEnv,
  home: string,
): StorageMove | undefined {
  if (platform !== 'win32' || chosen(environment.MANGA2INK_PENDING_ROOT)) return undefined;
  return {
    // That installer was Mangabound's, and its folder has that name.
    from: path.join(windowsLocalAppData(environment, home), formerName),
    to: path.dirname(pendingRoot(platform, environment, home)),
    folders: chosen(environment.MANGA2INK_COVERS_ROOT) ? ['Pending'] : ['Pending', 'Covers'],
  };
}

/** Pending books are user work, not disposable OS temp files or roaming settings data. */
export function pendingRoot(
  platform: NodeJS.Platform,
  environment: NodeJS.ProcessEnv,
  home: string,
): string {
  const chosenRoot = environment.MANGA2INK_PENDING_ROOT;
  if (chosenRoot !== undefined && path.isAbsolute(chosenRoot)) return chosenRoot;
  if (platform === 'win32') {
    return path.join(windowsLocalAppData(environment, home), windowsStorageFolder, 'Pending');
  }
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Manga2Ink', 'Pending');
  }
  return path.join(linuxDataHome(environment, home), 'manga2ink', 'pending');
}

/**
 * Covers a person attached are kept beside the pending books: they are that person's own files,
 * copied so the originals can go, and no more a setting than a finished book is.
 */
export function coversRoot(
  platform: NodeJS.Platform,
  environment: NodeJS.ProcessEnv,
  home: string,
): string {
  if (
    environment.MANGA2INK_COVERS_ROOT !== undefined &&
    path.isAbsolute(environment.MANGA2INK_COVERS_ROOT)
  ) {
    return environment.MANGA2INK_COVERS_ROOT;
  }
  // The same folder the pending books are in, whatever the platform calls it, without an
  // override of theirs moving the covers along.
  const { MANGA2INK_PENDING_ROOT: ignored, ...rest } = environment;
  void ignored;
  const pending = pendingRoot(platform, rest, home);
  return path.join(
    path.dirname(pending),
    platform === 'win32' || platform === 'darwin' ? 'Covers' : 'covers',
  );
}
