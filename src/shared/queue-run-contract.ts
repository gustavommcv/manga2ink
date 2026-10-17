import { z } from 'zod';

import type { QueueRunSummary } from '@/domain/queue-run';

/** More of anything than a queue could hold is a request that was not made by the window. */
const count = z.number().int().min(0).max(1_000_000);

/**
 * What the window sends when a queue has ended (ADR 0065): which queue, by the token the main
 * process gave it, and how it went. No name of a book and no path is in it.
 */
export const endQueueCommandSchema = z.object({
  token: z.string().min(1).max(200),
  summary: z.object({
    books: count,
    failures: count,
    notes: count,
    cancelled: z.boolean(),
  }),
});

export interface EndQueueCommand {
  readonly token: string;
  readonly summary: QueueRunSummary;
}
