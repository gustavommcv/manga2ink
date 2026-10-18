import { useId, useState } from 'react';

import { isLanguagePreference, languagePreferences } from '@/domain/app-settings';
import { isThemePreference, themePreferences } from '@/domain/theme';
import { FieldMessage } from '@/renderer/components/shared/field-message';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { useAppSettings } from '@/renderer/hooks/use-app-settings';
import { useMessages } from '@/renderer/hooks/use-messages';
import { languageNames } from '@/i18n/messages';

/** What is decided about how the window speaks and looks: the language and the theme. */
export function InterfaceTab(): React.JSX.Element {
  const { appSettings: words } = useMessages();
  const { settings, change, setLanguage } = useAppSettings();
  const [languageFailed, setLanguageFailed] = useState(false);
  const [themeFailed, setThemeFailed] = useState(false);
  const id = useId();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${id}-language`}>
          {words.language.label}
        </label>
        <NativeSelect
          aria-describedby={`${id}-language-help`}
          id={`${id}-language`}
          onChange={(event) => {
            const choice = event.target.value;
            if (!isLanguagePreference(choice)) return;
            void setLanguage(choice).then((kept) => {
              setLanguageFailed(!kept);
            });
          }}
          value={settings.language}
        >
          {languagePreferences.map((choice) => (
            <option key={choice} value={choice}>
              {choice === 'system' ? words.language.system : languageNames[choice]}
            </option>
          ))}
        </NativeSelect>
        <div aria-live="polite">
          <FieldMessage
            description={words.language.help}
            id={`${id}-language-help`}
            {...(languageFailed ? { error: words.language.saveFailed } : {})}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`${id}-theme`}>
          {words.theme.label}
        </label>
        <NativeSelect
          aria-describedby={`${id}-theme-help`}
          id={`${id}-theme`}
          onChange={(event) => {
            const choice = event.target.value;
            if (!isThemePreference(choice)) return;
            void change({ theme: choice }).then((kept) => {
              setThemeFailed(!kept);
            });
          }}
          value={settings.theme}
        >
          {themePreferences.map((choice) => (
            <option key={choice} value={choice}>
              {choice === 'system' ? words.theme.system : words.theme.names[choice]}
            </option>
          ))}
        </NativeSelect>
        <div aria-live="polite">
          <FieldMessage
            description={words.theme.help}
            id={`${id}-theme-help`}
            {...(themeFailed ? { error: words.theme.saveFailed } : {})}
          />
        </div>
      </div>
    </div>
  );
}
