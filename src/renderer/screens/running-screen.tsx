import { ChevronDown, LoaderCircle, Square } from 'lucide-react';
import { useId, useState } from 'react';

import type { ConversionProgress } from '@/domain/conversion';
import { Eyebrow } from '@/renderer/components/shared/eyebrow';
import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { Button } from '@/renderer/components/ui/button';
import { useMessages, useSay } from '@/renderer/hooks/use-messages';
import { isPageEvent, milestone } from '@/renderer/lib/announcements';

export interface RunPosition {
  readonly name: string;
  /** 1-based place of the item being processed among those a run will process. */
  readonly index: number;
  readonly total: number;
}

function percentageOf(
  completed: number | undefined,
  total: number | undefined,
): number | undefined {
  if (completed === undefined || total === undefined || total <= 0) return undefined;
  return completed >= total ? 100 : Math.min(99, Math.round((completed / total) * 100));
}

function ProgressMeter({
  label,
  percentage,
}: {
  readonly label: string;
  readonly percentage?: number;
}): React.JSX.Element {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percentage}
      role="progressbar"
    >
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-accent h-full rounded-full transition-[width]"
          style={{ width: `${String(percentage ?? 0)}%` }}
        />
      </div>
    </div>
  );
}

export function RunningScreen({
  onCancel,
  position,
  progress,
}: {
  readonly onCancel: () => void;
  readonly position?: RunPosition;
  readonly progress?: ConversionProgress;
}): React.JSX.Element {
  const words = useMessages().running;
  const { say } = useSay();
  const reportedPercentage = percentageOf(progress?.completed, progress?.total);
  const percentage =
    progress?.stage === 'binding' &&
    progress.bindingState !== 'completed' &&
    reportedPercentage !== undefined
      ? Math.min(99, reportedPercentage)
      : reportedPercentage;
  const pageEvent = isPageEvent(progress, percentage);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  return (
    <Screen
      className="flex min-h-96 flex-col justify-center space-y-0"
      labelledBy="running-title"
      width="status"
    >
      <LoaderCircle aria-hidden="true" className="text-accent size-7 animate-spin" />
      <div className="mt-6">
        <ScreenHeader
          eyebrow={
            <Eyebrow>
              {position === undefined
                ? words.stage[progress?.stage ?? 'none']
                : words.item(position.index, position.total)}
            </Eyebrow>
          }
          id="running-title"
          title={(progress?.stage === 'binding' ? words.heading.binding : words.heading.converting)(
            position?.name ?? words.heading.yourBooks,
          )}
        />
      </div>
      {/* A stage or a volume is told as it is; a page is shown and not told (see isPageEvent). */}
      <p aria-live="polite" className="text-muted-foreground mt-3 text-sm empty:hidden">
        {pageEvent || progress === undefined ? undefined : say(progress.message)}
      </p>
      <p className="text-muted-foreground mt-3 text-sm empty:hidden">
        {pageEvent && progress !== undefined ? say(progress.message) : undefined}
      </p>
      <p aria-live="polite" className="sr-only">
        {pageEvent && percentage !== undefined
          ? words.percentComplete(milestone(percentage))
          : undefined}
      </p>
      {percentage !== undefined && (
        <div className="mt-5">
          <ProgressMeter label={words.percentComplete(percentage)} percentage={percentage} />
          {progress?.stage === 'binding' &&
            progress.completed !== undefined &&
            progress.total !== undefined && (
              <p className="text-muted-foreground mt-2 text-xs">
                {words.pagesCopied(progress.completed, progress.total)}
              </p>
            )}
        </div>
      )}
      {progress?.volumes !== undefined && progress.volumes.length > 1 && (
        <>
          <Button
            aria-controls={detailsOpen ? detailsId : undefined}
            aria-expanded={detailsOpen}
            className="mt-3 self-start"
            flush="start"
            onClick={() => {
              setDetailsOpen((open) => !open);
            }}
            size="sm"
            variant="ghost"
          >
            <ChevronDown
              aria-hidden="true"
              className={detailsOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
            {detailsOpen ? words.details.hide : words.details.show}
          </Button>
          {detailsOpen && (
            <div
              aria-label={words.details.region}
              className="border-border bg-surface mt-2 space-y-3 rounded-xl border p-4"
              id={detailsId}
              role="region"
            >
              {progress.volumes.map((volume) => {
                const reported = percentageOf(volume.completed, volume.total);
                const volumePercentage =
                  volume.status === 'done'
                    ? 100
                    : reported === undefined
                      ? undefined
                      : Math.min(99, reported);
                return (
                  <div className="space-y-1.5" key={volume.number}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium">{words.details.volume(volume.number)}</span>
                      <span className="text-muted-foreground">
                        {words.details.status[volume.status]}
                        {volumePercentage === undefined ? '' : ` · ${String(volumePercentage)}%`}
                      </span>
                    </div>
                    <ProgressMeter
                      label={words.details.volumeProgress(volume.number)}
                      percentage={volumePercentage}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      <Button className="mt-8 self-start" onClick={onCancel} variant="outline">
        <Square /> {words.cancel}
      </Button>
    </Screen>
  );
}
