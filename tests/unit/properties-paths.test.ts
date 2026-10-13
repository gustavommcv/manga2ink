import path from 'node:path';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { isInsideLibrary, resolveLibraryFile, toLibraryRelativePath } from '@/library/paths';
import { rendererFile } from '@/main/renderer-files';

// Where a file is allowed to be is the one thing here that must hold for every input, not for the
// handful that were thought of: a name that climbs out of a folder is the oldest way into a file
// that was not meant to be read. The names are lower case only, since a Windows path is not told
// apart by case and a model that is would disagree with it for no reason that matters.
const names = fc.constantFrom(
  'a',
  'b',
  'manga',
  'vol 1',
  'é',
  '日本',
  '..a',
  'a..',
  '...',
  '_x',
  'x.y',
  '-',
);
const rootSegments = fc.array(names, { minLength: 1, maxLength: 4 });
const rootOf = (segments: readonly string[]): string => path.resolve(path.sep, ...segments);

/** Where `relative` leads from `root`, worked out by hand on the names, never by the path module. */
function modelOf(root: readonly string[], relative: readonly string[]): readonly string[] {
  const stack = [...root];
  for (const segment of relative) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') stack.pop();
    else stack.push(segment);
  }
  return stack;
}
const isBelow = (root: readonly string[], file: readonly string[]): boolean =>
  file.length > root.length && root.every((segment, index) => segment === file[index]);

const walk = fc.array(fc.oneof(names, fc.constantFrom('..', '..', '.', '')), {
  maxLength: 8,
});

describe('a file that has to be inside a library', () => {
  it('is told apart from one that is not by where it ends up, however it climbs and returns', () => {
    fc.assert(
      fc.property(rootSegments, walk, (root, relative) => {
        const file = resolveLibraryFile(rootOf(root), relative.join('/'));

        const expected = modelOf(root, relative);
        expect(file !== undefined).toBe(isBelow(root, expected));
        if (file !== undefined) expect(file).toBe(rootOf(expected));
      }),
      { numRuns: 500 },
    );
  });

  it('never accepts the root itself, a sibling that shares its start, or a parent', () => {
    fc.assert(
      fc.property(rootSegments, names, names, (root, suffix, child) => {
        const rootPath = rootOf(root);
        const last = root.at(-1) ?? '';
        const sibling = rootOf([...root.slice(0, -1), `${last}${suffix}`, child]);

        expect(isInsideLibrary(rootPath, rootPath)).toBe(false);
        expect(isInsideLibrary(rootPath, path.dirname(rootPath))).toBe(false);
        expect(isInsideLibrary(rootPath, sibling)).toBe(false);
        expect(isInsideLibrary(rootPath, path.join(rootPath, child))).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('is written relative to the library with slashes, and found again from what was written', () => {
    fc.assert(
      fc.property(rootSegments, walk, (root, relative) => {
        const rootPath = rootOf(root);
        const target = rootOf(modelOf(root, relative));

        if (isBelow(root, modelOf(root, relative))) {
          const written = toLibraryRelativePath(rootPath, target);
          expect(written.includes('\\')).toBe(false);
          expect(written.split('/')).not.toContain('..');
          expect(path.isAbsolute(written)).toBe(false);
          expect(resolveLibraryFile(rootPath, written)).toBe(target);
        } else {
          expect(() => toLibraryRelativePath(rootPath, target)).toThrow(
            'The converted file is not inside the selected library.',
          );
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe('a file the page asks for on the app scheme', () => {
  const root = rootOf(['srv', 'site']);
  // The ways a name is written to get past a check that compares text: a dot or a slash encoded, in
  // either case, a backslash, a NUL, a percent that starts nothing, and an escape cut short.
  const written = fc.constantFrom(
    'a',
    'main_window',
    'index.html',
    '..',
    '.',
    '%2e%2e',
    '%2E%2E',
    '%2e',
    '..%2f',
    '%2e%2e%2f',
    '%2f',
    '%2F',
    '%5c',
    '%5C',
    '\\',
    '%00',
    '%',
    '%zz',
    '%E0%A4%A',
    '%C3%A9',
    'é',
    ' ',
    '..%5c..',
    '.%2e',
    '%2e.',
  );
  const separators = fc.constantFrom('/', '/', '/', '%2f', '\\');
  const pathname = fc
    .array(fc.tuple(separators, written), { maxLength: 8 })
    .map((parts) => parts.map(([separator, name]) => `${separator}${name}`).join(''));
  const tail = fc.constantFrom('', '', '?x=1', '#top', '?../../etc', '#%2e%2e');

  it('is a file inside the folder that serves the page, or none at all', () => {
    fc.assert(
      fc.property(pathname, tail, (requested, end) => {
        const file = rendererFile(root, `app://mangabound/${requested}${end}`);

        if (file !== undefined) {
          expect(path.isAbsolute(file)).toBe(true);
          expect(isInsideLibrary(root, file)).toBe(true);
          expect(file.includes('\0')).toBe(false);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('is never a file named with a backslash or a NUL, written plainly or encoded', () => {
    fc.assert(
      fc.property(pathname, (requested) => {
        const url = `app://mangabound/${requested}`;
        const decoded = (() => {
          try {
            return decodeURIComponent(new URL(url).pathname);
          } catch {
            return undefined;
          }
        })();

        if (decoded === undefined || decoded.includes('\\') || decoded.includes('\0')) {
          expect(rendererFile(root, url)).toBeUndefined();
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('is only answered for the app’s own scheme and host', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('file', 'http', 'https', 'app2', 'ftp'),
        fc.constantFrom('mangabound', 'elsewhere', 'mangabound.evil', 'localhost', ''),
        (scheme, host) => {
          expect(rendererFile(root, `${scheme}://${host}/main_window/index.html`)).toBeUndefined();
        },
      ),
    );
    fc.assert(
      fc.property(
        fc.constantFrom('app', 'app'),
        fc.constantFrom('elsewhere', 'mangabound.evil', 'localhost', 'MANGABOUND2'),
        (scheme, host) => {
          expect(rendererFile(root, `${scheme}://${host}/main_window/index.html`)).toBeUndefined();
        },
      ),
    );
  });

  it('is the file that was named, for every plain name below the folder', () => {
    fc.assert(
      fc.property(fc.array(names, { minLength: 1, maxLength: 5 }), (segments) => {
        const url = `app://mangabound/${segments.map(encodeURIComponent).join('/')}`;

        expect(rendererFile(root, url)).toBe(path.resolve(root, ...segments));
      }),
      { numRuns: 300 },
    );
  });
});
