import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  type AppSettings,
  defaultAppSettings,
  type Language,
  type LanguagePreference,
  resolveLanguage,
} from '@/domain/app-settings';
import type { MangaboundBridge } from '@/shared/runtime-info';

/** What reading and keeping the app settings needs of the bridge, and nothing else. */
export type AppSettingsBridge = Pick<MangaboundBridge, 'loadAppSettings' | 'saveAppSettings'>;

/** What a person decided about the app itself, and the language it comes to (ADR 0052). */
export interface AppSettingsState {
  readonly settings: AppSettings;
  /** The language to show: the chosen one, or the one the system's languages come to. */
  readonly language: Language;
  /** True when the file was there and could not be used, so these are the defaults. */
  readonly unreadable: boolean;
  /** Keeps a choice and says whether it was kept; the language changes only once it is. */
  readonly setLanguage: (language: LanguagePreference) => Promise<boolean>;
}

type Loaded = Pick<AppSettingsState, 'settings' | 'language' | 'unreadable'>;

/**
 * What the window starts from when the main process cannot say: the defaults, in the language of
 * the system as the page itself sees it. A window that waited for an answer that never came would
 * be an empty one.
 */
function withoutAnswer(): Loaded {
  return {
    settings: defaultAppSettings,
    language: resolveLanguage('system', navigator.languages),
    unreadable: true,
  };
}

/**
 * Reads the app settings once, and keeps them as they change. It is `undefined` until they have
 * been read, so what is drawn first is already in the right language.
 */
export function useAppSettingsState(bridge: AppSettingsBridge): AppSettingsState | undefined {
  const [loaded, setLoaded] = useState<Loaded>();

  useEffect(() => {
    let reading = true;
    bridge.loadAppSettings().then(
      (result) => {
        if (reading) setLoaded(result.ok ? result.value : withoutAnswer());
      },
      () => {
        if (reading) setLoaded(withoutAnswer());
      },
    );
    return () => {
      reading = false;
    };
  }, [bridge]);

  const setLanguage = useCallback(
    async (language: LanguagePreference): Promise<boolean> => {
      try {
        const result = await bridge.saveAppSettings({ language });
        if (!result.ok) return false;
        // What was just written is good, whatever the file was before.
        setLoaded({ settings: { language }, language: result.value.language, unreadable: false });
        return true;
      } catch {
        return false;
      }
    },
    [bridge],
  );

  return useMemo(
    () => (loaded === undefined ? undefined : { ...loaded, setLanguage }),
    [loaded, setLanguage],
  );
}

/** Where the provider puts the app settings for everything under it. */
export const AppSettingsContext = createContext<AppSettingsState | undefined>(undefined);

/** The app settings, and the way to change them: only under an `AppSettingsProvider`. */
export function useAppSettings(): AppSettingsState {
  const state = useContext(AppSettingsContext);
  if (state === undefined) {
    throw new Error('useAppSettings needs an AppSettingsProvider above it.');
  }
  return state;
}
