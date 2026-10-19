import {
  BookOpen,
  CircleAlert,
  Download,
  ExternalLink,
  FolderOpen,
  TriangleAlert,
} from 'lucide-react';

import type { Language } from '@/domain/app-settings';
import { warningNotices } from '@/domain/book-warnings';
import type { AnyMessage } from '@/domain/message';
import type { RunOutcome as ReportOutcome } from '@/domain/run-report';
import { Callout } from '@/renderer/components/shared/callout';
import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { TwoColumns } from '@/renderer/components/shared/two-columns';
import { Button } from '@/renderer/components/ui/button';
import { useLanguage, useMessages, useSay } from '@/renderer/hooks/use-messages';
import type { ArtifactSummary } from '@/shared/workflow-contract';

/** What became of one queue item in a run. */
export type RunOutcome = ReportOutcome<ArtifactSummary>;

export interface ResultsScreenProps {
  readonly onBack: () => void;
  readonly onFix: (rowId: string) => void;
  readonly onOpen: (artifactId: string) => void;
  readonly onShow: (artifactId: string) => void;
  readonly onSaveAs?: (artifactId: string) => void;
  readonly onSaveAll?: (artifactIds: readonly string[]) => void;
  readonly savedIds?: ReadonlySet<string>;
  readonly outcomes: readonly RunOutcome[];
  /** A short description of how the books were made, shown under the heading. */
  readonly summary?: AnyMessage;
  /** The card that lets a reader pull ready books; rendered beside the list. */
  readonly aside?: React.ReactNode;
}

/** The size of a book as a file manager writes it: "1.5 MB" and, in Portuguese, "1,5 MB". */
export function formatBytes(bytes: number, language: Language = 'en'): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const oneDecimal = new Intl.NumberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false,
  });
  if (bytes < 1024 * 1024) return `${oneDecimal.format(bytes / 1024)} KB`;
  // A whole series in one file can pass a gigabyte, which "1536.0 MB" does not say well.
  if (bytes < 1024 * 1024 * 1024) return `${oneDecimal.format(bytes / (1024 * 1024))} MB`;
  return `${oneDecimal.format(bytes / (1024 * 1024 * 1024))} GB`;
}

export function ResultsScreen({
  aside,
  onBack,
  onFix,
  onOpen,
  onShow,
  onSaveAs,
  onSaveAll,
  savedIds,
  outcomes,
  summary,
}: ResultsScreenProps): React.JSX.Element {
  const words = useMessages().results;
  const language = useLanguage();
  const { say, sayAll } = useSay();
  const artifacts = outcomes.flatMap((outcome) => outcome.artifacts);
  const problems = outcomes.filter((outcome) => outcome.status !== 'done');
  const notices = warningNotices(artifacts);
  return (
    <Screen labelledBy="results-title">
      <ScreenHeader
        actions={
          <Button onClick={onBack} variant="outline">
            {words.convertMore}
          </Button>
        }
        description={summary === undefined ? undefined : say(summary)}
        id="results-title"
        title={artifacts.length === 0 ? words.none : words.ready(artifacts.length)}
      />
      <TwoColumns aside={aside} className="space-y-5">
        {artifacts.length > 1 && onSaveAll !== undefined && (
          <Button
            onClick={() => {
              onSaveAll(artifacts.map((artifact) => artifact.id));
            }}
            title={words.saveAll.hint}
            variant="outline"
          >
            <Download /> {words.saveAll.label}
          </Button>
        )}
        {artifacts.length > 0 && (
          <ul aria-label={words.books} className="space-y-1">
            {artifacts.map((artifact) => (
              <li
                className="hover:bg-muted/40 flex items-center gap-3 rounded-xl px-3 py-2.5"
                key={artifact.id}
              >
                <span
                  aria-hidden="true"
                  className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
                >
                  <BookOpen className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{artifact.name}</p>
                  <p className="text-subtle-foreground text-xs">
                    {formatBytes(artifact.bytes, language)} ·{' '}
                    {savedIds?.has(artifact.id) === true ? words.saved : words.notSaved}
                  </p>
                </div>
                {onSaveAs !== undefined && (
                  <Button
                    aria-label={words.saveBookAs(artifact.name)}
                    onClick={() => {
                      onSaveAs(artifact.id);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {words.saveAs}
                  </Button>
                )}
                {savedIds?.has(artifact.id) === true && (
                  <Button
                    aria-label={words.showInFolder(artifact.name)}
                    onClick={() => {
                      onShow(artifact.id);
                    }}
                    size="icon"
                    variant="outline"
                  >
                    <FolderOpen />
                  </Button>
                )}
                <Button
                  aria-label={words.open(artifact.name)}
                  onClick={() => {
                    onOpen(artifact.id);
                  }}
                  size="icon"
                  variant="outline"
                >
                  <ExternalLink />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {problems.map((outcome) => (
          <Callout
            action={
              outcome.fixable === true ? (
                <Button
                  aria-label={words.fixBook(outcome.name)}
                  onClick={() => {
                    onFix(outcome.rowId);
                  }}
                  variant="outline"
                >
                  {words.fix}
                </Button>
              ) : undefined
            }
            icon={outcome.status === 'failed' ? CircleAlert : TriangleAlert}
            key={`${outcome.rowId}:${outcome.name}`}
            role="status"
            title={
              outcome.status === 'failed' ? words.failed(outcome.name) : words.skipped(outcome.name)
            }
            tone={outcome.status === 'failed' ? 'failed' : 'warning'}
          >
            {outcome.message === undefined ? undefined : sayAll(outcome.message)}
          </Callout>
        ))}

        {notices.length > 0 && (
          <ul aria-label={words.warnings} className="space-y-5">
            {notices.map((notice) => (
              <li key={`${notice.code}:${say(notice.message)}`}>
                <Callout icon={TriangleAlert} title={say(notice.title)}>
                  {notice.where === undefined
                    ? say(notice.message)
                    : `${say(notice.where)} ${say(notice.message)}`}
                </Callout>
              </li>
            ))}
          </ul>
        )}
      </TwoColumns>
    </Screen>
  );
}
