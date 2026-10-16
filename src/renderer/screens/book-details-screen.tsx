import { ChevronLeft, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
import { FieldMessage } from '@/renderer/components/shared/field-message';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const authorRef = useRef<HTMLInputElement>(null);
  const languageRef = useRef<HTMLInputElement>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [titleCutShort, setTitleCutShort] = useState(false);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
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

  return (
    <section aria-labelledby="book-details-title" className="mx-auto max-w-3xl space-y-5">
      <Button onClick={onBack} variant="ghost">
        <ChevronLeft /> {backLabel}
      </Button>
      <div>
        <p className="text-muted-foreground text-xs font-medium">{words.kicker}</p>
        <h1
          className="focus-visible:ring-ring focus-visible:ring-offset-background mt-1 rounded-md text-2xl font-semibold tracking-tight break-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          id="book-details-title"
          ref={titleRef}
          tabIndex={-1}
        >
          {name}
        </h1>
        <p className="text-subtle-foreground mt-1 text-sm">{words.intro}</p>
      </div>

      <div className="border-border bg-surface space-y-5 rounded-xl border p-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="details-title">
            {series ? words.titleField.series : words.titleField.book}
          </Label>
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
          <FieldMessage
            description={
              titleIsFull
                ? words.titleField.full
                : series
                  ? words.titleField.forSeries
                  : words.titleField.forBook
            }
            id="details-title-message"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="details-author">
            {words.author.label}
          </Label>
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
          <FieldMessage
            {...(format === 'cbz'
              ? {
                  description: words.author.cbzNote,
                }
              : {})}
            id="details-author-message"
          />
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

        <div className="space-y-2">
          <Label className="text-sm font-medium" htmlFor="details-language">
            {words.language.label}
          </Label>
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
          <FieldMessage
            {...(languageError === undefined
              ? {
                  description: declaredElsewhere
                    ? words.language.foldersSay(declaredLanguage)
                    : format === 'epub'
                      ? words.language.forEpub
                      : words.language.onlyEpub,
                }
              : { error: languageError })}
            id="details-language-message"
          />
        </div>
      </div>

      <div className="text-muted-foreground text-xs leading-relaxed">
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
      </div>

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
    </section>
  );
}
