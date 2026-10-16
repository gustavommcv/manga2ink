import { RadioTower } from 'lucide-react';

import { Button } from '@/renderer/components/ui/button';
import { useMessages } from '@/renderer/hooks/use-messages';
import type { OpdsSharingStatus } from '@/shared/opds-contract';

export interface SendToKoreaderProps {
  readonly status: OpdsSharingStatus;
  /** Opens the Share panel with the ready books chosen, unless something else is being shared. */
  readonly onOpen: () => void;
}

/**
 * The way from "books ready" to "books on the e-reader". It carries no controls of its own: sharing
 * is set up in the Share panel, the same one the title bar opens (ADR 0016), and this only takes a
 * person there with the pending run already chosen, even before exporting any file.
 */
export function SendToKoreader({ onOpen, status }: SendToKoreaderProps): React.JSX.Element {
  const words = useMessages().sharing.send;
  return (
    <section
      aria-labelledby="koreader-title"
      className="border-border bg-surface h-fit space-y-3 rounded-xl border p-5"
    >
      <div className="flex items-center gap-2">
        <RadioTower aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
        <h2 className="text-sm font-medium" id="koreader-title">
          {words.title}
        </h2>
        <span className="flex-1" />
        {status.active && (
          <span className="bg-accent/15 text-accent rounded-full px-2.5 py-0.5 text-xs">
            {words.sharing}
          </span>
        )}
      </div>
      <p className="text-muted-foreground text-sm">{words.text}</p>
      <Button onClick={onOpen} variant="outline">
        {status.active ? words.show : words.share}
      </Button>
    </section>
  );
}
