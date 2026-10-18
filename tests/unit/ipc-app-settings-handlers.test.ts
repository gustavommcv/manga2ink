import type { IpcMainInvokeEvent } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsSaveError } from '@/application/ports/settings-store';
import { registerAppSettingsHandlers } from '@/main/ipc/app-settings';
import { saveAppSettingsCommandSchema } from '@/shared/app-settings-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';
import { defaultAppSettings } from '@/domain/app-settings';
import { parallelChoices } from '@/domain/parallel-conversions';

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

  it('takes a yes or no for each of the choices about a queue, alone or with the language', () => {
    expect(saveAppSettingsCommandSchema.parse({ notifyWhenDone: false })).toEqual({
      notifyWhenDone: false,
    });
    expect(saveAppSettingsCommandSchema.parse({ keepAwake: true })).toEqual({ keepAwake: true });
    expect(saveAppSettingsCommandSchema.parse({ theme: 'dark' })).toEqual({ theme: 'dark' });
    expect(saveAppSettingsCommandSchema.parse({ theme: 'light' })).toEqual({ theme: 'light' });
    expect(
      saveAppSettingsCommandSchema.parse({
        language: 'en',
        notifyWhenDone: true,
        keepAwake: false,
      }),
    ).toEqual({ language: 'en', notifyWhenDone: true, keepAwake: false });
  });

  it.each(parallelChoices)(
    'takes how many are converted at once: the app’s own count, or %s',
    (parallelConversions) => {
      expect(saveAppSettingsCommandSchema.parse({ parallelConversions })).toEqual({
        parallelConversions,
      });
    },
  );

  it.each([
    {},
    { parallelConversions: 0 },
    { parallelConversions: 13 },
    { parallelConversions: 100 },
    { parallelConversions: 2.5 },
    { parallelConversions: '2' },
    { parallelConversions: 'auto' },
    { parallelConversions: null },
    { parallelConversions: undefined },
    { language: 'ja' },
    { language: 3 },
    { language: '' },
    { notifyWhenDone: 'yes' },
    { keepAwake: 1 },
    { notifyWhenDone: null },
    { theme: 'neon' },
    { theme: 3 },
    { theme: undefined },
    { language: undefined },
    'pt-BR',
    null,
  ])('refuses %j', (command) => {
    expect(saveAppSettingsCommandSchema.safeParse(command).success).toBe(false);
  });

  it('drops what it does not know', () => {
    expect(saveAppSettingsCommandSchema.parse({ language: 'en', folder: '/books' })).toEqual({
      language: 'en',
    });
    expect(saveAppSettingsCommandSchema.safeParse({ folder: '/books' }).success).toBe(false);
  });
});

describe('loading the app settings', () => {
  it('tells the window what was kept and the language it comes to', async () => {
    const restored = {
      settings: { ...defaultAppSettings, language: 'system' as const },
      language: 'pt-BR' as const,
      unreadable: false,
    };
    const restore = vi.fn(() => Promise.resolve(restored));
    registerAppSettingsHandlers({ restore, save: vi.fn() }, vi.fn());

    expect(await call('app:load-settings')).toEqual({ ok: true, value: restored });
  });
});

describe('keeping the app settings', () => {
  it('keeps what the window sends and says the language it comes to', async () => {
    const save = vi.fn(() => Promise.resolve({ language: 'pt-BR' as const }));
    registerAppSettingsHandlers({ restore: vi.fn(), save }, vi.fn());

    expect(await call('app:save-settings', { language: 'system' })).toEqual({
      ok: true,
      value: { language: 'pt-BR' },
    });
    expect(save).toHaveBeenCalledExactlyOnceWith({ language: 'system' });
  });

  it('tells which theme was kept, once it is, so the windows that are open are given its colors', async () => {
    const save = vi.fn(() => Promise.resolve({ language: 'en' as const }));
    const themed = vi.fn();
    registerAppSettingsHandlers({ restore: vi.fn(), save }, themed);

    await call('app:save-settings', { theme: 'dark', keepAwake: false });

    expect(save).toHaveBeenCalledExactlyOnceWith({ theme: 'dark', keepAwake: false });
    expect(themed).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('does not touch the windows for a change that is not of the theme', async () => {
    const themed = vi.fn();
    registerAppSettingsHandlers(
      { restore: vi.fn(), save: vi.fn(() => Promise.resolve({ language: 'en' as const })) },
      themed,
    );

    await call('app:save-settings', { language: 'en' });

    expect(themed).not.toHaveBeenCalled();
  });

  it('does not give the windows a theme that could not be kept', async () => {
    const themed = vi.fn();
    registerAppSettingsHandlers(
      { restore: vi.fn(), save: vi.fn(() => Promise.reject(new SettingsSaveError())) },
      themed,
    );

    await call('app:save-settings', { theme: 'dark' });

    expect(themed).not.toHaveBeenCalled();
  });

  it('refuses a theme the app does not have, and keeps nothing', async () => {
    const save = vi.fn();
    const themed = vi.fn();
    registerAppSettingsHandlers({ restore: vi.fn(), save }, themed);

    expect(await call('app:save-settings', { theme: 'neon' })).toMatchObject({ ok: false });
    expect(save).not.toHaveBeenCalled();
    expect(themed).not.toHaveBeenCalled();
  });

  it('refuses what is not a choice of the app, and keeps nothing', async () => {
    const save = vi.fn();
    registerAppSettingsHandlers({ restore: vi.fn(), save }, vi.fn());

    expect(await call('app:save-settings', { language: 'klingon' })).toMatchObject({
      ok: false,
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('says the settings could not be kept when the file cannot be written', async () => {
    const save = vi.fn(() => Promise.reject(new SettingsSaveError()));
    registerAppSettingsHandlers({ restore: vi.fn(), save }, vi.fn());

    expect(await call('app:save-settings', { language: 'en' })).toMatchObject({
      ok: false,
      error: { code: 'settings_save_failed' },
    });
  });
});
