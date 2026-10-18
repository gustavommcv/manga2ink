import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { ThemePreference } from '@/domain/theme';
import { useResolvedTheme } from '@/renderer/hooks/use-resolved-theme';

import { pretendToBeTheSystem } from './support/system-theme';

let system: ReturnType<typeof pretendToBeTheSystem> | undefined;
afterEach(() => {
  system?.restore();
  system = undefined;
});

describe('the theme a preference comes to, in the page', () => {
  it.each([
    [true, 'dark'],
    [false, 'light'],
  ] as const)('is the system’s for one that follows it: dark %s is %s', (dark, theme) => {
    system = pretendToBeTheSystem(dark);

    const { result } = renderHook(() => useResolvedTheme('system'));

    expect(result.current).toBe(theme);
  });

  it.each(['dark', 'light'] as const)(
    'is the %s theme itself, whatever the system is set to',
    (theme) => {
      system = pretendToBeTheSystem(theme === 'light');

      const { result } = renderHook(() => useResolvedTheme(theme));

      expect(result.current).toBe(theme);
      expect(system.listening()).toBe(0);
    },
  );

  it('follows the system when it changes, while the preference is to', () => {
    system = pretendToBeTheSystem(false);
    const { result } = renderHook(() => useResolvedTheme('system'));
    expect(result.current).toBe('light');

    act(() => {
      system?.set(true);
    });
    expect(result.current).toBe('dark');
    act(() => {
      system?.set(false);
    });
    expect(result.current).toBe('light');
  });

  it('listens once, and gives it up when the page goes', () => {
    system = pretendToBeTheSystem(true);
    const { unmount } = renderHook(() => useResolvedTheme('system'));
    expect(system.listening()).toBe(1);

    unmount();

    expect(system.listening()).toBe(0);
  });

  it('stops following when a theme is chosen, and starts again when the choice is to follow', () => {
    system = pretendToBeTheSystem(false);
    const { result, rerender } = renderHook(
      ({ preference }: { preference: ThemePreference }) => useResolvedTheme(preference),
      { initialProps: { preference: 'system' } },
    );
    expect(system.listening()).toBe(1);

    rerender({ preference: 'dark' });
    expect(system.listening()).toBe(0);
    act(() => {
      system?.set(true);
    });
    // The system moved on while a theme was chosen: following it again is the system as it is now.
    rerender({ preference: 'system' });

    expect(result.current).toBe('dark');
    expect(system.listening()).toBe(1);
  });

  it('is the dark theme where the page cannot ask the system, as the default theme is', () => {
    const { result } = renderHook(() => useResolvedTheme('system'));

    expect(result.current).toBe('dark');
  });
});
