import { describe, expect, it } from 'vitest';

import { message, raw } from '@/domain/message';
import { SaidError } from '@/renderer/lib/said-error';

describe('an error that carries what to tell the person', () => {
  it('keeps the message it was made with, and is an Error to whoever catches it', () => {
    const said = message('failure.searchNotCompleted', {});

    const error = new SaidError(said);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SaidError');
    expect(error.said).toBe(said);
  });

  it('is named by the code in the log, not by a sentence', () => {
    expect(new SaidError(message('failure.sourceUnavailable', {})).message).toBe(
      'failure.sourceUnavailable',
    );
    expect(new SaidError(raw('MangaDex is unreachable.')).message).toBe('text.raw');
  });
});
