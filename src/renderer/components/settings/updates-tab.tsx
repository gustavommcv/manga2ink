import { useId } from 'react';

import { InfoBanner } from '@/renderer/components/shared/info-banner';
import { Button } from '@/renderer/components/ui/button';
import { Checkbox } from '@/renderer/components/ui/checkbox';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { useAppInfo } from '@/renderer/hooks/use-app-info';
import { useMessages } from '@/renderer/hooks/use-messages';

/**
 * What a person decides about keeping the app up to date. The app cannot update itself yet, so the
 * choices are drawn and cannot be changed, with a notice that says so: a tab that is not there
 * would leave the others looking empty, and this one says where the feature will be.
 */
export function UpdatesTab(): React.JSX.Element {
  const { updates: words } = useMessages();
  const { version } = useAppInfo();
  const id = useId();

  return (
    <div className="space-y-6">
      <InfoBanner message={words.notice.text} title={words.notice.title} />

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground text-xs">{words.installed}</dt>
        <dd>{version}</dd>
      </dl>

      <div className="space-y-5">
        <Button disabled variant="outline">
          {words.check}
        </Button>

        <div className="flex items-start gap-3">
          <Checkbox aria-describedby={`${id}-automatic-help`} disabled id={`${id}-automatic`} />
          <div className="space-y-0.5">
            <label
              className="text-sm leading-none font-medium text-balance"
              htmlFor={`${id}-automatic`}
            >
              {words.automatic.label}
            </label>
            <p className="text-muted-foreground text-xs" id={`${id}-automatic-help`}>
              {words.automatic.help}
            </p>
          </div>
        </div>

        <div className="max-w-sm space-y-2">
          <label className="text-sm font-medium" htmlFor={`${id}-channel`}>
            {words.channel.label}
          </label>
          <NativeSelect disabled id={`${id}-channel`} value="stable">
            <option value="stable">{words.channel.stable}</option>
            <option value="prerelease">{words.channel.prerelease}</option>
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
