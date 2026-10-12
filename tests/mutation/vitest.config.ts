import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Stryker runs the tests from a copy of the checkout with the changed sources in it, and starts
// them in that copy: the root is where they are started, not where this file was first written.
const root = process.cwd();

export default defineConfig({
  root,
  resolve: { alias: { '@': path.join(root, 'src') } },
  test: { environment: 'node' },
});
