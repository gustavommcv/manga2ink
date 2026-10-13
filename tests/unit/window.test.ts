import path from 'node:path';

import { BrowserWindow, type BrowserWindowConstructorOptions } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMainWindow } from '@/main/window';

type Listener = (...args: never[]) => void;
const electron = vi.hoisted(() => ({
  isPackaged: false,
  version: '0.1.0-alpha.13',
  options: undefined as BrowserWindowConstructorOptions | undefined,
  loadURL: vi.fn<(url: string) => Promise<void>>(),
  quit: vi.fn<() => void>(),
  setPermissionRequestHandler: vi.fn(),
  setPermissionCheckHandler: vi.fn(),
  setDevicePermissionHandler: vi.fn(),
  setWindowOpenHandler: vi.fn(),
  once: vi.fn<(event: string, listener: (...args: never[]) => void) => void>(),
  on: vi.fn<(event: string, listener: (...args: never[]) => void) => void>(),
}));
vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return electron.isPackaged;
    },
    getAppPath: () => '/opt/mangabound/app',
    getVersion: () => electron.version,
    quit: () => {
      electron.quit();
    },
  },
  BrowserWindow: class {
    readonly webContents = {
      session: {
        setPermissionRequestHandler: electron.setPermissionRequestHandler,
        setPermissionCheckHandler: electron.setPermissionCheckHandler,
        setDevicePermissionHandler: electron.setDevicePermissionHandler,
      },
      setWindowOpenHandler: electron.setWindowOpenHandler,
      on: electron.on,
      once: electron.once,
    };
    constructor(options: BrowserWindowConstructorOptions) {
      electron.options = options;
    }
    loadURL(url: string): Promise<void> {
      return electron.loadURL(url);
    }
  },
}));
vi.mock('@/main/app-protocol', () => ({ rendererUrl: 'app://mangabound/main_window/index.html' }));

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const originalResources = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
const onPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', { configurable: true, value: platform });
};

