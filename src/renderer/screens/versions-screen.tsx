import { CheckCircle2, Files } from 'lucide-react';

import { decisionOf, type VersionCandidate, type VersionGroup } from '@/domain/chapter-versions';
import { Badge } from '@/renderer/components/shared/badge';
import { Eyebrow } from '@/renderer/components/shared/eyebrow';
import { Note } from '@/renderer/components/shared/note';
import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { Button } from '@/renderer/components/ui/button';
import { useMessages } from '@/renderer/hooks/use-messages';
import { cn } from '@/renderer/lib/utils';

export interface VersionsScreenProps {
  /** Where Back leads: the queue. */
  readonly backLabel: string;
  /** The folder the chapters are in. */
  readonly name: string;
  readonly groups: readonly VersionGroup[];
  /** The first page of each file by its id, as an image the window can show; absent until read, or never. */
  readonly previews: ReadonlyMap<string, string>;
  /** Chooses the files to use for a chapter: one, several or none; with no list, takes the choice back. */
  readonly onChoose: (token: string, use: readonly string[] | undefined) => void;
  readonly onBack: () => void;
}

/**
 * The choice among the files that claim one chapter (ADR 0093): the same chapter from two scan groups,
 * in two languages, or twice. Each file is shown by its name, its first page and how many pages it has,
 * and nothing is chosen for the person: not by size, not by pages.
 */
export function VersionsScreen({
  backLabel,
  groups,
  name,
  onBack,
  onChoose,
  previews,
}: VersionsScreenProps): React.JSX.Element {
  const words = useMessages().versions;
  const decided = groups.filter((group) => group.use !== undefined).length;
  const complete = decided === groups.length;
  return (
    <Screen labelledBy="versions-title">
      <ScreenHeader
        actions={
          <Button onClick={onBack} variant={complete ? 'default' : 'outline'}>
            {words.done}
          </Button>
        }
        back={{ label: backLabel, onBack }}
        description={words.description}
        eyebrow={<Eyebrow>{words.kicker}</Eyebrow>}
        id="versions-title"
        title={words.title(name)}
      />
      <p
        aria-live="polite"
        className={cn(
          'flex items-center gap-2 text-sm',
          complete ? 'text-accent' : 'text-muted-foreground',
        )}
        role="status"
      >
        {complete ? <CheckCircle2 aria-hidden="true" className="size-4" /> : null}
        {complete ? words.allDecided : words.progress(decided, groups.length)}
      </p>
      <ul aria-label={words.kicker} className="space-y-4">
        {groups.map((group) => (
          <li key={group.token}>
            <GroupCard group={group} onChoose={onChoose} previews={previews} />
          </li>
        ))}
      </ul>
      <Note>{words.saved}</Note>
    </Screen>
  );
}

function GroupCard({
  group,
  onChoose,
  previews,
}: {
  readonly group: VersionGroup;
  readonly onChoose: VersionsScreenProps['onChoose'];
  readonly previews: ReadonlyMap<string, string>;
}): React.JSX.Element {
  const words = useMessages().versions;
  const decision = decisionOf(group);
  const everyId = group.candidates.map((candidate) => candidate.id);
  const field = `versions-${group.token}`;
  const legend = `${field}-legend`;
  const rememberedNames =
    group.remembered === undefined
      ? undefined
      : group.candidates
          .filter((candidate) => group.remembered!.includes(candidate.id))
          .map((candidate) => candidate.name)
          .join(', ');
  return (
    <fieldset
      aria-labelledby={legend}
      className="border-border bg-surface min-w-0 space-y-3 rounded-xl border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Files aria-hidden="true" className="text-muted-foreground size-4" />
          <legend className="text-base font-semibold" id={legend}>
            {words.chapter(group.token)}
          </legend>
          <Badge>{words.versions(group.candidates.length)}</Badge>
        </div>
        <Badge tone={decision === undefined ? 'warning' : 'accent'}>
          {decision === undefined ? words.undecided : words.decided}
        </Badge>
      </div>
      <ul className="space-y-2">
        {group.candidates.map((candidate) => (
          <li key={candidate.id}>
            <CandidateRow
              checked={decision === 'one' && group.use?.[0] === candidate.id}
              candidate={candidate}
              field={field}
              onChoose={() => {
                onChoose(group.token, [candidate.id]);
              }}
              preview={previews.get(candidate.id)}
            />
          </li>
        ))}
      </ul>
      <Choice
        checked={decision === 'all'}
        field={field}
        help={words.all.help}
        id={`${field}-all`}
        label={words.all.label(everyId.length)}
        onChoose={() => {
          onChoose(group.token, everyId);
        }}
      />
      <Choice
        checked={decision === 'none'}
        field={field}
        help={words.none.help}
        id={`${field}-none`}
        label={words.none.label}
        onChoose={() => {
          onChoose(group.token, []);
        }}
      />
      {rememberedNames !== undefined && rememberedNames !== '' && (
        <div className="flex flex-wrap items-center gap-2">
          <Note>{words.remembered.text(rememberedNames)}</Note>
          <Button
            onClick={() => {
              onChoose(group.token, group.remembered);
            }}
            size="sm"
            variant="outline"
          >
            {words.remembered.use}
          </Button>
        </div>
      )}
    </fieldset>
  );
}

function CandidateRow({
  candidate,
  checked,
  field,
  onChoose,
  preview,
}: {
  readonly candidate: VersionCandidate;
  readonly checked: boolean;
  readonly field: string;
  readonly onChoose: () => void;
  readonly preview: string | undefined;
}): React.JSX.Element {
  const words = useMessages().versions;
  return (
    <label
      className={cn(
        'border-border has-focus-visible:ring-ring flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-focus-visible:ring-2',
        checked && 'border-accent bg-accent/5',
      )}
    >
      <input
        checked={checked}
        className="accent-accent mt-1 size-4 shrink-0"
        name={field}
        onChange={onChoose}
        type="radio"
      />
      <span className="bg-muted text-muted-foreground flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md text-center text-[10px]">
        {preview === undefined ? (
          words.preview.missing
        ) : (
          <img
            alt={words.preview.alt(candidate.name)}
            className="size-full object-cover"
            src={preview}
          />
        )}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-sm font-medium wrap-anywhere">{candidate.name}</span>
        <Note>{`${words.kind[candidate.kind]} · ${words.pages(candidate.pageCount)}`}</Note>
        {candidate.attention !== undefined && (
          <Badge tone="warning">{words.flag[candidate.attention]}</Badge>
        )}
      </span>
    </label>
  );
}

function Choice({
  checked,
  field,
  help,
  id,
  label,
  onChoose,
}: {
  readonly checked: boolean;
  readonly field: string;
  readonly help: string;
  readonly id: string;
  readonly label: string;
  readonly onChoose: () => void;
}): React.JSX.Element {
  return (
    <label
      className={cn(
        'border-border has-focus-visible:ring-ring flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-focus-visible:ring-2',
        checked && 'border-accent bg-accent/5',
      )}
      htmlFor={id}
    >
      <input
        aria-describedby={`${id}-help`}
        checked={checked}
        className="accent-accent mt-1 size-4 shrink-0"
        id={id}
        name={field}
        onChange={onChoose}
        type="radio"
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        <Note id={`${id}-help`}>{help}</Note>
      </span>
    </label>
  );
}
