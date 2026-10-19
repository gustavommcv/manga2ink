import { Callout } from '@/renderer/components/shared/callout';
import { useMessages } from '@/renderer/hooks/use-messages';

/**
 * Things worth telling the person that are not errors: a saved setting that could not be used and
 * what took its place. They stay until dismissed, because they are easy to miss at launch.
 */
export function Notices({
  notices,
  onDismiss,
}: {
  readonly notices: readonly string[];
  readonly onDismiss: () => void;
}): React.JSX.Element | null {
  const words = useMessages().shared.notices;
  if (notices.length === 0) return null;
  return (
    <Callout
      aria-label={words.label}
      className="mb-6"
      dismiss={{ label: words.dismiss, onDismiss }}
      role="status"
    >
      <ul className="space-y-1">
        {notices.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
    </Callout>
  );
}
