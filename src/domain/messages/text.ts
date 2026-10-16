/**
 * Text that was written by someone else (a tool, the operating system, a service) and is said as it
 * is, in its own words and language (ADR 0053).
 */
export interface TextMessageValues {
  readonly 'text.raw': { readonly text: string };
}
