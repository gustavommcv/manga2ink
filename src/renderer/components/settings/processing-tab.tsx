import { useCallback, useEffect, useId, useState } from 'react';

import type { AppSettingsChange } from '@/domain/app-settings';
import type { AnyMessage } from '@/domain/message';
import { type ConversionCapacity, parallelChoiceNamed } from '@/domain/parallel-conversions';
import { longQueueMs } from '@/domain/queue-run';
import { sizeOf } from '@/i18n/size';
import { CheckRow } from '@/renderer/components/shared/check-row';
import { FieldMessage } from '@/renderer/components/shared/field-message';
import { WaitingBooksSection } from '@/renderer/components/settings/waiting-books';
import { Button } from '@/renderer/components/ui/button';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { useAppSettings } from '@/renderer/hooks/use-app-settings';
import { useLanguage, useMessages, useSay } from '@/renderer/hooks/use-messages';
import { useProcessingFolder } from '@/renderer/hooks/use-processing-folder';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

/**
 * Where the app works (ADR 0056): the folder it builds volumes in while it converts and keeps
 * finished books in until they are saved. The folder is chosen in a dialog the main process opens,
 * and nothing here ever sends a path; what is shown is what the main process says it is doing.
 */
export function ProcessingTab(): React.JSX.Element {
  const { processing: words } = useMessages();
  const language = useLanguage();
  const api = useProcessingFolder();
  const { say } = useSay();
  const { settings, change: keep } = useAppSettings();
  const parallelId = useId();
  const [choiceFailed, setChoiceFailed] = useState(false);
  const [status, setStatus] = useState<ProcessingFolderStatus>();
  // What this computer can do as to conversions at once; nothing until it is said (ADR 0068).
  const [capacity, setCapacity] = useState<ConversionCapacity>();
  // What the main process says went wrong, as it says it: the window writes it in its language.
  const [failure, setFailure] = useState<AnyMessage>();
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let reading = true;
    void api.get().then((answer) => {
      if (!reading) return;
      if (answer.ok) setStatus(answer.value);
      else setFailure(answer.error.said);
    });
    return () => {
      reading = false;
    };
  }, [api]);

  useEffect(() => {
    let reading = true;
    // A computer that cannot say offers no number to choose: the app's own count stays in force.
    void api.conversionCapacity().then((answer) => {
      if (reading && answer.ok) setCapacity(answer.value);
    });
    return () => {
      reading = false;
    };
  }, [api]);

  /** Reads what the main process says again, after something it did to the books that wait. */
  const reread = useCallback((): void => {
    void api.get().then((answer) => {
      if (answer.ok) setStatus(answer.value);
    });
  }, [api]);

  /** Asks the main process to change something, and shows what it did or why it did not. */
  const change = (ask: () => Promise<WorkflowResult<ProcessingFolderStatus | null>>): void => {
    setWorking(true);
    setFailure(undefined);
    void ask().then((answer) => {
      setWorking(false);
      if (!answer.ok) {
        setFailure(answer.error.said);
      } else if (answer.value !== null) setStatus(answer.value);
    });
  };

  /** Keeps a choice about a queue; it is for the next one, and what is running is not touched. */
  const choose = (choice: AppSettingsChange): void => {
    void keep(choice).then((kept) => {
      setChoiceFailed(!kept);
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs leading-relaxed">{words.description}</p>

      {status === undefined ? (
        failure === undefined && <p className="text-muted-foreground text-xs">{words.loading}</p>
      ) : (
        <>
          <dl className="border-border bg-background grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border p-3 text-xs">
            <Row label={words.folder}>{status.chosen ?? words.automatic}</Row>
            <Row label={words.scratch} path>
              {status.scratch}
            </Row>
            <Row label={words.pending} path>
              {status.pending}
            </Row>
            {status.freeBytes !== null && (
              <Row label={words.free}>{sizeOf(language, status.freeBytes)}</Row>
            )}
          </dl>

          {!status.available && (
            <p className="text-status-failed text-xs leading-relaxed" role="alert">
              {words.unavailable}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={working}
              onClick={() => {
                change(api.choose);
              }}
              variant="outline"
            >
              {words.choose}
            </Button>
            <Button
              disabled={working || status.chosen === null}
              onClick={() => {
                change(api.useDefault);
              }}
              variant="ghost"
            >
              {words.useDefault}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">{words.help}</p>

          <WaitingBooksSection onChanged={reread} waiting={status.waiting} />

          {status.earlier.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{words.earlier.title}</h3>
              <ul className="space-y-1 text-xs">
                {status.earlier.map((earlier) => (
                  <li className="flex items-baseline justify-between gap-3" key={earlier.folder}>
                    <span className="min-w-0 font-mono break-all">{earlier.folder}</span>
                    <span className="text-muted-foreground shrink-0">
                      {words.earlier.books(earlier.books)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs leading-relaxed">{words.earlier.help}</p>
            </section>
          )}
        </>
      )}

      <div aria-live="polite">{failure !== undefined && <FieldMessage error={say(failure)} />}</div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{words.queue.title}</h3>
        <QueueChoice
          checked={settings.notifyWhenDone}
          help={words.queue.notify.help(longQueueMs / 1000)}
          label={words.queue.notify.label}
          onChange={(notifyWhenDone) => {
            choose({ notifyWhenDone });
          }}
        />
        <QueueChoice
          checked={settings.keepAwake}
          help={words.queue.awake.help}
          label={words.queue.awake.label}
          onChange={(keepAwake) => {
            choose({ keepAwake });
          }}
        />
        {capacity !== undefined && (
          <div className="space-y-2">
            <label className="text-sm leading-none font-medium" htmlFor={parallelId}>
              {words.queue.parallel.label}
            </label>
            <NativeSelect
              aria-describedby={`${parallelId}-help`}
              id={parallelId}
              onChange={(event) => {
                const parallelConversions = parallelChoiceNamed(event.target.value);
                if (parallelConversions !== undefined) choose({ parallelConversions });
              }}
              // A number kept on a bigger computer is shown as what this one will do with it.
              value={
                settings.parallelConversions === 'automatic'
                  ? 'automatic'
                  : String(Math.min(settings.parallelConversions, capacity.most))
              }
            >
              <option value="automatic">
                {words.queue.parallel.automatic(capacity.automatic)}
              </option>
              {Array.from({ length: capacity.most }, (_unused, index) => index + 1).map((count) => (
                <option key={count} value={String(count)}>
                  {String(count)}
                </option>
              ))}
            </NativeSelect>
            <p className="text-muted-foreground text-xs" id={`${parallelId}-help`}>
              {words.queue.parallel.help}
            </p>
          </div>
        )}
        <div aria-live="polite">
          {choiceFailed && <FieldMessage error={words.queue.saveFailed} />}
        </div>
      </section>
    </div>
  );
}

/** A yes or no about what a queue does, with what it does said under its name. */
function QueueChoice({
  checked,
  help,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly help: string;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}): React.JSX.Element {
  const id = useId();
  return (
    <CheckRow
      checked={checked}
      describedBy={`${id}-help`}
      id={id}
      note={
        <p className="text-muted-foreground text-xs" id={`${id}-help`}>
          {help}
        </p>
      }
      onChange={onChange}
      title={label}
    />
  );
}

/** A line of what the app does now: what it is, and where or how much. */
function Row({
  children,
  label,
  path = false,
}: {
  readonly children: React.ReactNode;
  readonly label: string;
  /** A path is long and has no spaces to break at, so it is broken anywhere and set in a fixed-width face. */
  readonly path?: boolean;
}): React.JSX.Element {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={path ? 'min-w-0 font-mono break-all' : 'min-w-0 break-all'}>{children}</dd>
    </>
  );
}
