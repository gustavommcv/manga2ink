import { vi } from 'vitest';

/**
 * A system whose light or dark setting a test can change: it answers `matchMedia` for the page's
 * `prefers-color-scheme`, as the window does (ADR 0070), and tells what is listening when it changes.
 */
export function pretendToBeTheSystem(initiallyDark: boolean): {
  readonly set: (dark: boolean) => void;
  readonly listening: () => number;
  readonly restore: () => void;
} {
  let dark = initiallyDark;
  const listeners = new Set<() => void>();
  const query = {
    get matches(): boolean {
      return dark;
    },
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => {
      listeners.delete(listener);
    }),
  };
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => query),
  });
  return {
    set: (next) => {
      dark = next;
      for (const listener of [...listeners]) listener();
    },
    listening: () => listeners.size,
    restore: () => {
      if (original === undefined) Reflect.deleteProperty(window, 'matchMedia');
      else Object.defineProperty(window, 'matchMedia', original);
    },
  };
}
