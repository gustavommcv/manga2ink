import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultAppSettings } from '@/domain/app-settings';
import { useAppSettingsState } from '@/renderer/hooks/use-app-settings';
import type { RestoredAppSettings } from '@/shared/app-settings-contract';
import { raw } from '@/domain/message';
import type { MangaboundBridge } from '@/shared/runtime-info';

import { inertBridge } from './support/bridge';

type Loaded = Awaited<ReturnType<MangaboundBridge['loadAppSettings']>>;

const restored =
  (value: Partial<RestoredAppSettings> = {}): MangaboundBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({
      ok: true,
      value: { settings: defaultAppSettings, language: 'en', unreadable: false, ...value },
    });

const failing = { ok: false as const, error: { code: 'internal_error', said: raw('No.') } };

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAppSettingsState', () => {
  describe('reading what was kept', () => {
    it('is not ready until the app settings have been read', async () => {
      const read = deferred<Loaded>();
      const bridge = inertBridge({ loadAppSettings: () => read.promise });

      const { result } = renderHook(() => useAppSettingsState(bridge));

      expect(result.current).toBeUndefined();
      await act(async () => {
        read.resolve({
          ok: true,
          value: {
            settings: { ...defaultAppSettings, language: 'pt-BR' },
            language: 'pt-BR',
            unreadable: false,
          },
        });
        await read.promise;
      });
      expect(result.current).toMatchObject({
        settings: { ...defaultAppSettings, language: 'pt-BR' },
        language: 'pt-BR',
        unreadable: false,
      });
    });

    it('gives the language the choice comes to, which the main process worked out', async () => {
      const bridge = inertBridge({
        loadAppSettings: restored({
          settings: { ...defaultAppSettings, language: 'system' },
          language: 'pt-BR',
        }),
      });

      const { result } = renderHook(() => useAppSettingsState(bridge));

      await waitFor(() => {
        expect(result.current).toMatchObject({
          settings: { ...defaultAppSettings, language: 'system' },
          language: 'pt-BR',
        });
      });
    });

    it('says that the file could not be used', async () => {
      const bridge = inertBridge({ loadAppSettings: restored({ unreadable: true }) });

      const { result } = renderHook(() => useAppSettingsState(bridge));

      await waitFor(() => {
        expect(result.current?.unreadable).toBe(true);
      });
    });

    it.each([
      ['is refused', () => Promise.resolve(failing)],
      ['fails', () => Promise.reject(new Error('The channel is gone.'))],
    ])(
      'starts from the defaults, in the language of the system, when asking %s',
      async (_name, loadAppSettings) => {
        vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['pt-BR', 'en-US']);
        const bridge = inertBridge({ loadAppSettings });

        const { result } = renderHook(() => useAppSettingsState(bridge));

        await waitFor(() => {
          expect(result.current).toMatchObject({
            settings: defaultAppSettings,
            language: 'pt-BR',
            unreadable: true,
          });
        });
      },
    );

    it('is English when the system lists nothing the app has', async () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['fr-FR']);
      const bridge = inertBridge({ loadAppSettings: () => Promise.resolve(failing) });

      const { result } = renderHook(() => useAppSettingsState(bridge));

      await waitFor(() => {
        expect(result.current?.language).toBe('en');
      });
    });

    it.each([
      [
        'answer',
        (read: Deferred<Loaded>) => {
          read.resolve({
            ok: true,
            value: { settings: defaultAppSettings, language: 'en', unreadable: false },
          });
        },
      ],
      [
        'failure',
        (read: Deferred<Loaded>) => {
          read.reject(new Error('The channel is gone.'));
        },
      ],
    ])(
      'lets go of what it was reading when it is gone before the %s comes',
      async (_name, settle) => {
        const read = deferred<Loaded>();
        const bridge = inertBridge({ loadAppSettings: () => read.promise });
        const { result, unmount } = renderHook(() => useAppSettingsState(bridge));

        unmount();
        await act(async () => {
          settle(read);
          await read.promise.catch(() => undefined);
        });

        expect(result.current).toBeUndefined();
      },
    );
  });

  describe('changing the language', () => {
    it('keeps the choice, and takes the language it comes to from the answer', async () => {
      const saveAppSettings = vi.fn<MangaboundBridge['saveAppSettings']>(() =>
        Promise.resolve({ ok: true, value: { language: 'pt-BR' } }),
      );
      const bridge = inertBridge({
        loadAppSettings: restored({ unreadable: true }),
        saveAppSettings,
      });
      const { result } = renderHook(() => useAppSettingsState(bridge));
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      let kept: boolean | undefined;
      await act(async () => {
        kept = await result.current?.setLanguage('system');
      });

      expect(kept).toBe(true);
      expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({ language: 'system' });
      // What is in the file is good now, so it is not said to be unreadable any more.
      expect(result.current).toMatchObject({
        settings: { ...defaultAppSettings, language: 'system' },
        language: 'pt-BR',
        unreadable: false,
      });
    });

    it.each([
      ['is refused', () => Promise.resolve(failing)],
      ['fails', () => Promise.reject(new Error('The channel is gone.'))],
    ])('keeps what there was, and says so, when keeping it %s', async (_name, saveAppSettings) => {
      const bridge = inertBridge({
        loadAppSettings: restored({ settings: { ...defaultAppSettings, language: 'en' } }),
        saveAppSettings,
      });
      const { result } = renderHook(() => useAppSettingsState(bridge));
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      let kept: boolean | undefined;
      await act(async () => {
        kept = await result.current?.setLanguage('pt-BR');
      });

      expect(kept).toBe(false);
      expect(result.current).toMatchObject({
        settings: { ...defaultAppSettings, language: 'en' },
        language: 'en',
      });
    });
  });

  describe('changing the other choices', () => {
    it('sends only the choice that changed, and keeps every change that was kept, each on top of the last', async () => {
      const saveAppSettings = vi.fn<MangaboundBridge['saveAppSettings']>(() =>
        Promise.resolve({ ok: true, value: { language: 'en' } }),
      );
      const bridge = inertBridge({ loadAppSettings: restored(), saveAppSettings });
      const { result } = renderHook(() => useAppSettingsState(bridge));
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      await act(async () => {
        await result.current?.change({ notifyWhenDone: false });
      });
      await act(async () => {
        await result.current?.change({ keepAwake: false });
      });

      expect(saveAppSettings.mock.calls).toEqual([
        [{ notifyWhenDone: false }],
        [{ keepAwake: false }],
      ]);
      expect(result.current?.settings).toEqual({
        language: 'system',
        notifyWhenDone: false,
        keepAwake: false,
      });
    });

    it('keeps the choices as they were when the change is not kept, and says so', async () => {
      const bridge = inertBridge({
        loadAppSettings: restored(),
        saveAppSettings: () => Promise.resolve(failing),
      });
      const { result } = renderHook(() => useAppSettingsState(bridge));
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });

      let kept: boolean | undefined;
      await act(async () => {
        kept = await result.current?.change({ keepAwake: false });
      });

      expect(kept).toBe(false);
      expect(result.current?.settings).toEqual(defaultAppSettings);
    });
  });
});
