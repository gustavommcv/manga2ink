import { describe, expect, it, vi } from 'vitest';

import type { AppSettingsStorePort } from '@/application/ports/app-settings-store';
import { AppSettingsWorkflow } from '@/application/workflows/app-settings';
import { defaultAppSettings } from '@/domain/app-settings';

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
    const { store } = fakeStore({ settings: { language: 'pt-BR' }, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => ['en-US']);

    expect(await workflow.restore()).toEqual({
      settings: { language: 'pt-BR' },
      language: 'pt-BR',
      unreadable: false,
    });
  });

  it('works out the language from the system when the system is followed', async () => {
    const { store } = fakeStore({ settings: defaultAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => ['pt-PT', 'en']);

    expect(await workflow.restore()).toEqual({
      settings: defaultAppSettings,
      language: 'pt-BR',
      unreadable: false,
    });
  });

  it('says that the file could not be used', async () => {
    const { store } = fakeStore({ settings: defaultAppSettings, unreadable: true });
    const workflow = new AppSettingsWorkflow(store, () => []);

    expect(await workflow.restore()).toEqual({
      settings: defaultAppSettings,
      language: 'en',
      unreadable: true,
    });
  });
});

describe('keeping the app settings', () => {
  it('keeps them and says the language they come to', async () => {
    const { store, save } = fakeStore({ settings: defaultAppSettings, unreadable: false });
    const workflow = new AppSettingsWorkflow(store, () => ['pt-BR']);

    expect(await workflow.save({ language: 'system' })).toEqual({ language: 'pt-BR' });
    expect(await workflow.save({ language: 'en' })).toEqual({ language: 'en' });

    expect(save.mock.calls).toEqual([[{ language: 'system' }], [{ language: 'en' }]]);
  });

  it('does not say a language when the keeping failed', async () => {
    const { store, save } = fakeStore({ settings: defaultAppSettings, unreadable: false });
    save.mockRejectedValue(new Error('disk'));
    const workflow = new AppSettingsWorkflow(store, () => []);

    await expect(workflow.save({ language: 'en' })).rejects.toThrow('disk');
  });

  it('settles when the store has written everything asked of it', async () => {
    const { store, settled } = fakeStore({ settings: defaultAppSettings, unreadable: false });

    await new AppSettingsWorkflow(store, () => []).settled();

    expect(settled).toHaveBeenCalledOnce();
  });
});
