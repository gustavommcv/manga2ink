import { useEffect, useState } from 'react';

import type { AnyMessage } from '@/domain/message';
import { sizeOf } from '@/i18n/size';
import { FieldMessage } from '@/renderer/components/shared/field-message';
import { Button } from '@/renderer/components/ui/button';
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
  const [status, setStatus] = useState<ProcessingFolderStatus>();
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
    </div>
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
