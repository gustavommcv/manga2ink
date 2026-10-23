import { describe, expect, it } from 'vitest';

import { assertSingleBook, validateRunOptions } from '@/application/workflows/run-preconditions';
import { ConversionWorkflowError } from '@/domain/conversion';
import { message } from '@/domain/message';
import { defaultMangaprepSettings } from '@/domain/output-profile';

const options = { settings: defaultMangaprepSettings, format: 'epub' } as const;

describe('shared run options', () => {
  it('defaults to binding and converting when no mode was chosen', () => {
    expect(validateRunOptions(options, 'converting')).toBe('bind-and-convert');
  });

  it.each(['bind-and-convert', 'bind-only', 'convert-only'] as const)(
    'keeps the explicitly chosen %s mode',
    (mode) => {
      expect(validateRunOptions({ ...options, mode }, 'converting')).toBe(mode);
    },
  );

  it.each(['converting', 'validating'] as const)(
    'does not validate unused mangaprep settings before %s',
    (action) => {
      expect(
        validateRunOptions(
          {
            ...options,
            mode: 'bind-only',
            settings: { ...defaultMangaprepSettings, jpegQuality: 101 },
          },
          action,
        ),
      ).toBe('bind-only');
    },
  );

  it.each([
    { mode: 'bind-and-convert', action: 'converting' },
    { mode: 'convert-only', action: 'converting' },
    { mode: 'bind-and-convert', action: 'validating' },
    { mode: 'convert-only', action: 'validating' },
  ] as const)('rejects invalid settings for $mode before $action', ({ mode, action }) => {
    const run = () =>
      validateRunOptions(
        {
          ...options,
          mode,
          settings: { ...defaultMangaprepSettings, jpegQuality: 101 },
        },
        action,
      );
    expect(run).toThrow(ConversionWorkflowError);
    expect(run).toThrowError(
      expect.objectContaining({
        code: 'invalid_settings',
        said: message('workflow.reviewSettings', { before: action }),
      }),
    );
  });
});

describe('shared single-book requirements', () => {
  it('allows a series made into one book when both tools run', () => {
    expect(() => {
      assertSingleBook('bind-and-convert');
    }).not.toThrow();
  });

  it.each(['bind-only', 'convert-only'] as const)('rejects %s', (mode) => {
    expect(() => {
      assertSingleBook(mode);
    }).toThrowError(
      expect.objectContaining({
        code: 'invalid_settings',
        said: message('workflow.singleBookNeedsBoth', {}),
      }),
    );
  });
});
