/**
 * How many books of one title are converted at the same time (ADR 0068). A person chooses to leave
 * it to the app, which counts the processors and the memory of the computer (ADR 0027), or to name
 * the number. It is a choice about a queue: it is read when the queue begins, so a change is for the
 * next one.
 */
export const parallelChoices = ['automatic', 1, 2, 3] as const;

export type ParallelChoice = (typeof parallelChoices)[number];

/** What a person starts with, and what a file that names no choice this build has comes to. */
export const defaultParallelChoice: ParallelChoice = 'automatic';

/**
 * The most that are ever converted at once, asked for or worked out. Three was the best on the
 * machine that ADR 0027 measured and four at once were slower, so the choices stop there.
 */
export const mostParallelConversions = 3;

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
