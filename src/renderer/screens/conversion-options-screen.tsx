import type { BookFormat } from '@/domain/conversion';
import type { MangaprepSettings } from '@/domain/output-profile';
import { isDefaultMangaprep } from '@/domain/preferences';
import { ItemsWithOptionsNotice } from '@/renderer/components/settings/items-with-options-notice';
import { MangaprepSettingsEditor } from '@/renderer/components/settings/mangaprep-settings';
import { ResetOptions } from '@/renderer/components/settings/reset-options';
import { Eyebrow } from '@/renderer/components/shared/eyebrow';
import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { useMessages } from '@/renderer/hooks/use-messages';
import type { DeviceProfileSummary } from '@/shared/workflow-contract';

export interface ConversionOptionsScreenProps {
  readonly format: BookFormat;
  /** How many inputs and titles are converted with options of their own (ADR 0046). */
  readonly itemsWithOptions: number;
  readonly onBack: () => void;
  /** Puts every item back to the queue's options; the workflow owns the queue. */
  readonly onClearItemOptions: () => void;
  readonly onFormat: (format: BookFormat) => void;
  readonly onNotify: (message: string) => void;
  /** The workflow owns resetting and persisting the choices; this screen asks for confirmation. */
  readonly onReset: () => void;
  readonly onSettings: (settings: MangaprepSettings) => void;
  readonly profiles: readonly DeviceProfileSummary[];
  readonly settings: MangaprepSettings;
}

/** Conversion choices stay in the workflow; page composition and entry focus belong here. */
export function ConversionOptionsScreen({
  format,
  itemsWithOptions,
  onBack,
  onClearItemOptions,
  onFormat,
  onNotify,
  onReset,
  onSettings,
  profiles,
  settings,
}: ConversionOptionsScreenProps): React.JSX.Element {
  const words = useMessages().options;
  return (
    <Screen labelledBy="options-title">
      <ScreenHeader
        actions={
          <div className="w-72 shrink-0">
            <ResetOptions
              changed={!isDefaultMangaprep(format, settings)}
              onReset={onReset}
              scope="options"
            />
          </div>
        }
        back={{ label: words.back, onBack }}
        description={words.page.description}
        eyebrow={<Eyebrow>{words.advanced}</Eyebrow>}
        id="options-title"
        title={words.page.title}
      />
      <ItemsWithOptionsNotice count={itemsWithOptions} onClear={onClearItemOptions} />
      <MangaprepSettingsEditor
        format={format}
        onFormat={onFormat}
        onNotify={onNotify}
        onSettings={onSettings}
        profiles={profiles}
        settings={settings}
      />
    </Screen>
  );
}
