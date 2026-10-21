import { ExternalLink } from 'lucide-react';

import { Button } from '@/renderer/components/ui/button';
import type { ProjectLink } from '@/shared/project-links-contract';

/**
 * A button that opens a place in the browser of the system, by its name (ADR 0054): the arrow says it
 * leaves the app. A `plain` one is a name in a line of text, set back by its own padding so the name
 * lines up.
 */
export function LinkButton({
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
