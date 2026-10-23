import type { BookWarning } from './conversion';
import { type AnyMessage, message, raw } from './message';
import { type KnownWarningCode, knownWarningCodes } from './messages/warnings';

/** One kind of warning as the results show it: what it is, what to do, and which books it is in. */
export interface WarningNotice {
  readonly code: string;
  readonly title: AnyMessage;
  readonly message: AnyMessage;
  /** Which books it is about; absent when the run made a single book. */
  readonly where?: AnyMessage;
}

interface BookWithWarnings {
  readonly name: string;
  readonly warnings?: readonly BookWarning[];
}

/**
 * Known CLI warnings get wording suited to the results screen, which the window writes in its own
 * language from the code. The tool's own sentences are written for a terminal (the one about small
 * pages names `--upscale`), so a known code gets words that name the option as the screen does; the
 * protocol asks consumers to branch on the code anyway.
 */
const knownCodes: ReadonlySet<string> = new Set(knownWarningCodes);

/**
 * What the app says for a code, or `undefined` for one it does not know. A code is known only if
 * the list has it: `constructor` and `toString` are not codes, and must not find the methods every
 * object has.
 */
function knownWarning(code: string): KnownWarningCode | undefined {
  return knownCodes.has(code) ? (code as KnownWarningCode) : undefined;
}

/**
 * The warnings of a run, one notice per kind in the order they first came, each saying which
 * books it is about. Twenty volumes with the same warning are one notice, not twenty.
 *
 * A code the app does not know is grouped with its sentence, so two different sentences under
 * one unknown code stay two notices.
 */
export function warningNotices(books: readonly BookWithWarnings[]): readonly WarningNotice[] {
  const groups = new Map<
    string,
    { readonly code: string; readonly message: string; names: string[] }
  >();
  for (const book of books) {
    for (const warning of book.warnings ?? []) {
      const key =
        knownWarning(warning.code) === undefined
          ? `${warning.code}\n${warning.message}`
          : warning.code;
      const group = groups.get(key) ?? { code: warning.code, message: warning.message, names: [] };
      if (!group.names.includes(book.name)) group.names.push(book.name);
      groups.set(key, group);
    }
  }
  return [...groups.values()].map(({ code, message: sentence, names }) => {
    const known = knownWarning(code);
    // For a code a later mangaprep adds: its own sentence, under a heading that says whose it is.
    const text =
      known === undefined
        ? { title: message('warning.unknownTitle', {}), message: raw(sentence) }
        : {
            title: message('warning.title', { code: known }),
            message: message('warning.advice', { code: known }),
          };
    const where = whichBooks(names, books.length);
    return { code, ...text, ...(where === undefined ? {} : { where }) };
  });
}

function whichBooks(names: readonly string[], total: number): AnyMessage | undefined {
  if (total === 1) return undefined;
  if (names.length === total) return message('warning.inAll', { count: total });
  const [first, second, ...rest] = names;
  if (second === undefined) return message('warning.inOne', { first: String(first) });
  if (rest.length === 0) return message('warning.inTwo', { first: String(first), second });
  return message('warning.inMore', { first: String(first), second, more: rest.length });
}
