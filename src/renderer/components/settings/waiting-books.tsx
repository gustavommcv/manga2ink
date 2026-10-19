import { useEffect, useId, useRef, useState } from 'react';

import type { AnyMessage } from '@/domain/message';
import { type IdleDays, idleDays, type WaitingBooks } from '@/domain/pending-cleanup';
import { sizeOf } from '@/i18n/size';
import { FieldMessage } from '@/renderer/components/shared/field-message';
import { Button } from '@/renderer/components/ui/button';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { useFocusOnOpen } from '@/renderer/hooks/use-focus-on-open';
import { useLanguage, useMessages, useSay } from '@/renderer/hooks/use-messages';
import { useProcessingFolder } from '@/renderer/hooks/use-processing-folder';
import { Note } from '@/renderer/components/shared/note';

/** Where the clean-up is: nothing asked, asking what would go, asking to confirm, or deleting. */
type Step =
  | { readonly kind: 'idle' }
  | { readonly kind: 'counting' }
  | { readonly kind: 'confirming'; readonly found: WaitingBooks; readonly days: IdleDays }
  | { readonly kind: 'deleting'; readonly found: WaitingBooks; readonly days: IdleDays };

/**
 * What waits to be saved, and a clean-up of what has waited long (ADR 0061). The window names a
 * number of days; the main process says what that would delete, the question is asked here with
 * the number, and only a yes deletes. Nothing here names a folder or a conversion.
 */
export function WaitingBooksSection({
  onChanged,
  waiting,
}: {
  readonly onChanged: () => void;
  readonly waiting: WaitingBooks;
}): React.JSX.Element {
  const words = useMessages().processing.waiting;
  const language = useLanguage();
  const api = useProcessingFolder();
  const { say } = useSay();
  const select = useId();
  const [days, setDays] = useState<IdleDays>(30);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  // What was found or done, said where a person who asked for it looks; or what went wrong.
  const [told, setTold] = useState<string>();
  const [failure, setFailure] = useState<AnyMessage>();
  const trigger = useRef<HTMLButtonElement>(null);
  // The button is disabled while the question is open, so it can take the focus back only once it is not.
  const returning = useRef(false);
  const question = useFocusOnOpen<HTMLDivElement>(
    step.kind === 'confirming' || step.kind === 'deleting',
  );
  const asking = step.kind === 'confirming' || step.kind === 'deleting';

  const look = (): void => {
    setTold(undefined);
    setFailure(undefined);
    setStep({ kind: 'counting' });
    void api.countIdle(days).then((answer) => {
      if (!answer.ok) {
        setFailure(answer.error.said);
        setStep({ kind: 'idle' });
      } else if (answer.value.runs === 0) {
        setTold(words.nothingIdle(days));
        setStep({ kind: 'idle' });
      } else setStep({ kind: 'confirming', found: answer.value, days });
    });
  };

  const close = (): void => {
    returning.current = true;
    setStep({ kind: 'idle' });
  };

  useEffect(() => {
    if (step.kind !== 'idle' || !returning.current) return;
    returning.current = false;
    trigger.current?.focus();
  }, [step]);

  const remove = (found: WaitingBooks, confirmed: IdleDays): void => {
    setStep({ kind: 'deleting', found, days: confirmed });
    void api.deleteIdle(confirmed).then((answer) => {
      setStep({ kind: 'idle' });
      if (!answer.ok) setFailure(answer.error.said);
      else if (answer.value.runs === 0) setTold(words.inUse);
      else setTold(words.deleted(answer.value.runs, sizeOf(language, answer.value.bytes)));
      // Something may have gone even when the answer is a failure.
      onChanged();
    });
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{words.title}</h3>
      <p className="text-xs">
        {waiting.runs === 0
          ? words.none
          : words.summary(waiting.books, waiting.runs, sizeOf(language, waiting.bytes))}
      </p>
      <Note>{words.help}</Note>

      {waiting.runs > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label htmlFor={select}>{words.cleanUp}</label>
          <div className="w-32">
            <NativeSelect
              disabled={step.kind !== 'idle'}
              id={select}
              onChange={(event) => {
                setDays(Number(event.target.value) as IdleDays);
              }}
              value={days}
            >
              {idleDays.map((option) => (
                <option key={option} value={option}>
                  {words.days(option)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button
            aria-expanded={asking}
            disabled={step.kind !== 'idle'}
            onClick={look}
            ref={trigger}
            variant="outline"
          >
            {words.delete}
          </Button>
        </div>
      )}

      {(step.kind === 'confirming' || step.kind === 'deleting') && (
        <div
          aria-label={words.question(
            step.found.runs,
            step.found.books,
            sizeOf(language, step.found.bytes),
            step.days,
          )}
          className="border-border bg-background focus-visible:ring-ring focus-visible:ring-offset-background space-y-2 rounded-lg border p-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && step.kind === 'confirming') close();
          }}
          ref={question}
          role="group"
          tabIndex={-1}
        >
          <p className="text-xs leading-relaxed">
            {words.question(
              step.found.runs,
              step.found.books,
              sizeOf(language, step.found.bytes),
              step.days,
            )}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={step.kind === 'deleting'}
              onClick={() => {
                remove(step.found, step.days);
              }}
              size="sm"
              variant="destructive"
            >
              {words.confirm}
            </Button>
            <Button disabled={step.kind === 'deleting'} onClick={close} size="sm" variant="outline">
              {words.cancel}
            </Button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {told !== undefined && <Note>{told}</Note>}
        {failure !== undefined && <FieldMessage error={say(failure)} />}
      </div>
    </section>
  );
}
