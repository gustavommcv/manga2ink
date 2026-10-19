import { Search } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  type BookDetails,
  canonicalLanguageTag,
  isLanguageTag,
  clipTitle,
  maxDetailLength,
  maxLanguageLength,
  maxTitleBytes,
  normalizeBookDetails,
  titleFits,
  volumeBookTitle,
} from '@/domain/book-details';
import type { BookFormat } from '@/domain/conversion';
import { AuthorLookupPanel, type AuthorLookup } from '@/renderer/components/details/author-lookup';
import { type BookCoverControls, BookCovers } from '@/renderer/components/details/book-covers';
import { Eyebrow } from '@/renderer/components/shared/eyebrow';
import { Field } from '@/renderer/components/shared/field';
import { Note } from '@/renderer/components/shared/note';
import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { useMessages } from '@/renderer/hooks/use-messages';

export interface BookDetailsScreenProps {
  /** Where Back goes: the queue, or the library the title belongs to. */
  readonly backLabel: string;
  /** The language books are made in unless their own details name another. */
  readonly defaultLanguage: string;
  /** The title the tools use when none is typed: the item's own name. */
  readonly defaultTitle: string;
  /** The language the folder names declare, when they declare one. */
  readonly declaredLanguage?: string;
  readonly details: BookDetails;
  readonly format: BookFormat;
  /** What the details are for: the item's name in the queue. */
  readonly name: string;
  readonly onBack: () => void;
  readonly onChange: (details: BookDetails) => void;
  /** Where to look up who wrote it. Absent when there is no source to ask. */
  readonly lookup?: AuthorLookup;
  /**
   * The covers of the item's books and what can be done with them. Absent when mangapress does
   * not make the books, since a cover is its to make.
   */
  readonly covers?: BookCoverControls;
  /**
   * The volumes of the series this makes, one book each; empty while none are set yet. Absent
   * when it makes a single book.
   */
  readonly volumes?: readonly number[];
}

/** How many of a series' book titles the preview lists before it says there are more. */
const previewedVolumes = 3;

/**
 * The title, author and language of one item in the queue (ADR 0030). Each field is optional and
 * takes effect as it is typed: what is left empty uses its default. The text is kept here as it is
 * typed and only its cleaned-up form goes up, so a space between two words survives being typed.
 */
