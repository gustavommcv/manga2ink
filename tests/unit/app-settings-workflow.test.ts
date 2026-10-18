import { describe, expect, it, vi } from 'vitest';

import type { AppSettingsStorePort } from '@/application/ports/app-settings-store';
import { AppSettingsWorkflow } from '@/application/workflows/app-settings';
import {
  defaultKeptAppSettings,
  defaultProcessingChoice,
  type KeptAppSettings,
  type LanguagePreference,
  defaultAppSettings,
} from '@/domain/app-settings';

const kept = (
  language: LanguagePreference,
  processing = defaultProcessingChoice,
): KeptAppSettings => ({ ...defaultKeptAppSettings, language, processing });

function fakeStore(load: Awaited<ReturnType<AppSettingsStorePort['load']>>): {
  readonly store: AppSettingsStorePort;
  readonly save: ReturnType<typeof vi.fn<AppSettingsStorePort['save']>>;
  readonly settled: ReturnType<typeof vi.fn<AppSettingsStorePort['settled']>>;
} {
  const save = vi.fn<AppSettingsStorePort['save']>(() => Promise.resolve());
  const settled = vi.fn<AppSettingsStorePort['settled']>(() => Promise.resolve());
  return { store: { load: () => Promise.resolve(load), save, settled }, save, settled };
}

describe('restoring the app settings', () => {
  it('says the language a chosen one is', async () => {
    const { store } = fakeStore({ settings: kept('pt-BR'), unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => ['en-US']);

    expect(await workflow.restore()).toEqual({
      settings: { ...defaultAppSettings, language: 'pt-BR' },
      language: 'pt-BR',
      unreadable: false,
    });
  });

  it('works out the language from the system when the system is followed', async () => {
    const { store } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => ['pt-PT', 'en']);

    expect(await workflow.restore()).toEqual({
      settings: { ...defaultAppSettings, language: 'system' },
      language: 'pt-BR',
      unreadable: false,
    });
  });

  it('says that the file could not be used', async () => {
    const { store } = fakeStore({ settings: defaultKeptAppSettings, unreadable: true });
    const workflow = new AppSettingsWorkflow(store, () => []);

    expect(await workflow.restore()).toEqual({
      settings: { ...defaultAppSettings, language: 'system' },
      language: 'en',
      unreadable: true,
    });
  });
});

describe('restoring the app settings again', () => {
  it('reads the file once, and then tells what is held, which a change still being written is part of', async () => {
    const load = vi.fn(() => Promise.resolve({ settings: kept('en'), unreadable: true }));
    const { store, save } = fakeStore({ settings: kept('en'), unreadable: true });
    const workflow = new AppSettingsWorkflow({ ...store, load }, () => ['pt-BR']);

    await workflow.restore();
    await workflow.save({ language: 'pt-BR' });
    const again = await workflow.restore();

    expect(load).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    expect(again).toEqual({
      settings: { ...defaultAppSettings, language: 'pt-BR' },
      language: 'pt-BR',
      unreadable: true,
    });
  });
});

describe('keeping the app settings', () => {
  it('keeps them and says the language they come to', async () => {
    const { store, save } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => ['pt-BR']);

    expect(await workflow.save({ language: 'system' })).toEqual({ language: 'pt-BR' });
    expect(await workflow.save({ language: 'en' })).toEqual({ language: 'en' });

    expect(save.mock.calls).toEqual([[kept('system')], [kept('en')]]);
  });

  it('keeps only the choices a change names, with the rest as it was', async () => {
    const { store, save } = fakeStore({ settings: kept('pt-BR'), unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    expect(await workflow.save({ notifyWhenDone: false })).toEqual({ language: 'pt-BR' });
    expect(await workflow.save({ keepAwake: false, language: undefined })).toEqual({
      language: 'pt-BR',
    });

    expect(save.mock.calls).toEqual([
      [{ ...kept('pt-BR'), notifyWhenDone: false }],
      [{ ...kept('pt-BR'), notifyWhenDone: false, keepAwake: false }],
    ]);
  });

  it('does not say a language when the keeping failed', async () => {
    const { store, save } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    save.mockRejectedValue(new Error('disk'));
    const workflow = new AppSettingsWorkflow(store, () => []);

    await expect(workflow.save({ language: 'en' })).rejects.toThrow('disk');
  });

  it('settles when the store has written everything asked of it', async () => {
    const { store, settled } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });

    await new AppSettingsWorkflow(store, () => []).settled();

    expect(settled).toHaveBeenCalledOnce();
  });
});

describe('how the app looks', () => {
  it('is the theme that was kept, and what a change of it keeps', async () => {
    const { store, save } = fakeStore({
      settings: { ...defaultKeptAppSettings, theme: 'dark' },
      unreadable: false,
    });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    expect(workflow.theme()).toBe('dark');
    await workflow.save({ theme: 'dark' });

    expect(save).toHaveBeenCalledExactlyOnceWith({ ...defaultKeptAppSettings, theme: 'dark' });
  });

  it('is told to the window with the rest of the choices', async () => {
    const { store } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);

    expect((await workflow.restore()).settings.theme).toBe('system');
  });

  it('is the light theme once it is kept, for the window that is made next and for what is restored', async () => {
    const { store, save } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    await workflow.save({ theme: 'light' });

    expect(workflow.theme()).toBe('light');
    expect(save).toHaveBeenCalledExactlyOnceWith({ ...defaultKeptAppSettings, theme: 'light' });
    expect((await workflow.restore()).settings.theme).toBe('light');
  });
});

