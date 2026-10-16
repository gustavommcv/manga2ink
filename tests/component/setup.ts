import '@testing-library/jest-dom/vitest';

import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// jsdom has no ResizeObserver, which the menus' positioning (Radix's popper) measures with. Nothing
// here depends on the sizes it would report, so an observer that observes nothing is enough.
class SilentResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
// jsdom has none, though the type says every environment does.
if (!('ResizeObserver' in globalThis)) globalThis.ResizeObserver = SilentResizeObserver;

// What the page waits for before it draws (what was kept, the answer about the tools, the books
// left over from a run) is a few round trips, and the default second for `findBy` and `waitFor` is
// not enough when many files run at once on a small machine. A wait that is answered returns as
// soon as it is, so a longer limit costs nothing except when something is really wrong.
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
});
