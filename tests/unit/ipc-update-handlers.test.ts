import type { IpcMainInvokeEvent } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MetadataProviderError } from '@/adapters/metadata-providers/errors';
import { message } from '@/domain/message';
import type { UpdateCheck } from '@/domain/update-check';
import { registerUpdateHandlers } from '@/main/ipc/updates';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({ listeners: new Map<string, Listener>() }));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  app: { getVersion: () => '0.1.0-alpha.15' },
}));

const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
const call = (): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get('app:check-updates')!(event, undefined);

const check = vi.fn<(installed: string) => Promise<UpdateCheck>>();

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  registerUpdateHandlers({ check });
});
afterEach(() => {
  electron.listeners.clear();
  check.mockReset();
  vi.restoreAllMocks();
});

describe('looking for an update from the window', () => {
  it('asks with the version that is running, which the window never says', async () => {
    check.mockResolvedValue({ status: 'current', version: '0.1.0-alpha.15' });

    expect(await call()).toEqual({
      ok: true,
      value: { status: 'current', version: '0.1.0-alpha.15' },
    });
    expect(check).toHaveBeenCalledExactlyOnceWith('0.1.0-alpha.15');
  });

  it('tells a newer version, with where it is, as it was found', async () => {
    const found = {
      status: 'available',
      version: '0.1.0-alpha.16',
      tag: 'v0.1.0-alpha.16',
      publishedAt: '2026-10-20T10:00:00Z',
    } as const;
    check.mockResolvedValue(found);

    expect(await call()).toEqual({ ok: true, value: found });
  });

  it('says why GitHub could not be asked, as an online source does', async () => {
    const said = message('provider.unreachable', { service: 'GitHub' });
    check.mockRejectedValue(new MetadataProviderError('network_error', said, true));

    expect(await call()).toEqual({ ok: false, error: { code: 'network_error', said } });
  });

  it('does not let an error of its own cross the bridge', async () => {
    check.mockRejectedValue(new Error('The installed version is not a version: dev'));

    const answer = await call();

    expect(answer.ok).toBe(false);
  });
});
