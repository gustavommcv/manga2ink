import type { IpcMainInvokeEvent } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsSaveError } from '@/application/ports/settings-store';
import { registerAppSettingsHandlers } from '@/main/ipc/app-settings';
import { saveAppSettingsCommandSchema } from '@/shared/app-settings-contract';
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
const call = (channel: string, payload?: unknown): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get(channel)!(event, payload);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  electron.listeners.clear();
  vi.restoreAllMocks();
});

describe('the command that keeps the app settings', () => {
  it('takes a language the app has, or the system', () => {
    expect(saveAppSettingsCommandSchema.parse({ language: 'pt-BR' })).toEqual({
      language: 'pt-BR',
    });
    expect(saveAppSettingsCommandSchema.parse({ language: 'system' })).toEqual({
      language: 'system',
    });
  });

  it.each([{}, { language: 'ja' }, { language: 3 }, { language: '' }, 'pt-BR', null])(
    'refuses %j',
    (command) => {
      expect(saveAppSettingsCommandSchema.safeParse(command).success).toBe(false);
    },
  );

  it('drops what it does not know', () => {
    expect(saveAppSettingsCommandSchema.parse({ language: 'en', folder: '/books' })).toEqual({
      language: 'en',
    });
  });
});

describe('loading the app settings', () => {
  it('tells the window what was kept and the language it comes to', async () => {
    const restored = {
      settings: { language: 'system' as const },
      language: 'pt-BR' as const,
      unreadable: false,
    };
    const restore = vi.fn(() => Promise.resolve(restored));
    registerAppSettingsHandlers({ restore, save: vi.fn() });

    expect(await call('app:load-settings')).toEqual({ ok: true, value: restored });
  });
});

describe('keeping the app settings', () => {
  it('keeps what the window sends and says the language it comes to', async () => {
    const save = vi.fn(() => Promise.resolve({ language: 'pt-BR' as const }));
    registerAppSettingsHandlers({ restore: vi.fn(), save });

    expect(await call('app:save-settings', { language: 'system' })).toEqual({
      ok: true,
      value: { language: 'pt-BR' },
    });
    expect(save).toHaveBeenCalledExactlyOnceWith({ language: 'system' });
  });

  it('refuses what is not a choice of the app, and keeps nothing', async () => {
    const save = vi.fn();
    registerAppSettingsHandlers({ restore: vi.fn(), save });

    expect(await call('app:save-settings', { language: 'klingon' })).toMatchObject({
      ok: false,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('says the settings could not be kept when the file cannot be written', async () => {
    const save = vi.fn(() => Promise.reject(new SettingsSaveError()));
    registerAppSettingsHandlers({ restore: vi.fn(), save });

    expect(await call('app:save-settings', { language: 'en' })).toMatchObject({
      ok: false,
      error: { code: 'settings_save_failed' },
    });
  });
});
