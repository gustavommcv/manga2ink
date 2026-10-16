import { ExternalLink, Heart } from 'lucide-react';
import { useState } from 'react';

import mark from '@/renderer/assets/mark-192.webp';
import { Button } from '@/renderer/components/ui/button';
import { useAppInfo } from '@/renderer/hooks/use-app-info';
import { useMessages } from '@/renderer/hooks/use-messages';
import type { ProjectLink } from '@/shared/project-links-contract';

/** What the app says about itself (ADR 0053): what it is, who it is by, and where to go from here. */
export function AboutTab(): React.JSX.Element {
  const { about: words } = useMessages();
  const { openLink, version } = useAppInfo();
  const [failed, setFailed] = useState(false);

  const open = (link: ProjectLink): void => {
    void openLink(link).then((opened) => {
      setFailed(!opened);
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
          <p className="text-muted-foreground text-xs">
            {words.version} {version}
          </p>
          <p className="text-sm leading-relaxed">{words.tagline}</p>
        </div>
      </div>

      <Section title={words.learnMore.title}>
        <div className="flex flex-wrap gap-2">
          <LinkButton label={words.learnMore.guide} link="guide" open={open} />
          <LinkButton label={words.learnMore.repository} link="repository" open={open} />
          <LinkButton label={words.learnMore.issues} link="issues" open={open} />
        </div>
      </Section>

      <Section title={words.support.title}>
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs leading-relaxed">{words.support.text}</p>
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
        <p className="text-muted-foreground text-xs leading-relaxed">{words.license.text}</p>
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
      className={plain ? '-ml-3' : undefined}
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
