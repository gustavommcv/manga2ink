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
 * suite reaches (96% of statements, 93.5% of branches, 96% of functions, 97% of lines on
 * 2026-10-13): raise them when the suite does, never lower them to let a change through.
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
    coverage: {
      // The entry that mounts the page is the one file of the renderer with nothing to test.
      exclude: ['**/*.stories.*', 'src/renderer/index.tsx'],
      include: ['src/renderer/**/*.{ts,tsx}'],
      provider: 'v8',
      reporter: ['text-summary'],
      thresholds: {
        branches: 92,
        functions: 95,
        lines: 96,
        statements: 95,
      },
    },
  },
});
