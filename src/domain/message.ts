import type { ModeMessageValues } from './messages/mode';
import type { QueueMessageValues } from './messages/queue';
import type { TextMessageValues } from './messages/text';

export type { NoValues } from './messages/values';

/**
 * Everything the app says that is not written by the window, each by its code and the values it is
 * about (ADR 0053). The domain, the workflows and the main process say it this way and write no
 * sentence of their own, so the window can write it in the language of the person: a part of the
 * app adds its codes in a module of `messages/`, and the catalogs of `src/i18n` must say each one in
 * every language, which the compiler checks.
 */
export interface MessageValues extends QueueMessageValues, ModeMessageValues, TextMessageValues {}

export type MessageId = keyof MessageValues;

/** One thing said: the code, and the values it is about. Plain data, so it can cross the bridge. */
export interface Message<Id extends MessageId = MessageId> {
  readonly id: Id;
  readonly values: MessageValues[Id];
}

/** Any message, as a union of every code with its own values. */
export type AnyMessage = { readonly [Id in MessageId]: Message<Id> }[MessageId];

export function message<Id extends MessageId>(id: Id, values: MessageValues[Id]): Message<Id> {
  return { id, values };
}

/** What someone else wrote, to be said as it is: a tool's report, an error of the system. */
export function raw(text: string): Message<'text.raw'> {
  return message('text.raw', { text });
}
