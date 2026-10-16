import type { AnyMessage } from '@/domain/message';

/**
 * An error that carries what to tell the person, as a code the window writes in its language
 * (ADR 0053). It is how a failure from the main process travels through code that throws: whoever
 * catches it says it, and anything else that was thrown is not for the person to read.
 */
export class SaidError extends Error {
  constructor(readonly said: AnyMessage) {
    super(said.id);
    this.name = 'SaidError';
  }
}
