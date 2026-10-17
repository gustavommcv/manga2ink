import { z } from 'zod';

/**
 * The command of the clean-up of what has waited (ADR 0061): the number of days, one of `idleDays`
 * of the domain. It is here, and not with them, so that the window, which only needs the days, does
 * not carry the schema library.
 */
export const idleDaysCommandSchema = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
});

export type IdleDaysCommand = z.infer<typeof idleDaysCommandSchema>;
