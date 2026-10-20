import { ClipboardCopy, ExternalLink, FolderOpen, Heart, ScrollText } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

import mark from '@/renderer/assets/mark-192.webp';
import { Button } from '@/renderer/components/ui/button';
import { useAppInfo } from '@/renderer/hooks/use-app-info';
import { useMessages, useSay } from '@/renderer/hooks/use-messages';
import type { AnyMessage } from '@/domain/message';
import type { ProjectLink } from '@/shared/project-links-contract';
import type { ToolchainStatus } from '@/shared/toolchain-status';
import { Note } from '@/renderer/components/shared/note';

/** What the app says about itself (ADR 0054): what it is, who it is by, and where to go from here. */
export function AboutTab(): React.JSX.Element {
  const { about: words } = useMessages();
  const { copyDiagnostics, openFolder, openLink, tools, version } = useAppInfo();
  const { say } = useSay();
  const [failed, setFailed] = useState(false);
  // What happened to the last thing asked for a report: it was copied, or what to say it was not.
  const [report, setReport] = useState<'copied' | AnyMessage>();
  // `null` while the main process is asked, `undefined` when it does not say.
  const [toolchain, setToolchain] = useState<ToolchainStatus | null | undefined>(null);

  useEffect(() => {
    let reading = true;
    void tools().then((status) => {
      if (reading) setToolchain(status);
    });
    return () => {
      reading = false;
    };
  }, [tools]);

  const open = (link: ProjectLink): void => {
    void openLink(link).then((opened) => {
      setFailed(!opened);
    });
  };

  /** Asks the main process for something that helps a report, and says what came of it. */
  const help = (ask: () => Promise<AnyMessage | undefined>, done?: 'copied'): void => {
    void ask().then((problem) => {
      setReport(problem ?? done);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {/* The name is written beside it, so the picture adds nothing for a reader of the screen. */}
        <img
          alt=""
          className="size-24 shrink-0"
          draggable={false}
          height={96}
          src={mark}
          width={96}
        />
        <div className="min-w-0 space-y-1">
          <p className="text-lg font-semibold tracking-tight">Mangabound</p>
          <Note>
            {words.version} {version}
          </Note>
          <p className="text-sm leading-relaxed">{words.tagline}</p>
        </div>
      </div>

      <Section title={words.learnMore.title}>
        <div className="flex flex-wrap gap-2">
          <LinkButton label={words.learnMore.guide} link="guide" open={open} />
          <LinkButton label={words.learnMore.repository} link="repository" open={open} />
          <LinkButton label={words.learnMore.releaseNotes} link="release-notes" open={open} />
          <LinkButton label={words.learnMore.issues} link="issues" open={open} />
        </div>
      </Section>

      <Section title={words.tools.title}>
        <ToolVersions status={toolchain} />
      </Section>

      <Section title={words.troubleshooting.title}>
        <Note>
          {words.troubleshooting.text} {words.troubleshooting.logsText}
        </Note>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              help(copyDiagnostics, 'copied');
            }}
            size="sm"
            variant="outline"
          >
            {words.troubleshooting.copy}
            <ClipboardCopy aria-hidden="true" />
          </Button>
          <Button
            onClick={() => {
              help(() => openFolder('data'));
            }}
            size="sm"
            variant="outline"
          >
            {words.troubleshooting.openData}
            <FolderOpen aria-hidden="true" />
          </Button>
          <Button
            onClick={() => {
              help(() => openFolder('logs'));
            }}
            size="sm"
            variant="outline"
          >
            {words.troubleshooting.openLogs}
            <ScrollText aria-hidden="true" />
          </Button>
        </div>
        <div aria-live="polite">
          {report !== undefined &&
            (report === 'copied' ? (
              <Note>{words.troubleshooting.copied}</Note>
            ) : (
              <p className="text-status-failed text-xs">{say(report)}</p>
            ))}
        </div>
      </Section>

      <Section title={words.support.title}>
        <div className="flex items-center justify-between gap-4">
          <Note>{words.support.text}</Note>
          <Button
            onClick={() => {
              open('support');
            }}
            variant="outline"
          >
            <Heart aria-hidden="true" className="text-accent" />
            {words.support.button}
          </Button>
        </div>
      </Section>

      <Section title={words.credits.title}>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground text-xs">{words.credits.icon}</dt>
          <dd>JPmarquesbraga</dd>
          <dt className="text-muted-foreground text-xs">{words.credits.online}</dt>
          <dd>
            <LinkButton label="MangaDex" link="mangadex" open={open} plain />
          </dd>
        </dl>
      </Section>

      <Section title={words.license.title}>
        <Note>{words.license.text}</Note>
        <div className="flex flex-wrap gap-2">
          <LinkButton label={words.license.mit} link="license" open={open} />
          <LinkButton label={words.license.notices} link="third-party-notices" open={open} />
        </div>
      </Section>

      <div aria-live="polite">
        {failed && <p className="text-status-failed text-xs">{words.openFailed}</p>}
      </div>
    </div>
  );
}

/** What the bundled tools are and whether they passed the check made at launch. */
function ToolVersions({
  status,
}: {
  readonly status: ToolchainStatus | null | undefined;
}): React.JSX.Element {
  const { about: words } = useMessages();
  if (status === null) return <Note>{words.tools.reading}</Note>;
  if (status === undefined) {
    return <Note>{words.tools.unknown}</Note>;
  }
  if (status.tools.length === 0) {
    return <p className="text-status-failed text-xs">{words.tools.blocked}</p>;
  }
  return (
    <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm">
      {status.tools.map((tool) => (
        <Fragment key={tool.name}>
          <dt className="font-mono text-xs">{tool.name}</dt>
          <dd className={tool.state === 'ready' ? '' : 'text-status-failed'}>
            v{tool.releaseTag.replace(/^v/u, '')}{' '}
            <span className="text-muted-foreground text-xs">
              · {tool.state === 'ready' ? words.tools.verified : words.tools.failed}
            </span>
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

function Section({
  children,
  title,
}: {
  readonly children: React.ReactNode;
  readonly title: string;
}): React.JSX.Element {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

/**
 * A button that opens a place in the browser of the system: the arrow says it leaves the app. A
 * `plain` one is a name in a line of text, set back by its own padding so the name lines up.
 */
function LinkButton({
  label,
  link,
  open,
  plain = false,
}: {
  readonly label: string;
  readonly link: ProjectLink;
  readonly open: (link: ProjectLink) => void;
  readonly plain?: boolean;
}): React.JSX.Element {
  return (
    <Button
      flush={plain ? 'start' : undefined}
      onClick={() => {
        open(link);
      }}
      size="sm"
      variant={plain ? 'ghost' : 'outline'}
    >
      {label}
      <ExternalLink aria-hidden="true" />
    </Button>
  );
}
