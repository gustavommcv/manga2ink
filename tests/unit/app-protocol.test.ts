import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AppProtocol from '@/main/app-protocol';

type Handler = (request: Request) => Promise<Response>;
const electron = vi.hoisted(() => ({
  registerSchemesAsPrivileged: vi.fn<(schemes: readonly unknown[]) => void>(),
  handle: vi.fn<(scheme: string, handler: (request: Request) => Promise<Response>) => void>(),
}));
vi.mock('electron', () => ({
  protocol: {
    registerSchemesAsPrivileged: electron.registerSchemesAsPrivileged,
    handle: electron.handle,
  },
}));

/** Loads the module as the build would: with the entry address it defines already in place. */
async function loadWith(entry: string): Promise<typeof AppProtocol> {
  vi.resetModules();
  vi.stubGlobal('MAIN_WINDOW_WEBPACK_ENTRY', entry);
  return import('@/main/app-protocol');
}

afterEach(() => {
  vi.unstubAllGlobals();
  electron.registerSchemesAsPrivileged.mockReset();
  electron.handle.mockReset();
});

describe('where the window loads its page from', () => {
  it('is the development server, which this module does not serve', async () => {
    const app = await loadWith('http://localhost:3000/main_window');

    expect(app.rendererUrl).toBe('http://localhost:3000/main_window');
    app.serveRenderer();
    expect(electron.handle).not.toHaveBeenCalled();
  });

  it('is an address on the app scheme when the page was built to a file', async () => {
    const root = path.resolve('build', 'renderer');
    const app = await loadWith(`file://${path.join(root, 'main_window', 'index.html')}`);

    expect(app.rendererUrl).toBe('app://mangabound/main_window/index.html');
  });
});

describe('the scheme the packaged page is served on', () => {
  it('is registered as a web origin, with no privilege beyond that', async () => {
    const app = await loadWith('http://localhost:3000/main_window');

    app.registerRendererScheme();

    // Anything more (bypassing the CSP, fetch, CORS, streaming) is a privilege the page does not need.
    expect(electron.registerSchemesAsPrivileged).toHaveBeenCalledExactlyOnceWith([
      { scheme: 'app', privileges: { standard: true, secure: true } },
    ]);
  });

  describe('answering the page', () => {
    let site: string;
    let handler: Handler;
    beforeEach(async () => {
      const parent = await mkdtemp(path.join(os.tmpdir(), 'mangabound-app-protocol-'));
      site = path.join(parent, 'site');
      await mkdir(path.join(site, 'main_window'), { recursive: true });
      await writeFile(path.join(site, 'main_window', 'index.html'), '<p>page</p>');
      await writeFile(path.join(site, 'main_window', 'main_window.js'), 'start();');
      await writeFile(path.join(site, 'main_window', 'logo.svg'), '<svg/>');
      await mkdir(path.join(site, 'main_window', 'folder.js'));
      // Next to the site, and so outside the folder that serves it.
      await writeFile(path.join(parent, 'secret.txt'), 'not the page’s');
      const app = await loadWith(`file://${path.join(site, 'main_window', 'index.html')}`);
      app.serveRenderer();
      const [scheme, registered] = electron.handle.mock.calls[0] ?? [];
      expect(scheme).toBe('app');
      handler = registered as Handler;
    });
    afterEach(() => rm(path.dirname(site), { recursive: true, force: true }));

    const get = (pathname: string, init?: RequestInit): Promise<Response> =>
      handler(new Request(`app://mangabound${pathname}`, init));

    it('gives a file of the build with the type it is known by, and forbids sniffing another', async () => {
      const page = await get('/main_window/index.html');
      expect(page.status).toBe(200);
      expect(await page.text()).toBe('<p>page</p>');
      expect(page.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(page.headers.get('x-content-type-options')).toBe('nosniff');

      const script = await get('/main_window/main_window.js');
      expect(script.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
      expect(await script.text()).toBe('start();');
    });

    it('gives a file of a type that is not listed as a plain download, so the page cannot run it', async () => {
      const logo = await get('/main_window/logo.svg');

      expect(logo.status).toBe(200);
      expect(logo.headers.get('content-type')).toBe('application/octet-stream');
    });

    it.each(['POST', 'PUT', 'DELETE', 'PATCH'])('refuses %s', async (method) => {
      const response = await get('/main_window/index.html', { method, body: 'x' });

      expect(response.status).toBe(405);
    });

    it.each([
      ['a file that is not there', '/main_window/missing.js'],
      ['a folder', '/main_window/folder.js'],
      // The URL parser leaves an encoded slash alone, so the name only climbs once it is decoded.
      ['a file next to the site, by climbing out of the folder', '/..%2fsecret.txt'],
      [
        'a file next to the site, by climbing out of a subfolder',
        '/main_window/..%2f..%2fsecret.txt',
      ],
      ['a name with a backslash', '/main_window%5cindex.html'],
      ['a name with a NUL', '/main_window/index.html%00.js'],
      ['a name that does not decode', '/main_window/%E0%A4%A.js'],
    ])('answers not found for %s', async (_description, pathname) => {
      const response = await get(pathname);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('');
    });

    it('answers not found for another host of the scheme', async () => {
      const other = await handler(new Request('app://elsewhere/main_window/index.html'));

      expect(other.status).toBe(404);
    });
  });
});
