import { useId, useState } from 'react';

import { isLanguagePreference, languagePreferences } from '@/domain/app-settings';
import { isThemePreference, themePreferences } from '@/domain/theme';
import { Field } from '@/renderer/components/shared/field';
import { Note } from '@/renderer/components/shared/note';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { useAppInfo } from '@/renderer/hooks/use-app-info';
import { useAppSettings } from '@/renderer/hooks/use-app-settings';
import { useMessages } from '@/renderer/hooks/use-messages';
import { languageNames } from '@/i18n/messages';

import { LinkButton } from './link-button';

/** What is decided about how the window speaks and looks: the language and the theme. */
export function InterfaceTab(): React.JSX.Element {
  const { about, appSettings: words } = useMessages();
  const { openLink } = useAppInfo();
  const { settings, change, setLanguage } = useAppSettings();
  const [languageFailed, setLanguageFailed] = useState(false);
  const [noteLinkFailed, setNoteLinkFailed] = useState(false);
  const [themeFailed, setThemeFailed] = useState(false);
  const id = useId();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Field
          announces
          description={words.language.help}
          {...(languageFailed ? { error: words.language.saveFailed } : {})}
          id={`${id}-language`}
          label={words.language.label}
        >
          <NativeSelect
            aria-describedby={`${id}-language-message`}
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
        </Field>
        {words.language.note !== null && (
          <div className="space-y-1">
            <Note>{words.language.note}</Note>
            <LinkButton
              label={about.learnMore.issues}
              link="issues"
              open={(link) => {
                void openLink(link).then((opened) => {
                  setNoteLinkFailed(!opened);
                });
              }}
              plain
            />
            {noteLinkFailed && <Note className="text-status-failed">{about.openFailed}</Note>}
          </div>
        )}
      </div>

      <Field
        announces
        description={words.theme.help}
        {...(themeFailed ? { error: words.theme.saveFailed } : {})}
        id={`${id}-theme`}
        label={words.theme.label}
      >
        <NativeSelect
          aria-describedby={`${id}-theme-message`}
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
      </Field>
    </div>
  );
}
