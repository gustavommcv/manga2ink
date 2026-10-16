import { useId, useState } from 'react';

import { isLanguagePreference, languagePreferences } from '@/domain/app-settings';
import { FieldMessage } from '@/renderer/components/shared/field-message';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { useAppSettings } from '@/renderer/hooks/use-app-settings';
import { useMessages } from '@/renderer/hooks/use-messages';
import { languageNames } from '@/renderer/i18n/messages';

/** What is decided about the app as a whole: today, the language. */
export function GeneralTab(): React.JSX.Element {
  const { appSettings: words } = useMessages();
  const { settings, setLanguage } = useAppSettings();
  const [failed, setFailed] = useState(false);
  const id = useId();

  return (
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
            setFailed(!kept);
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
          {...(failed ? { error: words.language.saveFailed } : {})}
        />
      </div>
    </div>
  );
}
