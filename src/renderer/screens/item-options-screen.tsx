import { RotateCcw } from 'lucide-react';

import type { BookFormat } from '@/domain/conversion';
import type { RunOptions } from '@/domain/item-options';
import type { MangapressSettings } from '@/domain/output-profile';
import { MangapressSettingsEditor } from '@/renderer/components/settings/mangapress-settings';
import { Eyebrow } from '@/renderer/components/shared/eyebrow';
import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { Button } from '@/renderer/components/ui/button';
import { useMessages } from '@/renderer/hooks/use-messages';
import type { DeviceProfileSummary } from '@/shared/workflow-contract';
import { Note } from '@/renderer/components/shared/note';

export interface ItemOptionsScreenProps {
  /** Where Back leads: the queue, or the library the title is in. */
  readonly backLabel: string;
  /** The format this item is converted with: the queue's, with what the item set over it. */
  readonly format: BookFormat;
  /** Whether the item has any option of its own. */
  readonly hasOwnOptions: boolean;
  /** The folder, CBZ or manga the options are for. */
  readonly name: string;
  readonly onBack: () => void;
  /** Every change made here, as the options the item is then converted with. */
  readonly onChange: (options: RunOptions) => void;
  readonly onNotify: (message: string) => void;
  /** Drops everything the item set, so it follows the queue's options again. */
  readonly onUseQueueOptions: () => void;
  readonly profiles: readonly DeviceProfileSummary[];
  /** The options of the queue: what a field is compared with here, and what its reset puts back. */
  readonly queue: RunOptions;
  /** The options this item is converted with: the queue's, with what the item set over them. */
  readonly settings: MangapressSettings;
  readonly singleBook: boolean;
}

/**
 * The conversion options of one item. They are the options of the queue until a choice is made
 * here, and a choice only counts for this item (ADR 0046). The choices are the queue's own
 * options page, so nothing is learned twice.
 */
export function ItemOptionsScreen({
  backLabel,
  format,
  hasOwnOptions,
  name,
  onBack,
  onChange,
  onNotify,
  onUseQueueOptions,
  profiles,
  queue,
  settings,
  singleBook,
}: ItemOptionsScreenProps): React.JSX.Element {
  const words = useMessages().options.item;
  return (
    <Screen labelledBy="item-options-title">
      <ScreenHeader
        actions={
          <div className="w-72 shrink-0">
            <Button
              aria-disabled={!hasOwnOptions}
              flush="start"
              onClick={() => {
                if (hasOwnOptions) onUseQueueOptions();
              }}
              size="sm"
              variant="ghost"
            >
              <RotateCcw /> {words.useQueue}
            </Button>
            <Note aria-live="polite" className="mt-1">
              {hasOwnOptions ? words.hasOwn : words.followsQueue}
            </Note>
          </div>
        }
        back={{ label: backLabel, onBack }}
        description={words.description}
        eyebrow={<Eyebrow>{words.kicker}</Eyebrow>}
        id="item-options-title"
        title={words.title(name)}
      />
      <MangapressSettingsEditor
        format={format}
        onFormat={(next) => {
          onChange({ settings, format: next });
        }}
        onNotify={onNotify}
        onSettings={(next) => {
          onChange({ settings: next, format });
        }}
        profiles={profiles}
        queue={queue}
        settings={settings}
        singleBook={singleBook}
      />
    </Screen>
  );
}
