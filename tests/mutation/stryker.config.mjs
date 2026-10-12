// Mutation testing: changes one thing at a time in the domain and application layers, and checks
// that a test notices. Coverage says a line ran; this says whether a test would have noticed it
// being wrong. `npm run test:mutation` starts it (see run.mjs, which chooses the tests per file).

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  // The command runner starts one Vitest per mutant, so it does not depend on which Vitest the app
  // uses: the runner for Vitest itself found no test to run under Vitest 5 and let every change
  // survive, which is the one result this tool must never give by accident.
  testRunner: 'command',
  coverageAnalysis: 'off',
  ignorePatterns: [
    '.git',
    '.stryker-tmp',
    'coverage',
    'docs',
    'out',
    'packaging',
    'storybook-static',
    'test-results',
    'tests/component',
    'tests/e2e',
    'tests/mutation/node_modules',
    'tests/mutation/reports',
    'tests/tutorial',
    'tests/visual',
    'vendor',
    'website',
  ],
  concurrency: 3,
  reporters: ['clear-text', 'json'],
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
};
