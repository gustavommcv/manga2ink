import type { IpcMainInvokeEvent } from 'electron';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FsChapterPreviews, maxPreviewBytes } from '@/adapters/input/chapter-previews';
import { noPreviews } from '@/application/ports/chapter-previews';
import { ConversionWorkflow } from '@/application/workflows/conversion-workflow';
import type { VersionGroup } from '@/domain/chapter-versions';
import { createMappingDraft } from '@/domain/mapping';
import { registerPreviewHandlers } from '@/main/ipc/previews';
import type { WorkflowResult } from '@/shared/workflow-contract';

import { dependencies, folder } from './support/conversion-workflow';
import { zipOf } from './support/zip';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({ listeners: new Map<string, Listener>() }));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
}));
const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
let root: string;
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-previews-'));
});
afterEach(async () => {
  electron.listeners.clear();
  await rm(root, { force: true, recursive: true });
});

describe('the first page of a file that claims a chapter', () => {
  const previews = new FsChapterPreviews();

  it('is read from an archive, whatever the page is called inside it', async () => {
    const archive = path.join(root, 'Ch.1.cbz');
    await writeFile(archive, zipOf([{ name: '第1話/001.PNG', data: png, method: 8 }]));

    const page = await previews.firstPage({
      path: archive,
      kind: 'cbz',
      firstPage: '第1話/001.PNG',
    });

    expect(page?.mime).toBe('image/png');
    expect(Buffer.from(page!.bytes)).toEqual(png);
  });

  it('is read from a folder', async () => {
    await mkdir(path.join(root, 'Ch.2', 'extra'), { recursive: true });
    await writeFile(path.join(root, 'Ch.2', 'extra', '01.jpg'), png);

    const page = await previews.firstPage({
      path: path.join(root, 'Ch.2'),
      kind: 'folder',
      firstPage: 'extra/01.jpg',
    });

    expect(page?.mime).toBe('image/jpeg');
    expect(Buffer.from(page!.bytes)).toEqual(png);
  });

  it('is not a page the tool did not name, or one a window cannot show', async () => {
    const archive = path.join(root, 'Ch.1.cbz');
    await writeFile(archive, zipOf([{ name: '001.jxl', data: png }]));

    expect(await previews.firstPage({ path: archive, kind: 'cbz' })).toBeUndefined();
    expect(
      await previews.firstPage({ path: archive, kind: 'cbz', firstPage: '001.jxl' }),
    ).toBeUndefined();
    expect(
      await previews.firstPage({ path: archive, kind: 'cbz', firstPage: 'no-extension' }),
    ).toBeUndefined();
  });

  it('is nothing when the file cannot be read, or the page is not in it', async () => {
    const archive = path.join(root, 'Ch.1.cbz');
    await writeFile(archive, zipOf([{ name: '001.png', data: png }]));

    expect(
      await previews.firstPage({ path: archive, kind: 'cbz', firstPage: '002.png' }),
    ).toBeUndefined();
    expect(
      await previews.firstPage({
        path: path.join(root, 'missing.cbz'),
        kind: 'cbz',
        firstPage: '001.png',
      }),
    ).toBeUndefined();
    expect(
      await previews.firstPage({
        path: path.join(root, 'missing'),
        kind: 'folder',
        firstPage: '001.png',
      }),
    ).toBeUndefined();
  });

  it('stays in the folder it is said to be in, and is not a page that is too big to show', async () => {
    await mkdir(path.join(root, 'Ch.3'));
    await writeFile(path.join(root, 'secret.png'), png);
    await writeFile(path.join(root, 'Ch.3', 'big.png'), Buffer.alloc(maxPreviewBytes + 1));
    const read = (firstPage: string) =>
      previews.firstPage({ path: path.join(root, 'Ch.3'), kind: 'folder', firstPage });

    expect(await read('../secret.png')).toBeUndefined();
    expect(await read(path.join(root, 'secret.png'))).toBeUndefined();
    expect(await read('.')).toBeUndefined();
    expect(await read('big.png')).toBeUndefined();
  });

  it('does not follow a name that leads out of the folder by a link', async () => {
    await mkdir(path.join(root, 'Ch.4'));
    try {
      await symlink(path.join(root, 'nowhere.png'), path.join(root, 'Ch.4', 'link.png'));
    } catch {
      // The system does not let this account make links: there is nothing to try.
      return;
    }

    expect(
      await previews.firstPage({
        path: path.join(root, 'Ch.4'),
        kind: 'folder',
        firstPage: 'link.png',
      }),
    ).toBeUndefined();
  });

  it('is no page at all for a workflow that was given no way to read them', async () => {
    expect(
      await noPreviews.firstPage({ path: root, kind: 'folder', firstPage: 'a.png' }),
    ).toBeUndefined();
  });
});

describe('asking for the pages of the versions of a chapter', () => {
  const versions: readonly VersionGroup[] = [
    {
      token: '2',
      chapter: 2,
      candidates: [
        {
          id: 'a',
          name: 'a',
          path: '/trusted/a.cbz',
          kind: 'cbz',
          pageCount: 2,
          firstPage: '1.png',
        },
        { id: 'b', name: 'b', path: '/trusted/b', kind: 'folder', pageCount: 3 },
      ],
    },
  ];
  const draft = createMappingDraft({
    mangaTitle: 'Trusted Manga',
    chapters: [{ id: 'a', name: 'a', path: '/trusted/a.cbz', pageCount: 2, chapter: 2 }],
    versions,
  });

  async function opened() {
    const ports = dependencies();
    ports.inspect.mockResolvedValue({ workspaceId: 'workspace-1', draft, issues: [] });
    const pages = {
      firstPage: vi.fn((file: { readonly path: string }) =>
        Promise.resolve(file.path.endsWith('.cbz') ? { mime: 'image/png', bytes: png } : undefined),
      ),
    };
    let id = 0;
    const workflow = new ConversionWorkflow(
      ports.binding,
      ports.conversion,
      () => `id-${String(++id)}`,
      ports.bookFiles,
      () => 1,
      undefined,
      pages,
    );
    return { pages, sessionId: (await workflow.inspect(folder)).sessionId, workflow };
  }

  it('gives the page of each file asked for that has one, and of no other', async () => {
    const { pages, sessionId, workflow } = await opened();

    const found = await workflow.previews.ofVersions(sessionId, ['a', 'b', 'a', '/etc/passwd']);

    expect(found).toEqual([{ id: 'a', mime: 'image/png', bytes: png }]);
    // Each file once, and only those the app read: not a path the page made up.
    expect(pages.firstPage).toHaveBeenCalledTimes(2);
    expect(pages.firstPage.mock.calls.map(([file]) => file.path)).toEqual([
      '/trusted/a.cbz',
      '/trusted/b',
    ]);
  });

  it('refuses a session the app never read', async () => {
    const { workflow } = await opened();

    await expect(workflow.previews.ofVersions('nobody', ['a'])).rejects.toMatchObject({
      code: 'session_not_found',
    });
  });

  it('is asked by the page over the bridge, for the files of its own session', async () => {
    const { sessionId, workflow } = await opened();
    registerPreviewHandlers({ workflow });
    const call = (payload: unknown) => electron.listeners.get('previews:chapters')!(event, payload);

    expect(await call({ sessionId, ids: ['a'] })).toEqual({
      ok: true,
      value: [{ id: 'a', mime: 'image/png', bytes: png }],
    });
    expect((await call({ sessionId, ids: new Array<string>(25).fill('a') })).ok).toBe(false);
    expect((await call({ sessionId: '', ids: [] })).ok).toBe(false);
  });
});
