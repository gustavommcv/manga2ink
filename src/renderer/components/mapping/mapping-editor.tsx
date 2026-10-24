import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  GitMerge,
  Plus,
  Redo2,
  RotateCcw,
  Scissors,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import type { BookFormat } from '@/domain/conversion';
import type { BooksChoice as Books } from '@/domain/input-queue';
import { archivesReason } from '@/domain/process-mode';
import {
  createMappingHistory,
  dispatchMappingCommand,
  redoMappingCommand,
  type MappingCommand,
  type MappingEditorHistory,
  undoMappingCommand,
} from '@/domain/mapping-editor';
import { unrecognizedChaptersNote } from '@/domain/unrecognized-chapters';
import {
  assignedVolumeId,
  dominantLanguage,
  hasArchiveChapters,
  isVolumeNumber,
  type MappingDraft,
  MappingOperationError,
  MappingValidationError,
  mappingSignature,
  serializeMangabindMetadata,
  type VolumeSuggestion,
  validateMapping,
} from '@/domain/mapping';
import type { MappingMessages } from '@/i18n/mapping-messages';

import { BooksChoice } from './books-choice';
import { ChaptersFrom } from './chapters-from';
import { MappingSummary } from './mapping-summary';

import { Badge } from '@/renderer/components/shared/badge';
import { Callout } from '@/renderer/components/shared/callout';
import { CheckRow } from '@/renderer/components/shared/check-row';
import { Field } from '@/renderer/components/shared/field';
import { Eyebrow } from '@/renderer/components/shared/eyebrow';
import { InfoBanner } from '@/renderer/components/shared/info-banner';
import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { useMessages, useSay } from '@/renderer/hooks/use-messages';
import { SaidError } from '@/renderer/lib/said-error';
import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import type { MetadataProviderDescriptor, MetadataSearchResult } from '@/shared/workflow-contract';
import { Note } from '@/renderer/components/shared/note';

export interface MappingEditorProps {
  readonly initialDraft: MappingDraft;
  /** Set when `initialDraft` already carries mangabind's own grouping (volumes read from names). */
  readonly startedFrom?: 'mangabind' | undefined;
  /** How the books of the series are made; with `onBooks`, the editor offers the choice (ADR 0094). */
  readonly books?: Books;
  readonly onBooks?: (books: Books) => void;
  /** The format the books will be made in, so that what the one book is can be said. */
  readonly format?: BookFormat;
  /** Folders of the manga whose names could not be read as chapters: they are not in the draft. */
  readonly unrecognized?: readonly string[];
  /** The editor is of a title of a library, so a name is fixed by adding the library again. */
  readonly inLibrary?: boolean;
  readonly onConfirm?: (metadata: string, draft: MappingDraft) => void;
  /** Online sources that can suggest volumes. The "Online source" tab only appears when there is one. */
  readonly metadataProviders?: readonly MetadataProviderDescriptor[];
  /** The source chosen, if any. Left out, the editor keeps the choice itself. */
  readonly selectedProviderId?: string | undefined;
  readonly onSelectProvider?: (providerId: string | undefined) => void;
  readonly onOpenProviderHomepage?: (providerId: string) => void;
  readonly onSearchMetadata?: (
    providerId: string,
    title: string,
    signal: AbortSignal,
  ) => Promise<readonly MetadataSearchResult[]>;
  readonly onSuggestVolumes?: (
    providerId: string,
    workId: string,
    /** The language the folders declare, so the volumes are those of that translation. */
    language?: string,
  ) => Promise<{ readonly volumes: readonly VolumeSuggestion[] }>;
}

function nextVolumeNumber(draft: MappingDraft): string {
  const greatest = draft.volumes.reduce(
    (current, volume) => Math.max(current, Number(volume.number)),
    0,
  );
  return String(Math.floor(greatest) + 1);
}

function mappingOriginLabel(
  draft: MappingDraft,
  initialDraft: MappingDraft,
  startedFrom: MappingEditorProps['startedFrom'],
  providers: readonly MetadataProviderDescriptor[],
  words: MappingMessages['editor']['origin'],
): string {
  if (draft.source !== undefined) {
    // The mapping records the source's id; the person is told its name.
    const named = providers.find((provider) => provider.id === draft.source?.provider);
    return words.suggestedBy(named?.displayName ?? draft.source.provider);
  }
  // Only claim mangabind's grouping while the draft still says exactly what mangabind proposed.
  if (startedFrom === 'mangabind' && mappingSignature(draft) === mappingSignature(initialDraft)) {
    return words.groupedByMangabind;
  }
  return words.manual;
}

