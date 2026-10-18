/**
 * How many books of one title are converted at the same time (ADR 0068). A person chooses to leave
 * it to the app, which counts the processors and the memory of the computer (ADR 0027), or to name
 * the number. It is a choice about a queue: it is read when the queue begins, so a change is for the
 * next one.
 *
 * The numbers go past what "automatic" ever comes to, for a computer with many processors: one
 * conversion keeps fewer of them busy the more there are, and it takes several to fill them (ADR
 * 0068 has the measurement). The steps widen so the list stays short.
 */
export const parallelChoices = ['automatic', 1, 2, 3, 4, 6, 8] as const;

export type ParallelChoice = (typeof parallelChoices)[number];

/** What a person starts with, and what a file that names no choice this build has comes to. */
export const defaultParallelChoice: ParallelChoice = 'automatic';

/**
 * The most that "automatic" comes to. It is the number that filled a computer of twelve processor
 * threads with no gain from more (ADR 0027, ADR 0068); a computer with many more is for a person to
 * choose a number for, since this has not been measured on one.
 */
export const mostAutomaticConversions = 3;

export function isParallelChoice(value: unknown): value is ParallelChoice {
  return parallelChoices.includes(value as ParallelChoice);
}

/**
 * The choice a text names: what a list of options holds, since every value of an option is a text.
 * Nothing when the text names none.
 */
export function parallelChoiceNamed(text: string): ParallelChoice | undefined {
  return parallelChoices.find((choice) => String(choice) === text);
}
