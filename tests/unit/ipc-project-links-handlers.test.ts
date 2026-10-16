import type { IpcMainInvokeEvent } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerProjectLinkHandlers } from '@/main/ipc/project-links';
import { openProjectLinkCommandSchema, projectLinks } from '@/shared/project-links-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  openExternal: vi.fn<(address: string) => Promise<void>>(),
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  shell: { openExternal: electron.openExternal },
  app: { getVersion: () => '0.1.0-alpha.15' },
}));

const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
const call = (payload?: unknown): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get('app:open-link')!(event, payload);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  electron.openExternal.mockResolvedValue(undefined);
  registerProjectLinkHandlers();
});
afterEach(() => {
  electron.listeners.clear();
  electron.openExternal.mockReset();
  vi.restoreAllMocks();
});

describe('the command that opens a place', () => {
  it('names the place and the language, and nothing else', () => {
    expect(openProjectLinkCommandSchema.parse({ link: 'guide', language: 'pt-BR' })).toEqual({
      link: 'guide',
      language: 'pt-BR',
    });
    expect(
      openProjectLinkCommandSchema.parse({
        link: 'support',
        language: 'en',
        address: 'https://example.com/',
      }),
    ).toEqual({ link: 'support', language: 'en' });
  });

  it.each([
    {},
    { link: 'guide' },
    { language: 'en' },
    { link: 'https://example.com/', language: 'en' },
    { link: 'file:///etc/passwd', language: 'en' },
    { link: 'guide', language: 'ja' },
    { link: 'guide', language: '' },
    'guide',
    null,
  ])('refuses %j', (command) => {
    expect(openProjectLinkCommandSchema.safeParse(command).success).toBe(false);
  });
});

describe('opening a place', () => {
  it.each(projectLinks)(
    'opens the address that main has for %s, in the system browser',
    async (link) => {
      expect(await call({ link, language: 'en' })).toEqual({ ok: true, value: undefined });

      expect(electron.openExternal).toHaveBeenCalledTimes(1);
      expect(electron.openExternal.mock.calls[0]?.[0]).toMatch(/^https:\/\//u);
    },
  );

  it('opens the guide of the language of the window', async () => {
    await call({ link: 'guide', language: 'pt-BR' });

    expect(electron.openExternal).toHaveBeenCalledExactlyOnceWith(
      'https://gustavommcv.github.io/mangabound/pt-br/',
    );
  });

  it('opens the release notes of the version that is running', async () => {
    await call({ link: 'release-notes', language: 'pt-BR' });

    expect(electron.openExternal).toHaveBeenCalledExactlyOnceWith(
      'https://github.com/gustavommcv/mangabound/releases/tag/v0.1.0-alpha.15',
    );
  });

  it('opens nothing for an address the window made up', async () => {
    const answer = await call({ link: 'https://example.com/', language: 'en' });

    expect(answer.ok).toBe(false);
    expect(electron.openExternal).not.toHaveBeenCalled();
  });

  it('says so when the system could not open it, without throwing across the bridge', async () => {
    electron.openExternal.mockRejectedValue(new Error('no browser'));

    const answer = await call({ link: 'support', language: 'en' });

    expect(answer.ok).toBe(false);
  });
});
