import type { AnyMessage, MessageId, MessageValues } from '@/domain/message';

/**
 * What a language says for a set of codes: one function for each, from the values the code is about
 * to the sentence. A part of the app writes its own, for every language, and the compiler fails for
 * a code that has no sentence in one of them (ADR 0053).
 */
export type SaidFor<Values> = { readonly [Id in keyof Values]: (values: Values[Id]) => string };

/** Everything that is said by code, in one language. */
export type Said = SaidFor<MessageValues>;

/** Writes a message in the language of `said`. */
export function say(said: Said, message: AnyMessage): string {
  // The code picks the function whose values are the message's own; the type cannot follow the
  // pairing through the union, and `message()` is the only way to make one that does not match.
  const write = said[message.id as MessageId] as (values: unknown) => string;
  return write(message.values);
}

/** Writes several messages that follow one another as sentences of one note. */
export function sayAll(said: Said, messages: readonly AnyMessage[]): string {
  return messages.map((one) => say(said, one)).join(' ');
}

/** How many names are spelled out before "and N more". */
const namedInANote = 3;

/**
 * The names, as many as are spelled out, and what a language says of how many more there are (given
 * the number, since where it goes and how it is worded are the language's).
 */
export function namesOf(names: readonly string[], more: (count: number) => string): string {
  const shown = names.slice(0, namedInANote).join(', ');
  return names.length > namedInANote ? `${shown}${more(names.length - namedInANote)}` : shown;
}
