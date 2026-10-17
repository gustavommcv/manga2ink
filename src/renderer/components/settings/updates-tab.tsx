import { Download } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { dayOf } from '@/i18n/day';
import { InfoBanner } from '@/renderer/components/shared/info-banner';
import { Button } from '@/renderer/components/ui/button';
import { Checkbox } from '@/renderer/components/ui/checkbox';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { type UpdateCheckOutcome, useAppInfo } from '@/renderer/hooks/use-app-info';
import { useLanguage, useMessages, useSay } from '@/renderer/hooks/use-messages';

/** Where the check is: not asked yet, being asked, or what it came to. */
type Check =
  | { readonly phase: 'idle' }
  | { readonly phase: 'checking' }
  | { readonly phase: 'done'; readonly outcome: UpdateCheckOutcome };

/**
 * What a person can do about keeping the app up to date (ADR 0062). The check is a button: it asks
 * GitHub which versions exist when it is clicked, says whether a newer one is out, and, when one
 * is, opens the page where it is downloaded, in the browser of the system. The app does not
 * install it: nothing is looked for by itself, and the choices that would belong to that (checking
 * at launch, which versions to look for) are drawn and cannot be changed yet, so the tab says where
 * the rest will be (ADR 0055).
 */
export function UpdatesTab(): React.JSX.Element {
  const { updates: words } = useMessages();
  const language = useLanguage();
  const { say } = useSay();
  const { checkForUpdates, openLink, version } = useAppInfo();
  const id = useId();
  const [check, setCheck] = useState<Check>({ phase: 'idle' });
  const [openFailed, setOpenFailed] = useState(false);
  // An answer that arrives after the tab was put away has nowhere to be shown.
  const present = useRef(true);
  useEffect(() => {
    present.current = true;
    return () => {
      present.current = false;
    };
  }, []);

  const lookForUpdates = (): void => {
    setCheck({ phase: 'checking' });
    setOpenFailed(false);
    void checkForUpdates().then((outcome) => {
      if (present.current) setCheck({ phase: 'done', outcome });
    });
  };
  const download = (): void => {
    void openLink('releases').then((opened) => {
      if (present.current) setOpenFailed(!opened);
    });
  };

  const checking = check.phase === 'checking';
  return (
    <div className="space-y-6">
      <InfoBanner message={words.notice.text} title={words.notice.title} />

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground text-xs">{words.installed}</dt>
        <dd>{version}</dd>
      </dl>

      <div className="space-y-5">
        <div className="space-y-3">
          <Button
            aria-busy={checking}
            disabled={checking}
            onClick={lookForUpdates}
            variant="outline"
          >
            {checking ? words.checking : words.check}
          </Button>

          <div aria-live="polite" className="space-y-3 text-sm empty:hidden">
            {check.phase === 'done' && 'failed' in check.outcome && (
              <p className="text-status-failed">{say(check.outcome.failed)}</p>
            )}
            {check.phase === 'done' &&
              'found' in check.outcome &&
              (check.outcome.found.status === 'current' ? (
                <p>{words.upToDate(check.outcome.found.version)}</p>
              ) : (
                <>
                  <p>
                    {words.available(
                      check.outcome.found.version,
                      dayOf(language, check.outcome.found.publishedAt),
                    )}
                  </p>
                  <Button onClick={download}>
                    <Download aria-hidden="true" />
                    {words.download}
                  </Button>
                </>
              ))}
            {openFailed && <p className="text-status-failed text-xs">{words.openFailed}</p>}
          </div>
        </div>

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
          {/* Every release so far is a pre-release, so that is what the check looks for. */}
          <NativeSelect disabled id={`${id}-channel`} value="prerelease">
            <option value="stable">{words.channel.stable}</option>
            <option value="prerelease">{words.channel.prerelease}</option>
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
