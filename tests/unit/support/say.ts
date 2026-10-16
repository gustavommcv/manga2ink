import type { AnyMessage } from '@/domain/message';
import { describeRow, type QueueRow, type RowTone, type RowView } from '@/domain/input-queue';
import type { ProcessMode } from '@/domain/process-mode';
import { messagesFor } from '@/i18n/messages';
import { say, sayAll } from '@/i18n/say';

const said = messagesFor('en').said;

/** A message as the English the app has always said. */
export const english = (message: AnyMessage): string => say(said, message);

/** Messages that follow one another as the sentences of one note, in English. */
export const englishAll = (messages: readonly AnyMessage[]): string => sayAll(said, messages);

/** What a row says, as the text the app has always shown (the note is absent when there is none). */
export interface RowText {
  readonly chip: string;
  readonly tone: RowTone;
  readonly detail: string;
  readonly runnable: boolean;
  readonly note?: string;
}

export function rowText(view: RowView): RowText {
  return {
    chip: english(view.chip),
    tone: view.tone,
    detail: english(view.detail),
    runnable: view.runnable,
    ...(view.notes.length === 0 ? {} : { note: englishAll(view.notes) }),
  };
}

/** `describeRow`, with what it says in English, so a test reads what a person would. */
export function describeRowText(row: QueueRow, mode: ProcessMode): RowText {
  return rowText(describeRow(row, mode));
}

const isMessage = (value: unknown): value is AnyMessage =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'values' in value &&
  typeof value.id === 'string';

/**
 * A result with every message in it said in English: a list of messages is the note they make
 * together, and a message alone is its sentence. It keeps a test about what a person reads (the
 * words the app has always used) independent of how the words are carried. The type is the result's
 * own, since only the messages change, into text.
 */
export function inEnglish<Result>(result: Result): Result {
  // What holds no message comes back as the very same object, so a test about what a report keeps
  // (the books, untouched and in order) still sees them as they were.
  const walk = (value: unknown): unknown => {
    if (isMessage(value)) return english(value);
    if (Array.isArray(value)) {
      if (value.length > 0 && value.every(isMessage)) return englishAll(value);
      const items = value.map((item: unknown) => walk(item));
      return items.every((item, index) => item === value[index]) ? value : items;
    }
    if (
      typeof value === 'object' &&
      value !== null &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      const entries = Object.entries(value).map(([key, inner]) => [key, walk(inner)] as const);
      return entries.every(([key, inner]) => inner === (value as Record<string, unknown>)[key])
        ? value
        : Object.fromEntries(entries);
    }
    return value;
  };
  return walk(result) as Result;
}
