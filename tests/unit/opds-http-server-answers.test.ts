import http from 'node:http';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { clientLeft, NodeOpdsServer } from '@/adapters/opds/http-server';
import type { LibraryStorePort } from '@/application/ports/library-store';
import type { OpdsAuthConfig, OpdsServerHandle } from '@/application/ports/opds-server';
import { libraryManifestSchemaVersion, type LibraryBookEntry } from '@/library/manifest';

const open: OpdsAuthConfig = { username: '', password: '' };
const book = (relativePath: string): LibraryBookEntry => ({
  relativePath,
  title: relativePath,
  author: 'Unknown',
  format: 'epub',
  bytes: 1,
  convertedAt: '2026-09-16T10:00:00.000Z',
});

const handles: OpdsServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((handle) => handle.stop()));
  vi.restoreAllMocks();
});

async function serve(
  store: LibraryStorePort,
  auth: OpdsAuthConfig = open,
  ownNames?: readonly string[],
): Promise<OpdsServerHandle> {
  const handle = await new NodeOpdsServer(store, ownNames === undefined ? {} : { ownNames }).start({
    libraryPath: '/library',
    libraryTitle: 'My Library',
    interfaceAddress: '127.0.0.1',
    port: 0,
    auth,
  });
  handles.push(handle);
  return handle;
}
const storeOf = (
  tracked: readonly LibraryBookEntry[],
  untracked: readonly LibraryBookEntry[] = [],
): LibraryStorePort => ({
  read: () => Promise.resolve({ schemaVersion: libraryManifestSchemaVersion, books: tracked }),
  publish: () => Promise.reject(new Error('not used')),
  scanUntracked: () => Promise.resolve(untracked),
});

/** A request with a Host header of its own, which `fetch` does not let a caller set. */
function requestWithHost(
  handle: OpdsServerHandle,
  host: string,
  pathname = '/',
): Promise<{ status: number; type: string | undefined; body: string }> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: '127.0.0.1', port: handle.port, path: pathname, headers: { Host: host } },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => (body += chunk));
        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            type: response.headers['content-type'],
            body,
          });
        });
      },
    );
    request.on('error', reject);
    request.end();
  });
}

describe('what a reader is told about the kind of thing it was sent', () => {
  it('is an acquisition feed for the recent books and the other files, and a navigation feed for the start', async () => {
    const handle = await serve(storeOf([book('a.epub')], [book('loose.cbz')]));

    const start = await fetch(`${handle.url}/`);
    const recent = await fetch(`${handle.url}/recent`);
    const other = await fetch(`${handle.url}/other`);

    expect(start.headers.get('content-type')).toBe(
      'application/atom+xml;profile=opds-catalog;kind=navigation',
    );
    for (const feed of [recent, other]) {
      expect(feed.headers.get('content-type')).toBe(
        'application/atom+xml;profile=opds-catalog;kind=acquisition',
      );
    }
  });

  it('is plain text, with the sentence meant for a person, when the answer is a refusal or a failure', async () => {
    const handle = await serve(storeOf([]), open, ['this-computer']);
    const refusedHost = await requestWithHost(handle, 'somewhere.else');
    const notFound = await fetch(`${handle.url}/nothing-here`);
    const failing = await serve({
      ...storeOf([]),
      read: () => Promise.reject(new Error('the catalog is damaged')),
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken = await fetch(`${failing.url}/recent`);

    expect(refusedHost).toMatchObject({
      status: 403,
      type: 'text/plain; charset=utf-8',
      body: 'Use an address of this computer to reach the catalog.',
    });
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await notFound.text()).toBe('Not found.');
    expect(broken.status).toBe(500);
    expect(broken.headers.get('content-type')).toBe('text/plain; charset=utf-8');
  });
});

describe('which book is served for a name', () => {
  it('is the loose file of that name, and not the first one found, when the name is not among them', async () => {
    const handle = await serve(storeOf([], [book('first.epub'), book('second.epub')]));

    const unknown = await fetch(`${handle.url}/books/third.epub`);

    expect(unknown.status).toBe(404);
    expect(await unknown.text()).toBe('Not found.');
  });

  it('is not found for a name whose percent-encoding is broken, however many loose files there are', async () => {
    const handle = await serve(storeOf([], [book('first.epub')]));

    const broken = await fetch(`${handle.url}/books/%E0%A4%A`);

    expect(broken.status).toBe(404);
  });
});

describe('credentials that are not a user and a password', () => {
  it('are refused when they hold no colon, even when they equal the start of the password', async () => {
    // Read as "everything but the last character" and "the whole of it", these would be the pair.
    const handle = await serve(storeOf([]), { username: 'use', password: 'user' });

    const response = await fetch(`${handle.url}/recent`, {
      headers: { Authorization: `Basic ${Buffer.from('user').toString('base64')}` },
    });

    expect(response.status).toBe(401);
  });
});

describe('an error that says a reader went away', () => {
  it('is an error with the code of a connection that ended, not an object that only looks like one', () => {
    expect(clientLeft({ code: 'ECONNRESET' })).toBe(false);
    expect(clientLeft(Object.assign(new Error('x'), { code: 42 }))).toBe(false);
  });
});
