import { Info } from 'lucide-react';
import type React from 'react';

import { useMessages } from '@/renderer/hooks/use-messages';

import { Callout } from './callout';

export interface InfoBannerProps {
  readonly 'aria-label'?: string;
  readonly className?: string;
  readonly message: React.ReactNode;
  readonly title?: string;
}

/**
 * An informational banner indicating a current workflow state or mode.
 * Uses the app's persistent warning-callout treatment for a mode that changes workflow behavior.
 */
export function InfoBanner({
  'aria-label': ariaLabel,
  className,
  message,
  title,
}: InfoBannerProps): React.JSX.Element {
  const words = useMessages().shared.infoBanner;
  return (
    <Callout
      aria-label={ariaLabel ?? title ?? words.label}
      {...(className === undefined ? {} : { className })}
      icon={Info}
      role="status"
      {...(title === undefined ? {} : { title })}
    >
      {message}
    </Callout>
  );
}