describe('how many are converted at once', () => {
  it('is the app’s own count until a person chooses, and is what is kept once they do', async () => {
    const { store, save } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    expect(workflow.parallelConversions()).toBe('automatic');

    await workflow.save({ parallelConversions: 2 });

    expect(workflow.parallelConversions()).toBe(2);
    expect(workflow.queueChoices().parallelConversions).toBe(2);
    expect(save).toHaveBeenCalledExactlyOnceWith({
      ...defaultKeptAppSettings,
      parallelConversions: 2,
    });
    expect((await workflow.restore()).settings.parallelConversions).toBe(2);
  });
});

describe('what a queue does', () => {
  it('is on until a person turns it off, and is read as it is now each time it is asked', async () => {
    const { store } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    expect(workflow.queueChoices()).toEqual({
      keepAwake: true,
      notifyWhenDone: true,
      parallelConversions: 'automatic',
    });

    await workflow.save({ keepAwake: false });

    expect(workflow.queueChoices()).toEqual({
      keepAwake: false,
      notifyWhenDone: true,
      parallelConversions: 'automatic',
    });
  });
});

describe('where the app works', () => {
  it('is the places the app picks until a folder is chosen', async () => {
    const { store } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    expect(workflow.processing()).toEqual(defaultProcessingChoice);
  });

  it('is what the file held, once it is read, and the window is not told of it', async () => {
    const processing = { folder: '/big', earlier: ['/old'] };
    const { store } = fakeStore({ settings: kept('en', processing), unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);

    const restored = await workflow.restore();

    expect(workflow.processing()).toEqual(processing);
    expect(restored.settings).toEqual({ ...defaultAppSettings, language: 'en' });
  });

  it('keeps a chosen folder with the language as it is, and says what is kept', async () => {
    const { store, save } = fakeStore({ settings: kept('pt-BR'), unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    const processing = await workflow.chooseProcessingFolder('/big');

    expect(processing).toEqual({ folder: '/big', earlier: [] });
    expect(save).toHaveBeenCalledExactlyOnceWith(kept('pt-BR', processing));
  });

  it('makes the folder it replaces an earlier one, and puts it first when it comes back', async () => {
    const { store } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    await workflow.chooseProcessingFolder('/one');
    await workflow.chooseProcessingFolder('/two');
    expect(workflow.processing()).toEqual({ folder: '/two', earlier: ['/one'] });
    await workflow.chooseProcessingFolder(null);
    expect(workflow.processing()).toEqual({ folder: null, earlier: ['/two', '/one'] });
    await workflow.chooseProcessingFolder('/one');
    expect(workflow.processing()).toEqual({ folder: '/one', earlier: ['/two'] });
  });

  it('keeps a language chosen afterwards with the folder, and not the other way round', async () => {
    const { store, save } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    await workflow.chooseProcessingFolder('/big');
    await workflow.save({ language: 'pt-BR' });

    expect(save).toHaveBeenLastCalledWith(kept('pt-BR', { folder: '/big', earlier: [] }));
  });

  it('forgets earlier folders that nothing is waiting in, and writes nothing when none is forgotten', async () => {
    const { store, save } = fakeStore({
      settings: kept('en', { folder: '/now', earlier: ['/a', '/b'] }),
      unreadable: false,
    });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();

    await workflow.forgetEarlierFolders(['/not-there']);
    expect(save).not.toHaveBeenCalled();
    await workflow.forgetEarlierFolders(['/a']);

    expect(workflow.processing()).toEqual({ folder: '/now', earlier: ['/b'] });
    expect(save).toHaveBeenCalledExactlyOnceWith(kept('en', { folder: '/now', earlier: ['/b'] }));
  });

  it('is as it was when the keeping failed, so the next change does not write the failed one', async () => {
    const { store, save } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();
    save.mockRejectedValueOnce(new Error('disk'));

    await expect(workflow.chooseProcessingFolder('/big')).rejects.toThrow('disk');
    expect(workflow.processing()).toEqual(defaultProcessingChoice);
    await workflow.save({ language: 'en' });

    expect(save).toHaveBeenLastCalledWith(kept('en'));
  });

  it('does not take a failed change back over one that was kept after it', async () => {
    const { store, save } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => []);
    await workflow.restore();
    let fail: (error: Error) => void = () => undefined;
    save.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          fail = reject;
        }),
    );

    const first = workflow.chooseProcessingFolder('/big');
    await workflow.save({ language: 'pt-BR' });
    fail(new Error('disk'));
    await expect(first).rejects.toThrow('disk');

    expect(workflow.processing()).toEqual({ folder: '/big', earlier: [] });
  });
});

describe('the language the main process speaks', () => {
  it('is English until the settings have been read', () => {
    const { store } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });

    expect(new AppSettingsWorkflow(store, () => ['pt-BR']).language()).toBe('en');
  });

  it('is the language the settings came to when they were read, and when they were changed', async () => {
    const { store } = fakeStore({ settings: defaultKeptAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => ['pt-BR', 'en']);

    await workflow.restore();
    expect(workflow.language()).toBe('pt-BR');

    await workflow.save({ language: 'en' });
    expect(workflow.language()).toBe('en');
  });
});
