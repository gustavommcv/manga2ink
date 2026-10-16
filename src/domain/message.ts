import type { FailureMessageValues } from './messages/failure';
import type { CoversMessageValues } from './messages/covers';
import type { InputMessageValues } from './messages/input';
import type { LibraryMessageValues } from './messages/library';
import type { MappingMessageValues } from './messages/mapping';
import type { ModeMessageValues } from './messages/mode';
import type { NoticeMessageValues } from './messages/notice';
import type { OptionsMessageValues } from './messages/options';
import type { ProviderMessageValues } from './messages/provider';
import type { QueueMessageValues } from './messages/queue';
import type { RunMessageValues } from './messages/run';
import type { SaveMessageValues } from './messages/save';
import type { TextMessageValues } from './messages/text';
import type { WarningMessageValues } from './messages/warnings';
import type { WorkflowMessageValues } from './messages/workflow';

export type { NoValues } from './messages/values';

/**
 * Everything the app says that is not written by the window, each by its code and the values it is
 * about (ADR 0053). The domain, the workflows and the main process say it this way and write no
 * sentence of their own, so the window can write it in the language of the person: a part of the
 * app adds its codes in a module of `messages/`, and the catalogs of `src/i18n` must say each one in
 * every language, which the compiler checks.
 */
export interface MessageValues
  extends
    QueueMessageValues,
    ModeMessageValues,
    InputMessageValues,
    LibraryMessageValues,
    CoversMessageValues,
    MappingMessageValues,
    FailureMessageValues,
    NoticeMessageValues,
    OptionsMessageValues,
    WorkflowMessageValues,
    SaveMessageValues,
    ProviderMessageValues,
    RunMessageValues,
    WarningMessageValues,
    TextMessageValues {}

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
