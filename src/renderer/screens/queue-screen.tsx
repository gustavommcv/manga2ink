import {
  CheckCircle2,
  ChevronRight,
  FilePlus2,
  FolderPlus,
  LoaderCircle,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { type QueueRow, summarizeQueue } from '@/domain/input-queue';
import type { BookFormat } from '@/domain/conversion';
import { defaultMangapressSettings, type MangapressSettings } from '@/domain/output-profile';
import { defaultFormat, isDefaultMangapress } from '@/domain/preferences';
import { defaultProcessMode, type ProcessMode, singleBookLockReason } from '@/domain/process-mode';
import { DropTarget } from '@/renderer/components/queue/drop-target';
import { QueueRowItem } from '@/renderer/components/queue/queue-row';
import { ProcessSteps } from '@/renderer/components/settings/process-steps';
import { ResetOptions } from '@/renderer/components/settings/reset-options';
import { SettingFieldHeader } from '@/renderer/components/settings/setting-field-header';
import { Button } from '@/renderer/components/ui/button';
import { useFocusOnOpen } from '@/renderer/hooks/use-focus-on-open';
import { useLanguage, useMessages, useSay } from '@/renderer/hooks/use-messages';
import { Checkbox } from '@/renderer/components/ui/checkbox';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { SegmentedControl } from '@/renderer/components/ui/segmented-control';
import type {
  DeviceProfileSummary,
  PlanSummary,
  PendingRunSummary,
  RejectedInput,
} from '@/shared/workflow-contract';

export interface RowPlan {
  readonly name: string;
  readonly plan: PlanSummary;
}

export interface QueueScreenProps {
  /** True until the bundled tools are verified: nothing can be added or run before that. */
  readonly disabled: boolean;
  readonly format: BookFormat;
  readonly pendingRuns?: readonly PendingRunSummary[];
  readonly mode: ProcessMode;
  readonly onAddFiles: () => void;
  readonly onAddFolders: () => void;
  readonly onOpenPending?: (libraryId: string) => void;
  readonly onDeletePending?: (libraryId: string) => Promise<boolean>;
  readonly onClear: () => void;
  readonly onConvert: () => void;
  readonly onDeviceProfile: (code: string) => void;
  readonly onDismissRejected: () => void;
  readonly onDropFiles: (files: readonly File[]) => void;
  readonly onEdit: (id: string) => void;
  readonly onEditDetails: (id: string) => void;
  /** Opens the conversion options one item has of its own. */
  readonly onEditOptions: (id: string) => void;
  readonly onFormat: (format: BookFormat) => void;
  readonly onMode: (mode: ProcessMode) => void;
  readonly onOpenOptions: () => void;
  readonly onRemove: (id: string) => void;
  /** Puts the steps, device, format and every mangapress option back to their defaults. */
  readonly onReset: () => void;
  readonly onSingleBook: (singleBook: boolean) => void;
  readonly onValidate: () => void;
  readonly plans?: readonly RowPlan[];
  readonly profiles: readonly DeviceProfileSummary[];
  /** Items the last add could not use, with the reason for each. */
  readonly rejected: readonly RejectedInput[];
  readonly rows: readonly QueueRow[];
  readonly settings: MangapressSettings;
  readonly singleBook: boolean;
  readonly validating: boolean;
}

const formatOptions = [
  { value: 'cbz', label: 'CBZ' },
  { value: 'epub', label: 'EPUB' },
  { value: 'pdf', label: 'PDF' },
] as const;

/** A queue of one kind only limits the steps to what that kind allows; a mixed one does not. */
function stepsInput(rows: readonly QueueRow[]): 'folder' | 'cbz' | 'library' {
  const kind = rows[0]?.kind;
  return kind !== undefined && rows.every((row) => row.kind === kind) && kind !== 'folder'
    ? kind
    : 'folder';
}

export function QueueScreen(props: QueueScreenProps): React.JSX.Element {
  const {
    disabled,
    format,
    pendingRuns,
    mode,
    onAddFiles,
    onAddFolders,
    onOpenPending,
    onDeletePending,
    onClear,
    onConvert,
    onDeviceProfile,
    onDismissRejected,
    onDropFiles,
    onEdit,
    onEditDetails,
    onEditOptions,
    onFormat,
    onMode,
    onOpenOptions,
    onRemove,
    onReset,
    onSingleBook,
    onValidate,
    plans,
    profiles,
    rejected,
    rows,
    settings,
    singleBook,
    validating,
  } = props;
  const words = useMessages().queue;
  const { say } = useSay();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  const summary = summarizeQueue(rows, mode);
  const mangapressRuns = mode !== 'bind-only';
  const canRun = !disabled && summary.inspecting === 0 && summary.runnable > 0;
  const hint =
    summary.inspecting > 0
      ? words.run.reading(summary.inspecting)
      : summary.total === 0
        ? undefined
        : summary.runnable === 0
          ? words.run.nothingRuns
          : summary.skipped > 0
            ? words.run.leftOut(summary.skipped)
            : undefined;
  const onlyCbz = rows.length > 0 && rows.every((row) => row.kind === 'cbz');
  const singleBookActive = singleBook && !onlyCbz;

  return (
    <section
      aria-labelledby="queue-title"
      className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
    >
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-md text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            id="queue-title"
            ref={titleRef}
            tabIndex={-1}
          >
            {words.title}
          </h1>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
            {String(rows.length)}
          </span>
          <span className="flex-1" />
          <Button disabled={disabled} onClick={onAddFiles} size="sm" variant="outline">
            <FilePlus2 /> {words.files}
          </Button>
          <Button disabled={disabled} onClick={onAddFolders} size="sm" variant="outline">
            <FolderPlus /> {words.folder}
          </Button>
          {rows.length > 0 && (
            <Button onClick={onClear} size="sm" variant="ghost">
              {words.clear}
            </Button>
          )}
        </div>

        <DropTarget
          disabled={disabled}
          empty={rows.length === 0}
          onAddFiles={onAddFiles}
          onAddFolders={onAddFolders}
          onDropFiles={onDropFiles}
        >
          {rows.length > 0 && (
            <ul aria-label={words.items} className="space-y-0.5">
              {rows.map((row) => (
                <QueueRowItem
                  key={row.id}
                  mode={mode}
                  onEdit={() => {
                    onEdit(row.id);
                  }}
                  onEditDetails={() => {
                    onEditDetails(row.id);
                  }}
                  onEditOptions={() => {
                    onEditOptions(row.id);
                  }}
                  onRemove={() => {
                    onRemove(row.id);
                  }}
                  row={row}
                />
              ))}
            </ul>
          )}
        </DropTarget>

        {rejected.length > 0 && (
          <div
            className="border-status-warning/40 bg-status-warning/10 flex items-start gap-3 rounded-lg border px-4 py-3"
            role="status"
          >
            <ul className="min-w-0 flex-1 space-y-1 text-xs">
              {rejected.map((item, index) => (
                <li key={`${item.name ?? ''}-${String(index)}`}>
                  {item.name !== undefined && (
                    <>
                      <span className="font-medium">{item.name}</span>{' '}
                      {words.rejected.wasNotAdded}{' '}
                    </>
                  )}
                  {say(item.reason)}
                </li>
              ))}
            </ul>
            <Button
              aria-label={words.rejected.dismiss}
              onClick={onDismissRejected}
              size="icon"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        )}

        {plans !== undefined && plans.length > 0 && <PlansPanel plans={plans} />}
        {pendingRuns !== undefined && pendingRuns.length > 0 && onOpenPending !== undefined && (
          <section
            aria-label={words.pending.earlierBooks}
            className="border-border bg-surface rounded-xl border p-4"
          >
            <h2 className="text-sm font-medium">{words.pending.readyBooks}</h2>
            <ul className="mt-2 space-y-1">
              {pendingRuns.map((run) => {
                return (
                  <PendingRunItem
                    key={run.libraryId}
                    onDelete={
                      onDeletePending === undefined
                        ? undefined
                        : async (id) => {
                            const deleted = await onDeletePending(id);
                            if (deleted) titleRef.current?.focus();
                            return deleted;
                          }
                    }
                    onOpen={onOpenPending}
                    run={run}
                  />
                );
              })}
            </ul>
          </section>
        )}
      </div>

      <aside
        aria-label={words.panel.label}
        className="border-border bg-surface h-fit space-y-5 rounded-xl border p-5"
      >
        <ProcessSteps
          disabled={disabled}
          input={stepsInput(rows)}
          mode={mode}
          onMode={onMode}
          singleBook={singleBookActive}
        />

        <div className="flex items-start gap-3">
          <Checkbox
            aria-describedby="combine-into-one-volume-message"
            checked={singleBook}
            className="mt-0.5"
            disabled={disabled || (onlyCbz && !singleBook)}
            id="combine-into-one-volume"
            onCheckedChange={(value) => {
              onSingleBook(value === true);
            }}
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <SettingFieldHeader
              changed={singleBook}
              disabled={disabled || (onlyCbz && !singleBook)}
              id="combine-into-one-volume"
              label={words.panel.singleBook.label}
              onReset={() => {
                onSingleBook(false);
              }}
            />
            <p
              className="text-muted-foreground text-xs leading-relaxed"
              id="combine-into-one-volume-message"
            >
              {onlyCbz
                ? singleBook
                  ? words.panel.singleBook.saved
                  : words.panel.singleBook.unavailable
                : words.panel.singleBook.produces}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <SettingFieldHeader
            changed={settings.deviceProfile !== defaultMangapressSettings.deviceProfile}
            disabled={!mangapressRuns || profiles.length === 0}
            id="queue-device"
            label={words.panel.device}
            onReset={() => {
              onDeviceProfile(defaultMangapressSettings.deviceProfile);
            }}
          />
          <NativeSelect
            disabled={!mangapressRuns || profiles.length === 0}
            id="queue-device"
            onChange={(event) => {
              onDeviceProfile(event.target.value);
            }}
            value={settings.deviceProfile}
          >
            {profiles.map((profile) => (
              <option key={profile.code} value={profile.code}>
                {profile.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <SettingFieldHeader
            changed={format !== defaultFormat}
            disabled={!mangapressRuns || singleBookActive}
            label={words.panel.format}
            onReset={() => {
              if (!singleBookActive) {
                onFormat(defaultFormat);
              }
            }}
          />
          <SegmentedControl
            disabled={!mangapressRuns || singleBookActive}
            label={words.panel.format}
            onChange={onFormat}
            options={formatOptions}
            value={format}
          />
          {singleBookActive && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              {say(singleBookLockReason)}
            </p>
          )}
        </div>

        {mangapressRuns && (
          <button
            className="border-border hover:text-foreground focus-visible:ring-ring text-muted-foreground flex w-full items-center justify-between border-t py-2.5 text-sm outline-none focus-visible:ring-2"
            onClick={onOpenOptions}
            type="button"
          >
            {words.panel.advanced}
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        )}

        <div className="border-border border-t pt-3">
          <ResetOptions
            changed={
              mode !== defaultProcessMode || singleBook || !isDefaultMangapress(format, settings)
            }
            onReset={onReset}
            scope="queue"
          />
        </div>

        <div className="space-y-2">
          <Button className="w-full" disabled={!canRun} onClick={onConvert} size="lg">
            {words.run.process(summary.runnable)}
          </Button>
          <Button
            className="w-full"
            disabled={!canRun || validating}
            onClick={onValidate}
            variant="ghost"
          >
            {validating ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            {validating ? words.run.validating : words.run.validate}
          </Button>
          {hint !== undefined && (
            <p aria-live="polite" className="text-muted-foreground text-xs">
              {hint}
            </p>
          )}
        </div>
      </aside>
    </section>
  );
}

function PendingRunItem({
  onDelete,
  onOpen,
  run,
}: {
  readonly onDelete?: (libraryId: string) => Promise<boolean>;
  readonly onOpen: (libraryId: string) => void;
  readonly run: PendingRunSummary;
}): React.JSX.Element {
  const words = useMessages().queue.pending;
  const language = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTrigger = useRef<HTMLButtonElement>(null);
  const question = useFocusOnOpen<HTMLDivElement>(confirming && onDelete !== undefined);
  const firstBook = run.artifacts[0]?.name ?? words.earlierConversion;
  const remaining = run.artifacts.length - 1;
  const description = remaining > 0 ? words.andMore(firstBook, remaining) : firstBook;
  const close = (): void => {
    setConfirming(false);
    deleteTrigger.current?.focus();
  };

  return (
    <li className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate" title={description}>
            {description}
          </p>
          <p className="text-muted-foreground text-xs">
            {new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(
              run.createdAt,
            )}
          </p>
        </div>
        <Button
          aria-label={words.viewBooksFrom(firstBook)}
          onClick={() => {
            onOpen(run.libraryId);
          }}
          size="sm"
          variant="outline"
        >
          {words.viewBooks}
        </Button>
        {onDelete !== undefined && (
          <Button
            aria-label={words.deleteFrom(firstBook)}
            aria-expanded={confirming}
            className="hover:text-destructive"
            onClick={() => {
              setConfirming(true);
            }}
            ref={deleteTrigger}
            size="sm"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" /> {words.delete}
          </Button>
        )}
      </div>
      {confirming && onDelete !== undefined && (
        <div
          aria-label={words.confirmDeletion(firstBook)}
          className="border-border bg-background focus-visible:ring-ring focus-visible:ring-offset-background space-y-2 rounded-lg border p-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !deleting) close();
          }}
          ref={question}
          role="group"
          tabIndex={-1}
        >
          <p className="text-muted-foreground text-xs leading-relaxed">
            {words.question(run.artifacts.length)}
          </p>
          <div className="flex gap-2">
            <Button
              disabled={deleting}
              onClick={() => {
                setDeleting(true);
                void onDelete(run.libraryId)
                  .then((deleted) => {
                    if (deleted) setConfirming(false);
                  })
                  .finally(() => {
                    setDeleting(false);
                  });
              }}
              size="sm"
              variant="destructive"
            >
              {deleting ? words.deleting : words.deleteBooks}
            </Button>
            <Button disabled={deleting} onClick={close} size="sm" variant="outline">
              {words.cancel}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function PlansPanel({ plans }: { readonly plans: readonly RowPlan[] }): React.JSX.Element {
  const words = useMessages().queue.plans;
  const { say } = useSay();
  return (
    <section
      aria-labelledby="plans-title"
      className="border-accent/30 bg-accent/5 space-y-4 rounded-xl border p-5"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 aria-hidden="true" className="text-accent size-5" />
        <h2 className="font-semibold" id="plans-title">
          {words.validated}
        </h2>
      </div>
      <p className="text-muted-foreground text-xs">{words.nothingWritten}</p>
      {plans.map(({ name, plan }) => (
        <div key={name}>
          <h3 className="text-sm font-medium">{name}</h3>
          <p className="text-muted-foreground mt-1 text-xs">{say(plan.message)}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {plan.books.map((book) => (
              <li className="flex justify-between gap-4" key={book.name}>
                <span className="truncate">
                  {book.wholeSeries === true ? words.oneBookFor(book.name) : book.name}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {words.pages(book.pageCount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
