import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { BookFormat } from '@/domain/conversion';
import type { RunOptions } from '@/domain/item-options';
import type { MangapressSettings } from '@/domain/output-profile';
import { MangapressSettingsEditor } from '@/renderer/components/settings/mangapress-settings';
import { Button } from '@/renderer/components/ui/button';
import type { DeviceProfileSummary } from '@/shared/workflow-contract';

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
  settings,
  singleBook,
}: ItemOptionsScreenProps): React.JSX.Element {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="mx-auto max-w-5xl space-y-6" aria-labelledby="item-options-title">
      <Button onClick={onBack} variant="ghost">
        <ArrowLeft /> {backLabel}
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">Advanced · this item only</p>
          <h1
            className="focus-visible:ring-ring focus-visible:ring-offset-background mt-2 rounded-md text-3xl font-semibold tracking-tight break-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            id="item-options-title"
            ref={titleRef}
            tabIndex={-1}
          >
            Options for {name}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            What you change here is used for this item only. Everything else follows the conversion
            options of the queue, including what you change there later.
          </p>
        </div>
        <div className="w-72 shrink-0">
          <Button
            aria-disabled={!hasOwnOptions}
            className="aria-disabled:hover:text-muted-foreground -ml-3 aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
            onClick={() => {
              if (hasOwnOptions) onUseQueueOptions();
            }}
            size="sm"
            variant="ghost"
          >
            <RotateCcw /> Use the queue’s options
          </Button>
          <p aria-live="polite" className="text-subtle-foreground mt-1 text-xs">
            {hasOwnOptions
              ? 'This item has options of its own.'
              : 'This item uses the options of the queue.'}
          </p>
        </div>
      </div>
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
        settings={settings}
        singleBook={singleBook}
      />
    </section>
  );
}