function volumeName(
  draft: MappingDraft,
  volumeId: string | undefined,
  words: MappingMessages['editor']['chapters'],
): string {
  if (volumeId === undefined) return words.unassigned;
  const volume = draft.volumes.find((candidate) => candidate.id === volumeId);
  return volume === undefined ? words.unassigned : words.volume(volume.number);
}

export function MappingEditor({
  initialDraft,
  startedFrom,
  books = 'volumes',
  format,
  onBooks,
  unrecognized = [],
  inLibrary = false,
  onConfirm,
  metadataProviders = [],
  onOpenProviderHomepage,
  onSelectProvider,
  onSearchMetadata,
  onSuggestVolumes,
  selectedProviderId,
}: MappingEditorProps): React.JSX.Element {
  const { say } = useSay();
  const messages = useMessages();
  const words = messages.mapping.editor;
  const leftOut = unrecognizedChaptersNote(unrecognized, inLibrary ? 'library' : 'folder');
  const [history, setHistory] = useState<MappingEditorHistory>(() =>
    createMappingHistory(initialDraft),
  );
  const [selectedChapterIds, setSelectedChapterIds] = useState<ReadonlySet<string>>(new Set());
  const [newVolumeNumber, setNewVolumeNumber] = useState(() => nextVolumeNumber(initialDraft));
  const [targetVolumeId, setTargetVolumeId] = useState(initialDraft.volumes[0]?.id ?? '');
  const [rangeStart, setRangeStart] = useState(initialDraft.chapters[0]?.id ?? '');
  const [rangeEnd, setRangeEnd] = useState(initialDraft.chapters.at(-1)?.id ?? '');
  const [operationMessage, setOperationMessage] = useState<string>();
  const [editorExpanded, setEditorExpanded] = useState(false);
  // The chapter chosen to split each volume before, by volume id. A stale choice (the volume
  // changed since) falls back to the first chapter that can still be split before.
  const [splitBeforeByVolume, setSplitBeforeByVolume] = useState<Readonly<Record<string, string>>>(
    {},
  );
  // The source is chosen by the caller when it keeps the choice across titles, or here when not.
  const [localProviderId, setLocalProviderId] = useState<string | undefined>(
    initialDraft.source?.provider,
  );
  const generatedId = useRef(0);
  const draft = history.present;
  const effectiveTargetVolumeId = draft.volumes.some((volume) => volume.id === targetVolumeId)
    ? targetVolumeId
    : (draft.volumes[0]?.id ?? '');
  const issues = useMemo(() => validateMapping(draft), [draft]);
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  // A series that is one book needs no volumes, and a folder left as it is has none to make.
  const series = books === 'series';
  const asIs = books === 'as-is';
  // An incomplete or conflicting proposal must never hide the controls needed to fix it; a series that is
  // one book has no volumes to be incomplete, and the chapters in none are what it is made of.
  const noVolumesNeeded = series && draft.volumes.length === 0;
  const showEditor =
    !asIs &&
    (editorExpanded ||
      (!noVolumesNeeded && issues.length > 0) ||
      (draft.volumes.length === 0 && !series));

  const createVolumeId = (): string => {
    let id: string;
    do {
      generatedId.current += 1;
      id = `volume-created-${String(generatedId.current)}`;
    } while (draft.volumes.some((volume) => volume.id === id));
    return id;
  };

  const dispatch = (command: MappingCommand): boolean => {
    // Once editing starts, completing the last missing assignment must not close the controls.
    setEditorExpanded(true);
    try {
      const next = dispatchMappingCommand(history, command);
      setHistory(next);
      setOperationMessage(undefined);
      return true;
    } catch (error) {
      setOperationMessage(
        error instanceof MappingOperationError ? say(error.said) : words.editFailed,
      );
      return false;
    }
  };

  const addNewVolume = (): void => {
    const id = createVolumeId();
    if (dispatch({ type: 'add-volume', id, number: newVolumeNumber })) {
      const number = String(Math.floor(Number(newVolumeNumber)) + 1);
      setNewVolumeNumber(number);
      setTargetVolumeId(id);
    }
  };

  const toggleChapter = (chapterId: string, checked: boolean): void => {
    setSelectedChapterIds((current) => {
      const next = new Set(current);
      if (checked) next.add(chapterId);
      else next.delete(chapterId);
      return next;
    });
  };

  const assignSelected = (): void => {
    if (
      dispatch({
        type: 'assign-chapters',
        volumeId: effectiveTargetVolumeId,
        chapterIds: [...selectedChapterIds],
      })
    ) {
      setSelectedChapterIds(new Set());
    }
  };

  const unassignSelected = (): void => {
    if (dispatch({ type: 'unassign-chapters', chapterIds: [...selectedChapterIds] })) {
      setSelectedChapterIds(new Set());
    }
  };

  const confirm = (): void => {
    try {
      onConfirm?.(serializeMangabindMetadata(draft), draft);
      setOperationMessage(words.confirmed);
    } catch (error) {
      setOperationMessage(
        error instanceof MappingValidationError
          ? say(error.said)
          : error instanceof SaidError
            ? say(error.said)
            : words.saveFailed,
      );
    }
  };

  return (
    <Screen labelledBy="mapping-title">
      <ScreenHeader
        actions={
          <>
            <div className="flex items-center gap-2">
              {showEditor && issues.length === 0 && draft.volumes.length > 0 && (
                <Button
                  onClick={() => {
                    setEditorExpanded(false);
                  }}
                  size="sm"
                  variant="outline"
                >
                  {words.showSummary}
                </Button>
              )}
              <div
                className="flex items-center gap-1"
                aria-label={words.history.label}
                role="group"
              >
                <Button
                  aria-label={words.history.undo}
                  disabled={history.past.length === 0}
                  onClick={() => {
                    setHistory(undoMappingCommand(history));
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Undo2 />
                </Button>
                <Button
                  aria-label={words.history.redo}
                  disabled={history.future.length === 0}
                  onClick={() => {
                    setHistory(redoMappingCommand(history));
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Redo2 />
                </Button>
                <Button
                  aria-label={words.history.reset}
                  disabled={history.past.length === 0}
                  onClick={() => {
                    setHistory(createMappingHistory(initialDraft));
                    setSelectedChapterIds(new Set());
                    setOperationMessage(undefined);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <RotateCcw />
                </Button>
              </div>
            </div>
          </>
        }
        description={
          asIs || (noVolumesNeeded && !showEditor)
            ? undefined
            : showEditor
              ? words.introEditing
              : words.introReviewing
        }
        eyebrow={
          <>
            <Eyebrow>{words.kicker}</Eyebrow>
            <Badge>
              {mappingOriginLabel(
                draft,
                initialDraft,
                startedFrom,
                metadataProviders,
                words.origin,
              )}
            </Badge>
          </>
        }
        id="mapping-title"
        title={words.title(draft.mangaTitle)}
      />
      {leftOut !== undefined && <InfoBanner message={say(leftOut)} title={words.leftOut} />}
      {onBooks !== undefined && (
        <BooksChoice
          asIsReason={hasArchiveChapters(initialDraft) ? say(archivesReason) : undefined}
          format={format}
          onChange={onBooks}
          value={books}
        />
      )}
      {inLibrary && series && (
        <InfoBanner message={words.books.inLibrary.text} title={words.books.inLibrary.title} />
      )}

      {!asIs && !(noVolumesNeeded && !editorExpanded) && (
        <ChaptersFrom
          initialSource={
            initialDraft.source !== undefined &&
            metadataProviders.some((provider) => provider.id === initialDraft.source?.provider) &&
            onSearchMetadata !== undefined &&
            onSuggestVolumes !== undefined
              ? 'online'
              : startedFrom === 'mangabind'
                ? 'names'
                : 'manual'
          }
          missingNamesGrouping={
            initialDraft.source === undefined && initialDraft.volumes.length === 0
          }
          onManualSelect={() => {
            setEditorExpanded(true);
          }}
          names={{
            volumes: startedFrom === 'mangabind' ? initialDraft.volumes.length : 0,
            chapters: initialDraft.chapters.length,
            changed: history.past.length > 0 && initialDraft.source === undefined,
            onStartOver: () => {
              setHistory(createMappingHistory(initialDraft));
              setSelectedChapterIds(new Set());
              setOperationMessage(undefined);
            },
          }}
          online={
            metadataProviders.length > 0 &&
            onSearchMetadata !== undefined &&
            onSuggestVolumes !== undefined
              ? {
                  providers: metadataProviders,
                  selectedId: onSelectProvider === undefined ? localProviderId : selectedProviderId,
                  onSelect: onSelectProvider ?? setLocalProviderId,
                  onOpenHomepage: onOpenProviderHomepage ?? (() => undefined),
                  mangaTitle: draft.mangaTitle,
                  language: dominantLanguage(draft.chapters),
                  onSearch: onSearchMetadata,
                  onSuggest: onSuggestVolumes,
                  onApply: (result, volumes) => {
                    if (
                      dispatch({
                        type: 'apply-suggestion',
                        suggestions: volumes.map((volume) => ({ ...volume, id: createVolumeId() })),
                        source: { provider: result.provider, id: result.id },
                      })
                    ) {
                      // A complete online suggestion can be reviewed as a summary; incomplete
                      // suggestions still expose the editor through validation issues.
                      setEditorExpanded(false);
                    }
                  },
                }
              : undefined
          }
        />
      )}

      {showEditor && draft.volumes.length === 0 && !series && (
        <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">{words.start.text}</p>
          <Button aria-label={words.start.createFirst} onClick={addNewVolume} size="sm">
            <Plus /> {words.start.createVolume(newVolumeNumber)}
          </Button>
        </div>
      )}

      {operationMessage !== undefined && (
        <Callout icon={AlertTriangle} role="status" tone="neutral">
          {operationMessage}
        </Callout>
      )}

      {!showEditor && !asIs && draft.volumes.length > 0 && (
        <MappingSummary
          draft={draft}
          onConfirm={confirm}
          onEdit={() => {
            setEditorExpanded(true);
          }}
        />
      )}

      {!showEditor && series && draft.volumes.length === 0 && (
        <div className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5">
          <p className="text-muted-foreground max-w-prose text-sm">{words.books.noVolumes.text}</p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setEditorExpanded(true);
              }}
              variant="outline"
            >
              {words.books.noVolumes.group}
            </Button>
            <Button onClick={confirm}>{words.books.noVolumes.done}</Button>
          </div>
        </div>
      )}

      {showEditor && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
          <section
            aria-labelledby="chapters-title"
            className="border-border bg-surface overflow-hidden rounded-xl border"
          >
            <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <h2 id="chapters-title" className="text-sm font-semibold">
                  {words.chapters.title}
                </h2>
                <Note className="mt-1">
                  {words.chapters.selected(selectedChapterIds.size, draft.chapters.length)}
                </Note>
              </div>
              <Button
                onClick={() => {
                  setSelectedChapterIds(
                    selectedChapterIds.size === draft.chapters.length
                      ? new Set()
                      : new Set(draft.chapters.map((chapter) => chapter.id)),
                  );
                }}
                flush="end"
                size="sm"
                variant="ghost"
              >
                {selectedChapterIds.size === draft.chapters.length
                  ? words.chapters.clearAll
                  : words.chapters.selectAll}
              </Button>
            </div>
            <div>
              {draft.chapters.map((chapter) => {
                const volumeId = assignedVolumeId(draft, chapter.id);
                return (
                  <div
                    className="border-border hover:bg-muted/50 flex items-center gap-3 border-b px-5 py-3 last:border-b-0"
                    data-slot="chapter-row"
                    key={chapter.id}
                  >
                    <div className="min-w-0 flex-1">
                      <CheckRow
                        aria-label={words.chapters.select(chapter.name)}
                        checked={selectedChapterIds.has(chapter.id)}
                        id={`chapter-${chapter.id}`}
                        note={
                          <Label
                            className="text-muted-foreground block text-xs font-normal"
                            htmlFor={`chapter-${chapter.id}`}
                          >
                            {words.chapters.pages(chapter.pageCount)}
                          </Label>
                        }
                        onChange={(checked) => {
                          toggleChapter(chapter.id, checked);
                        }}
                        title={chapter.name}
                      />
                    </div>
                    <span
                      className={
                        volumeId === undefined
                          ? 'text-status-warning text-xs'
                          : 'text-muted-foreground text-xs'
                      }
                    >
                      {volumeName(draft, volumeId, words.chapters)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-border bg-muted/30 space-y-4 border-t p-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <Field id="target-volume" label={words.chapters.moveTo}>
                  <NativeSelect
                    disabled={draft.volumes.length === 0}
                    id="target-volume"
                    onChange={(event) => {
                      setTargetVolumeId(event.target.value);
                    }}
                    value={effectiveTargetVolumeId}
                  >
                    {draft.volumes.length === 0 && (
                      <option value="">{words.chapters.createFirst}</option>
                    )}
                    {draft.volumes.map((volume) => (
                      <option key={volume.id} value={volume.id}>
                        {words.chapters.volume(volume.number)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Button
                  disabled={selectedChapterIds.size === 0 || effectiveTargetVolumeId === ''}
                  onClick={assignSelected}
                >
                  <ArrowDownToLine />
                  {words.chapters.assignSelected}
                </Button>
                <Button
                  disabled={selectedChapterIds.size === 0}
                  onClick={unassignSelected}
                  variant="outline"
                >
                  {words.chapters.unassign}
                </Button>
              </div>

              <fieldset className="border-border grid gap-3 rounded-lg border p-4 sm:grid-cols-2 sm:items-end md:grid-cols-[1fr_1fr_1fr_auto]">
                <legend className="text-muted-foreground px-1 text-xs font-medium">
                  {words.chapters.range.legend}
                </legend>
                <Note className="sm:col-span-2 md:col-span-4">{words.chapters.range.note}</Note>
                <Field id="range-start" label={words.chapters.range.from}>
                  <NativeSelect
                    id="range-start"
                    onChange={(event) => {
                      setRangeStart(event.target.value);
                    }}
                    value={rangeStart}
                  >
                    {draft.chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field id="range-end" label={words.chapters.range.through}>
                  <NativeSelect
                    id="range-end"
                    onChange={(event) => {
                      setRangeEnd(event.target.value);
                    }}
                    value={rangeEnd}
                  >
                    {draft.chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field id="range-volume" label={words.chapters.range.volume}>
                  <NativeSelect
                    disabled={draft.volumes.length === 0}
                    id="range-volume"
                    onChange={(event) => {
                      setTargetVolumeId(event.target.value);
                    }}
                    value={effectiveTargetVolumeId}
                  >
                    {draft.volumes.length === 0 && (
                      <option value="">{words.chapters.createFirst}</option>
                    )}
                    {draft.volumes.map((volume) => (
                      <option key={volume.id} value={volume.id}>
                        {words.chapters.volume(volume.number)}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Button
                  disabled={rangeStart === '' || rangeEnd === '' || effectiveTargetVolumeId === ''}
                  onClick={() => {
                    dispatch({
                      type: 'assign-range',
                      volumeId: effectiveTargetVolumeId,
                      firstChapterId: rangeStart,
                      lastChapterId: rangeEnd,
                    });
                  }}
                  variant="outline"
                >
                  {words.chapters.range.assign}
                </Button>
              </fieldset>
            </div>
          </section>

          <div className="space-y-6">
            <section
              aria-labelledby="volumes-title"
              className="border-border bg-surface rounded-xl border p-5"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 id="volumes-title" className="text-sm font-semibold">
                    {words.volumes.title}
                  </h2>
                  <Note className="mt-1">{words.volumes.created(draft.volumes.length)}</Note>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Label
                      className="text-muted-foreground text-xs font-normal"
                      htmlFor="new-volume-number"
                    >
                      {words.volumes.newNumber}
                    </Label>
                    <Input
                      aria-describedby="new-volume-help"
                      className="w-20"
                      id="new-volume-number"
                      inputMode="decimal"
                      onChange={(event) => {
                        setNewVolumeNumber(event.target.value);
                      }}
                      value={newVolumeNumber}
                    />
                  </div>
                  <Button aria-label={words.volumes.addLabel} onClick={addNewVolume}>
                    <Plus /> {words.volumes.add}
                  </Button>
                </div>
              </div>
              <Note className="mt-3" id="new-volume-help">
                {words.volumes.help}
              </Note>

              {draft.volumes.length === 0 ? (
                <div className="border-border text-muted-foreground mt-5 rounded-lg border border-dashed px-4 py-8 text-center text-sm">
                  {words.volumes.none}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {draft.volumes.map((volume, index) => {
                    const splitOptions = volume.chapterIds.slice(1);
                    const storedSplitBefore = splitBeforeByVolume[volume.id];
                    const splitBefore =
                      storedSplitBefore !== undefined && splitOptions.includes(storedSplitBefore)
                        ? storedSplitBefore
                        : splitOptions[0];
                    return (
                      <article
                        className="border-border bg-background rounded-lg border p-4"
                        key={volume.id}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1 space-y-2">
                            <Label htmlFor={`volume-number-${volume.id}`}>
                              {words.volumes.number}
                            </Label>
                            <Input
                              aria-label={words.volumes.numberFor(volume.number)}
                              defaultValue={volume.number}
                              id={`volume-number-${volume.id}`}
                              inputMode="decimal"
                              key={`${volume.id}-${volume.number}`}
                              onBlur={(event) => {
                                // A comma is how a decimal is written in many languages.
                                const typed = event.target.value
                                  .trim()
                                  .replace(/^(\d+),(\d+)$/u, '$1.$2');
                                if (typed !== volume.number) {
                                  dispatch({
                                    type: 'renumber-volume',
                                    volumeId: volume.id,
                                    number: typed,
                                  });
                                }
                                // A number that was refused leaves the volume as it was, and the
                                // field must not go on showing one the volume does not have.
                                if (!isVolumeNumber(typed)) event.target.value = volume.number;
                              }}
                            />
                          </div>
                          <Button
                            aria-label={words.volumes.remove(volume.number)}
                            onClick={() => {
                              dispatch({ type: 'remove-volume', volumeId: volume.id });
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                        <Note className="mt-3">
                          {words.volumes.chapterCount(volume.chapterIds.length)}
                        </Note>
                        {volume.chapterIds.length > 1 && (
                          <div className="mt-3 space-y-2">
                            <Label htmlFor={`split-${volume.id}`}>
                              {words.volumes.splitBefore}
                            </Label>
                            <div className="flex gap-2">
                              <NativeSelect
                                id={`split-${volume.id}`}
                                onChange={(event) => {
                                  setSplitBeforeByVolume((current) => ({
                                    ...current,
                                    [volume.id]: event.target.value,
                                  }));
                                }}
                                value={splitBefore}
                              >
                                {splitOptions.map((chapterId) => (
                                  <option key={chapterId} value={chapterId}>
                                    {
                                      draft.chapters.find((chapter) => chapter.id === chapterId)
                                        ?.name
                                    }
                                  </option>
                                ))}
                              </NativeSelect>
                              <Button
                                aria-label={words.volumes.splitLabel(volume.number)}
                                onClick={() => {
                                  if (splitBefore === undefined) return;
                                  const splitNumber = nextVolumeNumber(draft);
                                  const split = dispatch({
                                    type: 'split-volume',
                                    volumeId: volume.id,
                                    firstChapterId: splitBefore,
                                    newVolumeId: createVolumeId(),
                                    newVolumeNumber: splitNumber,
                                  });
                                  // The new volume took that number, so the next one is the one after.
                                  if (split) setNewVolumeNumber(String(Number(splitNumber) + 1));
                                }}
                                size="sm"
                                variant="outline"
                              >
                                <Scissors /> {words.volumes.split}
                              </Button>
                            </div>
                            <Note>{words.volumes.splitHelp}</Note>
                          </div>
                        )}
                        {index > 0 && (
                          <Button
                            className="mt-3 w-full"
                            onClick={() => {
                              dispatch({
                                type: 'merge-volumes',
                                targetVolumeId: draft.volumes[index - 1]!.id,
                                sourceVolumeId: volume.id,
                              });
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            <GitMerge />
                            {words.volumes.mergeInto(draft.volumes[index - 1]!.number)}
                          </Button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section
              aria-labelledby="validation-title"
              className="border-border bg-surface rounded-xl border p-5"
            >
              <h2 id="validation-title" className="text-sm font-semibold">
                {words.check.title}
              </h2>
              {issues.length === 0 ? (
                <div className="text-status-complete mt-4 flex items-center gap-2 text-sm">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  {words.check.ready}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {errors.length > 0 && (
                    <div aria-label={words.check.errorsLabel} role="alert">
                      <p className="text-status-failed text-xs font-medium">
                        {words.check.fixFirst}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {errors.map((issue, index) => (
                          <li
                            className="text-muted-foreground text-sm leading-5"
                            key={`${issue.code}-${String(index)}`}
                          >
                            {say(issue.message)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {warnings.length > 0 && (
                    <div aria-label={words.check.warningsLabel} role="group">
                      <p className="text-status-warning text-xs font-medium">
                        {words.check.checkThese}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {warnings.map((issue, index) => (
                          <li
                            className="text-muted-foreground text-sm leading-5"
                            key={`${issue.code}-${String(index)}`}
                          >
                            {say(issue.message)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <Button
                className="mt-5 w-full"
                disabled={errors.length > 0 || (draft.volumes.length === 0 && !series)}
                onClick={confirm}
              >
                {words.check.confirm}
              </Button>
            </section>
          </div>
        </div>
      )}
    </Screen>
  );
}
