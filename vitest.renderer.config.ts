import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

/**
 * The component tests with a floor under what they reach of the renderer (`npm run test:component`).
 * The "component" project of vitest.config.ts is the same run without the floor, which is what
 * `--project component` and the editors use: keep the two in step.
 *
 * The renderer is not under the 100% gate of `npm run test:unit`: its behavior is checked through
 * React Testing Library and Storybook, and a floor says when a change leaves a screen less covered
 * than it was, without asking for every branch of a layout. The numbers sit a little under what the
 * suite reaches (98.4% of statements, 94.4% of branches, 99.3% of functions, 99.5% of lines
 * on 2026-10-13): raise them when the suite does, never lower them to let a change through.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDirectory, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/component/**/*.test.tsx'],
    name: 'component',
    setupFiles: ['./tests/component/setup.ts'],
    // As in vitest.config.ts, and for the same reason: the instrumented run is slower still.
    testTimeout: 15_000,
    coverage: {
      // The entry that mounts the page is the one file of the renderer with nothing to test.
      exclude: ['**/*.stories.*', 'src/renderer/index.tsx'],
      include: ['src/renderer/**/*.{ts,tsx}'],
      provider: 'v8',
      reporter: ['text-summary'],
      thresholds: {
        branches: 93,
        functions: 98,
        lines: 98,
        statements: 97,
      },
    },
  },
});
