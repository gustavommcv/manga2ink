/**
 * The form of a word that goes with a count: the singular for exactly one, the plural otherwise (so
 * "0 items", as the app has always said it). A language whose words change in more ways than that
 * writes its own rule in its catalog.
 */
export function countOf(count: number, one: string, other: string): string {
  return count === 1 ? one : other;
}
