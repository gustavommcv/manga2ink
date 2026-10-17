import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { contentTypeFor, pageInTheme, rendererFile, rendererLocation } from '@/main/renderer-files';

const root = path.resolve('build', 'renderer');

describe('rendererLocation', () => {
  it('keeps the development server where it is, with nothing for this app to serve', () => {
    expect(rendererLocation('http://localhost:3000/main_window')).toEqual({
      url: 'http://localhost:3000/main_window',
      root: undefined,
    });
  });

  it('turns the built page into an address on the app scheme, served from the folder around its own', () => {
    // Written the way the build writes it: `file://` and then a path of this platform, as it is.
    const entry = `file://${path.join(root, 'main_window', 'index.html')}`;

    expect(rendererLocation(entry)).toEqual({
      url: 'app://mangabound/main_window/index.html',
      root,
    });
  });
});

describe('rendererFile', () => {
  it('finds a file below the root', () => {
    expect(rendererFile(root, 'app://mangabound/main_window/index.js')).toBe(
      path.join(root, 'main_window', 'index.js'),
    );
  });

  it('decodes the name the page asked for', () => {
    expect(rendererFile(root, 'app://mangabound/main_window/a%20b.js')).toBe(
      path.join(root, 'main_window', 'a b.js'),
    );
  });

  it('keeps a file whose name only starts with two dots', () => {
    expect(rendererFile(root, 'app://mangabound/..hidden.js')).toBe(path.join(root, '..hidden.js'));
  });

  it.each([
    ['another host', 'app://elsewhere/main_window/index.js'],
    ['another scheme', 'file:///etc/passwd'],
    ['a web address', 'https://mangabound/main_window/index.js'],
    ['a name that does not decode', 'app://mangabound/main_window/%E0%A4%A.js'],
    ['an encoded backslash', 'app://mangabound/main_window%5C..%5Cpreload.js'],
    ['a NUL', 'app://mangabound/main_window/index.js%00.txt'],
    ['an address that is not one', 'not a url'],
    ['the root itself', 'app://mangabound/'],
  ])('refuses %s', (_description, requestUrl) => {
    expect(rendererFile(root, requestUrl)).toBeUndefined();
  });

  it.each([
    'app://mangabound/../secret.txt',
    'app://mangabound/main_window/../../secret.txt',
    'app://mangabound/%2e%2e/secret.txt',
    'app://mangabound/main_window/%2e%2e/%2e%2e/secret.txt',
    'app://mangabound/main_window/..%2f..%2fsecret.txt',
  ])('does not leave the root for %s', (requestUrl) => {
    const file = rendererFile(root, requestUrl);
    expect(file === undefined || file.startsWith(`${root}${path.sep}`)).toBe(true);
    expect(file).not.toBe(path.resolve(root, '..', 'secret.txt'));
  });
});

describe('contentTypeFor', () => {
  it.each([
    ['index.html', 'text/html; charset=utf-8'],
    ['index.js', 'text/javascript; charset=utf-8'],
    ['styles.css', 'text/css; charset=utf-8'],
    ['index.js.map', 'application/json; charset=utf-8'],
    ['index.js.LICENSE.txt', 'text/plain; charset=utf-8'],
    ['INDEX.HTML', 'text/html; charset=utf-8'],
  ])('calls %s %s', (file, type) => {
    expect(contentTypeFor(file)).toBe(type);
  });

  it('calls anything else a plain download, which a page cannot run', () => {
    expect(contentTypeFor('payload.exe')).toBe('application/octet-stream');
    expect(contentTypeFor('noextension')).toBe('application/octet-stream');
  });
});

describe('pageInTheme', () => {
  it('names the theme on the html element, as the build writes it, without quotes', () => {
    const built = '<!doctype html><html class=mangabound-app lang=en data-theme=dark><head></head>';

    expect(pageInTheme(built, 'light')).toBe(
      '<!doctype html><html class=mangabound-app lang=en data-theme="light"><head></head>',
    );
  });

  it.each([
    ['double quotes', '<html lang="en" data-theme="dark">'],
    ['single quotes', "<html lang='en' data-theme='dark'>"],
    ['no quotes', '<html lang=en data-theme=dark>'],
    ['capitals, which HTML allows', '<HTML LANG=en DATA-THEME=dark>'],
    ['a line break before the attribute', '<html lang="en"\n  data-theme="dark">'],
  ])('takes the attribute written with %s', (_name, html) => {
    expect(pageInTheme(html, 'light')).toMatch(/data-theme="light"/iu);
    expect(pageInTheme(html, 'light')).not.toMatch(/dark/iu);
  });

  it('is the theme that is asked for, whatever the page named, and never anything else', () => {
    expect(pageInTheme('<html data-theme=light>', 'dark')).toBe('<html data-theme="dark">');
  });

  it('changes only the html element, not an attribute of that name further down', () => {
    const page = '<html lang=en data-theme=dark><body><div data-theme=dark></div></body>';

    expect(pageInTheme(page, 'light')).toBe(
      '<html lang=en data-theme="light"><body><div data-theme=dark></div></body>',
    );
  });

  it('gives a page that has no such attribute as it is', () => {
    const page = '<html lang=en><body data-theme=dark></body></html>';

    expect(pageInTheme(page, 'light')).toBe(page);
    expect(pageInTheme('<p>not a page</p>', 'light')).toBe('<p>not a page</p>');
  });
});
