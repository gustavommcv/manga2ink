import { useEffect, useState } from 'react';

import { defaultTheme, resolveTheme, type Theme, type ThemePreference } from '@/domain/theme';

const darkSystem = '(prefers-color-scheme: dark)';

/** Whether the system is set to dark. Where the page cannot ask (a test), it is as dark as the default theme. */
function systemIsDark(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(darkSystem).matches
    : defaultTheme === 'dark';
}

/**
 * The theme a preference comes to (ADR 0070): a chosen theme is that one, and following the system it
 * is the system's, kept up to date as the system's setting changes. The main process sets what the
 * page's `prefers-color-scheme` says to the system's own while the preference is to follow it, so the
 * question has the answer the window and the parts the system draws were given.
 */
export function useResolvedTheme(preference: ThemePreference): Theme {
  const [dark, setDark] = useState(systemIsDark);

  useEffect(() => {
    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(darkSystem);
    const follow = (): void => {
      setDark(query.matches);
    };
    // It may have changed while the preference was a theme, or before this ran.
    follow();
    query.addEventListener('change', follow);
    return () => {
      query.removeEventListener('change', follow);
    };
  }, [preference]);

  return resolveTheme(preference, dark);
}
