import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { message } from '@/domain/message';
import { useSayLater } from '@/renderer/hooks/use-messages';

import { inLanguage } from './support/i18n';

describe('writing a message when it is written, in the language of that moment', () => {
  it('is one function that speaks the language the window is in now', () => {
    const { result, rerender } = renderHook(() => useSayLater(), {
      wrapper: ({ children }: { children: React.ReactNode }) => inLanguage('en', children),
    });
    const first = result.current;
    const diskFull = message('failure.diskFull', {});

    expect(first(diskFull)).toBe(
      'There is no space left on the drive. Free some space and try again.',
    );

    rerender();
    expect(result.current).toBe(first);
  });

  it('speaks Portuguese in a window that is in Portuguese', () => {
    const { result } = renderHook(() => useSayLater(), {
      wrapper: ({ children }: { children: React.ReactNode }) => inLanguage('pt-BR', children),
    });

    expect(result.current(message('failure.diskFull', {}))).toBe(
      'Não há mais espaço no disco. Libere espaço e tente de novo.',
    );
  });
});
