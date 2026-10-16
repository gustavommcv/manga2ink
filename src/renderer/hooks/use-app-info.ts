import { createContext, useContext } from 'react';

import type { ProjectLink } from '@/shared/project-links-contract';
import type { ToolchainStatus } from '@/shared/toolchain-status';

/** What the app says about itself in the About tab (ADR 0054). */
export interface AppInfo {
  /** The running version, with any prerelease label (e.g. "0.1.0-alpha.15"). */
  readonly version: string;
  /**
   * Opens a place in the browser of the system, and says whether it could be opened. The place is
   * named, never given as an address.
   */
  readonly openLink: (link: ProjectLink) => Promise<boolean>;
  /**
   * What the bundled conversion tools are and whether they passed the check made at launch, or
   * `undefined` when the main process does not say.
   */
  readonly tools: () => Promise<ToolchainStatus | undefined>;
}

/** Where the provider puts what the app says about itself for everything under it. */
export const AppInfoContext = createContext<AppInfo | undefined>(undefined);

/** What the app says about itself: only under an `AppSettingsProvider`. */
export function useAppInfo(): AppInfo {
  const info = useContext(AppInfoContext);
  if (info === undefined) {
    throw new Error('useAppInfo needs an AppSettingsProvider above it.');
  }
  return info;
}
