import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  canonicalLanguageTag,
  clipTitle,
  detailsForBook,
  hasControlCharacters,
  isLanguageTag,
  maxTitleBytes,
  normalizeBookDetails,
  titleFits,
  volumeBookTitle,
  volumeLabel,
} from '@/domain/book-details';
import { uniqueFileName } from '@/library/unique-name';

// What a person types or a folder is named: any text at all, so these are held to every string,
// lone surrogates and control characters included, not to the handful that were thought of.
const anyText = fc.string({ unit: 'binary', maxLength: 150 });
const readableText = fc.string({ unit: 'grapheme', maxLength: 150 });
const utf8Bytes = (text: string): number => new TextEncoder().encode(text).length;

describe('a title that has to be a file name', () => {
  it('is cut to what fits, from the front, and never more than it needs to be', () => {
    fc.assert(
      fc.property(fc.oneof(anyText, readableText), (title) => {
        const clipped = clipTitle(title);
        expect(titleFits(clipped)).toBe(true);
        expect(utf8Bytes(clipped)).toBeLessThanOrEqual(maxTitleBytes);
        expect(title.startsWith(clipped)).toBe(true);
        if (titleFits(title)) expect(clipped).toBe(title);
        // Cut as late as it can be: the next character would have been too much.
        if (clipped.length < title.length) {
          const next = String.fromCodePoint(title.codePointAt(clipped.length) ?? 0);
          expect(utf8Bytes(clipped + next)).toBeGreaterThan(maxTitleBytes);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('keeps well-formed text well-formed when it is cut', () => {
    fc.assert(
      fc.property(readableText, (title) => {
        // No half of a pair: a surrogate that is on its own was cut from its other half.
        expect(/[\uD800-\uDFFF]/u.test(clipTitle(title))).toBe(false);
      }),
    );
  });
});

describe('the details typed for a book', () => {
  const details = fc.record(
    {
      title: fc.oneof(anyText, readableText),
      author: fc.oneof(anyText, readableText),
      language: fc.oneof(
        fc.constantFrom('pt-br', 'EN-us', 'zh-hant-tw', 'en', 'es-419', ' fr '),
        readableText,
      ),
    },
    { requiredKeys: [] },
  );

  it('are the same when they are normalized again', () => {
    fc.assert(
      fc.property(details, (typed) => {
        const once = normalizeBookDetails(typed);
        expect(normalizeBookDetails(once)).toEqual(once);
      }),
      { numRuns: 300 },
    );
  });

  it('come out fit to be a file name and a command argument, with nothing blank in them', () => {
    fc.assert(
      fc.property(details, (typed) => {
        const kept = normalizeBookDetails(typed);
        for (const field of ['title', 'author', 'language'] as const) {
          const value = kept[field];
          if (value === undefined) continue;
          expect(value).toBe(value.trim());
          expect(value).not.toBe('');
          expect(hasControlCharacters(value)).toBe(false);
        }
        if (kept.title !== undefined) expect(titleFits(kept.title)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('give a volume a title that still fits the room it was left', () => {
    fc.assert(
      fc.property(readableText, fc.integer({ min: 0, max: 999 }), (title, volume) => {
        const book = detailsForBook({ title }, volume);
        if (book.title === undefined) return;
        // The limit leaves room for the volume's suffix and an extension in a 255-byte name.
        expect(utf8Bytes(`${book.title}.epub`)).toBeLessThanOrEqual(255);
      }),
    );
  });

  it('write a volume as two digits when it is whole, and as it is otherwise', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99999 }), (volume) => {
        expect(volumeLabel(volume)).toBe(String(volume).padStart(2, '0'));
        expect(volumeBookTitle('Series', volume)).toBe(`Series - Vol.${volumeLabel(volume)}`);
      }),
    );
    fc.assert(
      fc.property(fc.double({ min: 0.01, max: 999, noNaN: true }), (volume) => {
        fc.pre(!Number.isInteger(volume));
        expect(volumeLabel(volume)).toBe(String(volume));
      }),
    );
  });
});

describe('a language tag', () => {
  const tag = fc
    .array(fc.stringMatching(/^[a-zA-Z0-9]{2,8}$/u), { minLength: 1, maxLength: 4 })
    .map((parts) => parts.join('-'));

  it('is written the same way again, and still means what it meant', () => {
    fc.assert(
      fc.property(fc.oneof(tag, anyText), (value) => {
        const once = canonicalLanguageTag(value);
        expect(canonicalLanguageTag(once)).toBe(once);
        if (isLanguageTag(value)) {
          expect(isLanguageTag(once)).toBe(true);
          expect(once.toLowerCase()).toBe(value.toLowerCase());
        } else {
          expect(once).toBe(value);
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe('the name of a book that is already taken', () => {
  const stem = fc.string({ unit: 'grapheme', minLength: 1, maxLength: 30 });
  const extension = fc.constantFrom('.epub', '.kepub.epub', '.cbz', '.pdf', '.EPUB', '');
  const name = fc.tuple(stem, extension).map(([base, ending]) => `${base}${ending}`);

  it('gets a free one, and the same book asked for again always gets another', () => {
    fc.assert(
      fc.property(name, fc.integer({ min: 1, max: 8 }), (wanted, count) => {
        const taken = new Set<string>();
        const given: string[] = [];
        for (let copy = 0; copy < count; copy += 1) {
          const result = uniqueFileName(wanted, (candidate) => taken.has(candidate));
          expect(taken.has(result)).toBe(false);
          taken.add(result);
          given.push(result);
        }
        expect(new Set(given).size).toBe(count);
        // Nothing is invented for a name that was free.
        expect(given[0]).toBe(wanted);
        const lower = wanted.toLowerCase();
        const ending = lower.endsWith('.kepub.epub')
          ? '.kepub.epub'
          : lower.includes('.') && wanted.lastIndexOf('.') > 0
            ? wanted.slice(wanted.lastIndexOf('.')).toLowerCase()
            : '';
        for (const result of given) {
          expect(result.toLowerCase().endsWith(ending)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe('the file name of a title in a library', () => {
  it('lets two different series keep two different books', () => {
    fc.assert(
      fc.property(readableText, readableText, fc.integer({ min: 1, max: 99 }), (one, other, n) => {
        fc.pre(one !== other);
        expect(volumeBookTitle(one, n)).not.toBe(volumeBookTitle(other, n));
      }),
    );
  });
});
