import { z } from 'zod';

import { languages } from '@/domain/app-settings';

/**
 * The places the About tab sends a person to (ADR 0053). The window names one of them and the
 * language it is in; the address is worked out in the main process, so the page can never ask for
 * one of its own, as with the homepage of an online source (ADR 0013).
 */
export const projectLinks = [
  'guide',
  'repository',
  'issues',
  'license',
  'third-party-notices',
  'support',
  'mangadex',
] as const;

export type ProjectLink = (typeof projectLinks)[number];

export const openProjectLinkCommandSchema = z.object({
  link: z.enum(projectLinks),
  /** The language of the window, which picks the guide's language where there is more than one. */
  language: z.enum(languages),
});

export type OpenProjectLinkCommand = z.infer<typeof openProjectLinkCommandSchema>;
