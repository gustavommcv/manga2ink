import { useEffect, useMemo } from 'react';

import { defaultLanguage } from '@/domain/app-settings';
import { type AnyMessage, message } from '@/domain/message';
import {
  type AppSettingsBridge,
  AppSettingsContext,
  useAppSettingsState,
} from '@/renderer/hooks/use-app-settings';
import { type AppInfo, AppInfoContext } from '@/renderer/hooks/use-app-info';
import {
  type ProcessingFolderApi,
  ProcessingFolderContext,
} from '@/renderer/hooks/use-processing-folder';
import { I18nContext } from '@/renderer/hooks/use-messages';
import { messagesFor } from '@/i18n/messages';
import type { WorkflowResult } from '@/shared/workflow-contract';

/** A call to the main process whose failure to arrive is told as one that was answered with a failure. */
async function reaching<T>(call: () => Promise<WorkflowResult<T>>): Promise<WorkflowResult<T>> {
  try {
    return await call();
  } catch {
    return {
      ok: false,
      error: { code: 'bridge_unreachable', said: message('failure.internal', {}) },
    };
  }
}

/**
 * What to tell a person when a call to the main process did not do what it was asked: the failure
 * it answered with, or a failure of the call itself. Nothing when it did.
 */
async function saying(
  call: () => Promise<WorkflowResult<undefined>>,
): Promise<AnyMessage | undefined> {
  try {
    const answer = await call();
    return answer.ok ? undefined : answer.error.said;
  } catch {
    return message('failure.internal', {});
  }
}

/**
 * Reads what a person decided about the app (ADR 0052) and gives everything under it the language
 * and its messages, and the way to change them, and what the app says about itself (its version, and
 * the way to open a place in the browser of the system, ADR 0054). It draws nothing until the
 * settings are read, which is a moment, so nothing is drawn in a language that is about to change.
 */
export function AppSettingsProvider({
  bridge,
  children,
}: {
  readonly bridge: AppSettingsBridge;
  readonly children: React.ReactNode;
}): React.JSX.Element | null {
  const state = useAppSettingsState(bridge);
  const language = state?.language ?? defaultLanguage;
  const i18n = useMemo(() => ({ language, messages: messagesFor(language) }), [language]);
  const info = useMemo<AppInfo>(
    () => ({
      version: bridge.runtime.version,
      platform: bridge.runtime.platform,
      openLink: async (link) => {
        try {
          return (await bridge.openProjectLink({ link, language })).ok;
        } catch {
          return false;
        }
      },
      copyDiagnostics: async () => saying(() => bridge.copyDiagnostics()),
      openFolder: async (folder) => saying(() => bridge.openAppFolder({ folder })),
      tools: async () => {
        try {
          return await bridge.getToolchainStatus();
        } catch {
          return undefined;
        }
      },
    }),
    [bridge, language],
  );

  const processing = useMemo<ProcessingFolderApi>(
    () => ({
      get: () => reaching(bridge.getProcessingFolder),
      choose: () => reaching(bridge.chooseProcessingFolder),
      useDefault: () => reaching(bridge.useDefaultProcessingFolder),
      countIdle: (days) => reaching(() => bridge.countIdlePending({ days })),
      deleteIdle: (days) => reaching(() => bridge.deleteIdlePending({ days })),
    }),
    [bridge],
  );

  // The page says which language it is in, for the readers that speak it.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (state === undefined) return null;
  return (
    <AppSettingsContext.Provider value={state}>
      <AppInfoContext.Provider value={info}>
        <ProcessingFolderContext.Provider value={processing}>
          <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
        </ProcessingFolderContext.Provider>
      </AppInfoContext.Provider>
    </AppSettingsContext.Provider>
  );
}