const optionsOfWindow = (): BrowserWindowConstructorOptions => {
  if (electron.options === undefined) throw new Error('No window was made');
  return electron.options;
};
const listenerOf = (
  registered: { mock: { calls: readonly (readonly unknown[])[] } },
  event: string,
): Listener => {
  const found = registered.mock.calls.find(([name]) => name === event);
  if (found === undefined) throw new Error(`Nothing listens for ${event}`);
  return found[1] as Listener;
};
/** Lets the promise of the page's load settle and its continuations run. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  electron.isPackaged = false;
  electron.version = '0.1.0-alpha.13';
  electron.options = undefined;
  electron.loadURL.mockReset().mockResolvedValue(undefined);
  for (const mock of [
    electron.quit,
    electron.setPermissionRequestHandler,
    electron.setPermissionCheckHandler,
    electron.setDevicePermissionHandler,
    electron.setWindowOpenHandler,
    electron.once,
    electron.on,
  ]) {
    mock.mockReset();
  }
  vi.stubGlobal('MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY', '/build/preload/index.js');
  Object.defineProperty(process, 'resourcesPath', {
    configurable: true,
    value: path.join(path.sep, 'opt', 'mangabound', 'resources'),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalPlatform !== undefined) Object.defineProperty(process, 'platform', originalPlatform);
  if (originalResources === undefined) Reflect.deleteProperty(process, 'resourcesPath');
  else Object.defineProperty(process, 'resourcesPath', originalResources);
});

describe('the page the window gives its content', () => {
  it('runs sandboxed and isolated, with no Node of its own', () => {
    createMainWindow();

    expect(optionsOfWindow().webPreferences).toEqual({
      additionalArguments: ['--app-version=0.1.0-alpha.13'],
      contextIsolation: true,
      nodeIntegration: false,
      preload: '/build/preload/index.js',
      sandbox: true,
    });
  });

  it('is told the version of the app, which the sandboxed preload cannot ask for', () => {
    electron.version = '2.4.6-beta.1';

    createMainWindow();

    expect(optionsOfWindow().webPreferences?.additionalArguments).toEqual([
      '--app-version=2.4.6-beta.1',
    ]);
  });

  it('is loaded from the address the build and the scheme settled on', () => {
    createMainWindow();

    expect(electron.loadURL).toHaveBeenCalledExactlyOnceWith(
      'app://mangabound/main_window/index.html',
    );
  });
});

describe('what the window may do', () => {
  it('grants the permission the Copy button needs, and none of the others, asked or checked', () => {
    createMainWindow();
    const request = electron.setPermissionRequestHandler.mock.calls[0]?.[0] as (
      contents: unknown,
      permission: string,
      callback: (granted: boolean) => void,
    ) => void;
    const check = electron.setPermissionCheckHandler.mock.calls[0]?.[0] as (
      contents: unknown,
      permission: string,
    ) => boolean;

    const answers = ['clipboard-sanitized-write', 'media', 'geolocation', 'notifications'].map(
      (permission) => {
        const callback = vi.fn<(granted: boolean) => void>();
        request(undefined, permission, callback);
        return [permission, callback.mock.calls[0]?.[0], check(undefined, permission)];
      },
    );

    expect(answers).toEqual([
      ['clipboard-sanitized-write', true, true],
      ['media', false, false],
      ['geolocation', false, false],
      ['notifications', false, false],
    ]);
  });

  it('is never given a device, whatever asks for one', () => {
    createMainWindow();
    const device = electron.setDevicePermissionHandler.mock.calls[0]?.[0] as () => boolean;

    expect(device()).toBe(false);
  });

  it('opens no other window, and does not follow a link out of the page', () => {
    createMainWindow();
    const open = electron.setWindowOpenHandler.mock.calls[0]?.[0] as () => unknown;
    const preventDefault = vi.fn();

    listenerOf(electron.on, 'will-navigate')({ preventDefault } as never);

    expect(open()).toEqual({ action: 'deny' });
    expect(preventDefault).toHaveBeenCalledOnce();
  });
});

describe('the window itself', () => {
  it('is small enough to sit beside a reader on half of a 1366px screen', () => {
    createMainWindow();

    const { minWidth, minHeight, width, height } = optionsOfWindow();
    // A tiled window is not allowed under its minimum, so a larger one is drawn past the screen's edge.
    expect(minWidth).toBeLessThan(660);
    expect(minHeight).toBeLessThan(500);
    expect(width).toBeGreaterThanOrEqual(minWidth ?? 0);
    expect(height).toBeGreaterThanOrEqual(minHeight ?? 0);
  });

  it('shows at once on the colour of the page, so there is no moment of a blank window', () => {
    createMainWindow();

    expect(optionsOfWindow()).toMatchObject({ backgroundColor: '#121214', title: 'Mangabound' });
    expect(optionsOfWindow()).not.toHaveProperty('show');
  });

  it('draws its own buttons over a title bar of the page on Windows and Linux', () => {
    onPlatform('linux');
    createMainWindow();

    expect(optionsOfWindow()).toMatchObject({
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#121214', height: 48, symbolColor: '#e8e8eb' },
    });
    expect(optionsOfWindow()).not.toHaveProperty('trafficLightPosition');
  });

  it('keeps the traffic lights where the page leaves room for them on macOS', () => {
    onPlatform('darwin');
    createMainWindow();

    expect(optionsOfWindow()).toMatchObject({
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 16, y: 16 },
    });
    expect(optionsOfWindow()).not.toHaveProperty('titleBarOverlay');
  });

  it.each([
    ['win32', false, path.join('/opt/mangabound/app', 'assets', 'icons', 'mangabound.ico')],
    ['linux', false, path.join('/opt/mangabound/app', 'assets', 'icons', 'mangabound.png')],
    ['win32', true, path.join(path.sep, 'opt', 'mangabound', 'resources', 'mangabound.ico')],
    ['linux', true, path.join(path.sep, 'opt', 'mangabound', 'resources', 'mangabound.png')],
  ] as const)('on %s, packaged %s, takes its icon from %s', (platform, packaged, expectedIcon) => {
    onPlatform(platform);
    electron.isPackaged = packaged;

    createMainWindow();

    expect(optionsOfWindow().icon).toBe(expectedIcon);
  });
});

describe('a page that never appears', () => {
  it('quits when the page cannot be loaded, rather than leave an empty window running', async () => {
    electron.loadURL.mockRejectedValue(new Error('net::ERR_FILE_NOT_FOUND'));

    createMainWindow();
    await settle();

    expect(electron.quit).toHaveBeenCalledOnce();
  });

  it('quits when the renderer dies before the first load has finished', async () => {
    let finishLoading: () => void = () => undefined;
    electron.loadURL.mockReturnValue(
      new Promise<void>((resolve) => {
        finishLoading = resolve;
      }),
    );

    createMainWindow();
    listenerOf(electron.once, 'render-process-gone')();
    finishLoading();
    await settle();

    expect(electron.quit).toHaveBeenCalledOnce();
  });

  it('leaves a session alone when the renderer dies after the page has loaded', async () => {
    createMainWindow();
    await settle();

    listenerOf(electron.once, 'render-process-gone')();

    expect(electron.quit).not.toHaveBeenCalled();
  });

  it('does not quit while the page loads without trouble', async () => {
    createMainWindow();
    await settle();

    expect(electron.quit).not.toHaveBeenCalled();
  });

  it('hands the window back', () => {
    expect(createMainWindow()).toBeInstanceOf(BrowserWindow);
  });
});