export function BookDetailsScreen({
  backLabel,
  covers,
  declaredLanguage,
  defaultLanguage,
  defaultTitle,
  details,
  format,
  name,
  lookup,
  onBack,
  onChange,
  volumes,
}: BookDetailsScreenProps): React.JSX.Element {
  const words = useMessages().details;
  const authorRef = useRef<HTMLInputElement>(null);
  const languageRef = useRef<HTMLInputElement>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [titleCutShort, setTitleCutShort] = useState(false);
  const [text, setText] = useState({
    title: details.title ?? '',
    author: details.author ?? '',
    language: details.language ?? '',
  });
  const languageText = text.language.trim();
  const languageError =
    languageText === '' || isLanguageTag(languageText) ? undefined : words.language.invalid;

  const update = (field: keyof typeof text, value: string): void => {
    const next = { ...text, [field]: value };
    setText(next);
    const nextLanguage = next.language.trim();
    onChange(
      normalizeBookDetails({
        title: next.title,
        author: next.author,
        // A language that is not a tag would be refused when the run starts, so it is not kept.
        ...(nextLanguage === '' || isLanguageTag(nextLanguage)
          ? { language: nextLanguage }
          : details.language === undefined
            ? {}
            : { language: details.language }),
      }),
    );
  };

  const series = volumes !== undefined;
  // Whatever was just typed was cut, or there is no room left for one more plain letter.
  const titleIsFull = titleCutShort || !titleFits(`${text.title}x`);
  const title = text.title.trim() === '' ? defaultTitle : text.title.trim();
  const titles = series
    ? [...volumes].slice(0, previewedVolumes).map((volume) => volumeBookTitle(title, volume))
    : [title];
  const moreVolumes = series ? Math.max(0, volumes.length - previewedVolumes) : 0;
  const effectiveLanguage = languageText === '' ? defaultLanguage : languageText;
  const declaredElsewhere =
    declaredLanguage !== undefined &&
    declaredLanguage.toLowerCase() !== effectiveLanguage.toLowerCase();
  // Only an EPUB carries a language, and a language that is not a tag would be refused at the run.
  const languageToOffer =
    declaredElsewhere && format === 'epub' && isLanguageTag(declaredLanguage)
      ? canonicalLanguageTag(declaredLanguage)
      : undefined;
  // The field stays editable for every format: the language is kept with the folder (ADR 0032) for
  // the next time it is made as an EPUB, so only what the hint says depends on the format.
  const languageDescription = declaredElsewhere
    ? format === 'epub'
      ? words.language.foldersSay(declaredLanguage)
      : words.language.foldersSayButOnlyEpub(declaredLanguage)
    : format === 'epub'
      ? words.language.forEpub
      : words.language.onlyEpub;

  return (
    <Screen labelledBy="book-details-title" width="form">
      <ScreenHeader
        back={{ label: backLabel, onBack }}
        description={words.intro}
        eyebrow={<Eyebrow>{words.kicker}</Eyebrow>}
        id="book-details-title"
        title={name}
      />

      <div className="border-border bg-surface space-y-5 rounded-xl border p-6">
        <Field
          description={
            titleIsFull
              ? words.titleField.full
              : series
                ? words.titleField.forSeries
                : words.titleField.forBook
          }
          id="details-title"
          label={series ? words.titleField.series : words.titleField.book}
        >
          <Input
            aria-describedby="details-title-message"
            id="details-title"
            maxLength={maxTitleBytes}
            onChange={(event) => {
              // A book's file is named after its title, and a file name holds a limited number of
              // bytes, which is fewer Japanese characters than English ones.
              const clipped = clipTitle(event.target.value);
              setTitleCutShort(clipped !== event.target.value);
              update('title', clipped);
            }}
            placeholder={defaultTitle}
            value={text.title}
          />
        </Field>

        <div className="space-y-2">
          <Field
            {...(format === 'cbz' ? { description: words.author.cbzNote } : {})}
            id="details-author"
            label={words.author.label}
          >
            <div className="flex gap-2">
              <Input
                aria-describedby="details-author-message"
                className="min-w-0 flex-1"
                id="details-author"
                maxLength={maxDetailLength}
                onChange={(event) => {
                  update('author', event.target.value);
                }}
                placeholder={words.author.placeholder}
                ref={authorRef}
                value={text.author}
              />
              {lookup !== undefined && lookup.providers.length > 0 && (
                <Button
                  aria-controls="author-lookup"
                  aria-expanded={lookupOpen}
                  onClick={() => {
                    setLookupOpen(!lookupOpen);
                  }}
                  variant="outline"
                >
                  <Search aria-hidden="true" /> {words.author.find}
                </Button>
              )}
            </div>
          </Field>
          {lookupOpen && lookup !== undefined && (
            <AuthorLookupPanel
              id="author-lookup"
              lookup={lookup}
              onUse={(authors) => {
                update('author', authors);
                setLookupOpen(false);
                authorRef.current?.focus();
              }}
              title={title}
            />
          )}
        </div>

        <Field
          {...(languageError === undefined
            ? { description: languageDescription }
            : { error: languageError })}
          id="details-language"
          label={words.language.label}
        >
          <div className="flex gap-2">
            <Input
              aria-describedby="details-language-message"
              aria-invalid={languageError === undefined ? undefined : true}
              className="min-w-0 flex-1"
              id="details-language"
              maxLength={maxLanguageLength}
              onChange={(event) => {
                update('language', event.target.value);
              }}
              placeholder={defaultLanguage}
              ref={languageRef}
              value={text.language}
            />
            {languageToOffer !== undefined && (
              <Button
                onClick={() => {
                  update('language', languageToOffer);
                  // The offer goes away once it is taken, so focus stays on the field.
                  languageRef.current?.focus();
                }}
                variant="outline"
              >
                {words.language.use(languageToOffer)}
              </Button>
            )}
          </div>
        </Field>
      </div>

      <Note as="div">
        <p className="font-medium">{series ? words.titled.series : words.titled.book}</p>
        {series && volumes.length === 0 ? (
          <p className="mt-1">{words.titled.onceSet}</p>
        ) : (
          <ul aria-label={words.titled.list} className="mt-1 space-y-0.5">
            {titles.map((bookTitle) => (
              <li className="break-all" key={bookTitle}>
                {bookTitle}
              </li>
            ))}
            {moreVolumes > 0 && <li>{words.titled.more(moreVolumes)}</li>}
          </ul>
        )}
      </Note>

      {covers !== undefined && (
        <BookCovers
          {...covers}
          books={
            series
              ? volumes.map((volume) => ({ slot: volume, title: volumeBookTitle(title, volume) }))
              : [{ slot: 'book', title }]
          }
          {...(format === 'pdf' ? { unavailable: words.covers.pdf } : {})}
        />
      )}
    </Screen>
  );
}
