import type { IpcMainInvokeEvent } from 'electron';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerConversionCapacityHandlers } from '@/main/ipc/conversion-capacity';
import type { WorkflowResult } from '@/shared/workflow-contract';

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
const call = (): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get('app:get-conversion-capacity')!(event, undefined);

afterEach(() => {
  electron.listeners.clear();
});

describe('what the window is told of this computer, for how many conversions run at once', () => {
  it('is what automatic comes to and the most, from the computer as it is when asked', async () => {
    const gib = 1024 ** 3;
    let machine = { processors: 12, memoryBytes: 32 * gib };
    registerConversionCapacityHandlers(() => machine);

    expect(await call()).toEqual({ ok: true, value: { automatic: 3, most: 6 } });

    machine = { processors: 4, memoryBytes: 4 * gib };
    expect(await call()).toEqual({ ok: true, value: { automatic: 1, most: 2 } });
  });

  it('refuses a request that does not come from the window’s own page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    registerConversionCapacityHandlers(() => ({ processors: 4, memoryBytes: 4 * 1024 ** 3 }));
    const stranger = { sender: { mainFrame }, senderFrame: {} } as unknown as IpcMainInvokeEvent;

    const answer = await electron.listeners.get('app:get-conversion-capacity')!(
      stranger,
      undefined,
    );

    expect(answer).toMatchObject({ ok: false });
    vi.restoreAllMocks();
  });
});
