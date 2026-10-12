// Mutation testing of the domain and application layers.
//
//   npm run test:mutation                      every file of both layers
//   npm run test:mutation -- src/domain/x.ts   only these files
//   MUTATE_STRINGS=1 npm run test:mutation     also change the text of messages
//
// Each source file is its own Stryker run, tested with only the unit tests that import it: a
// mutant that is not noticed by those is not noticed by anything that is meant to cover it. The
// run is long (an hour or more for both layers), so it is run on purpose and is not a gate.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const stryker = path.join(here, 'node_modules', '@stryker-mutator', 'core', 'bin', 'stryker.js');
const reports = path.join(here, 'reports');

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(path.join(directory, entry.name))
      : entry.name.endsWith('.ts')
        ? [path.join(directory, entry.name)]
        : [],
  );
const relative = (file) => path.relative(root, file).split(path.sep).join('/');

const requested = process.argv.slice(2);
const sources =
  requested.length > 0
    ? requested
    : ['src/domain', 'src/application'].flatMap((layer) =>
        walk(path.join(root, layer))
          .map(relative)
          .filter((file) => !file.endsWith('.stories.ts')),
      );

const unitDirectory = path.join(root, 'tests', 'unit');
/** These run the real downloaded tools, which a changed copy of the sources has nothing to do with. */
const realTools = new Set(['pinned-tools-output.test.ts', 'toolchain-verification.test.ts']);
const tests = readdirSync(unitDirectory)
  .filter((file) => file.endsWith('.test.ts') && !realTools.has(file))
  .map((file) => ({
    path: `tests/unit/${file}`,
    text: readFileSync(path.join(unitDirectory, file), 'utf8'),
  }));
// The workflow classes are reached through the one workflow the tests build, not file by file.
const throughTheWorkflow = tests.filter((test) =>
  /support\/conversion-workflow|application\/workflows\/conversion-workflow/u.test(test.text),
);

function testsFor(source) {
  const specifier = `@/${source.replace(/^src\//u, '').replace(/\.ts$/u, '')}`;
  const direct = tests.filter((test) => test.text.includes(`'${specifier}'`));
  const layered = source.startsWith('src/application/workflows/') ? throughTheWorkflow : [];
  return [...new Set([...direct, ...layered].map((test) => test.path))].sort();
}

const base = (await import(pathToFileURL(path.join(here, 'stryker.config.mjs')).href)).default;
rmSync(reports, { recursive: true, force: true });
mkdirSync(reports, { recursive: true });
const skipped = [];
const results = [];
for (const source of sources) {
  const files = testsFor(source);
  if (files.length === 0) {
    skipped.push(source);
    continue;
  }
  const name = source.replace(/[/\\]/gu, '__');
  const report = path.join('tests', 'mutation', 'reports', `${name}.json`);
  console.log(`\n=== ${source} (${files.length} test file${files.length === 1 ? '' : 's'})`);
  const command = `npx vitest run --config tests/mutation/vitest.config.ts --bail 1 ${files.join(' ')}`;
  // One config per file: Stryker's command line cannot carry the command or the report name.
  const configFile = path.join(reports, `${name}.config.json`);
  writeFileSync(
    configFile,
    JSON.stringify({
      ...base,
      mutate: [source],
      commandRunner: { command },
      jsonReporter: { fileName: report },
      ...(process.env.MUTATE_STRINGS === '1'
        ? {}
        : { mutator: { excludedMutations: ['StringLiteral'] } }),
    }),
  );
  spawnSync(process.execPath, [stryker, 'run', configFile], { cwd: root, stdio: 'inherit' });
  try {
    const json = JSON.parse(readFileSync(path.join(root, report), 'utf8'));
    const counts = { Killed: 0, Timeout: 0, Survived: 0, NoCoverage: 0, other: 0 };
    for (const file of Object.values(json.files)) {
      for (const mutant of file.mutants) {
        counts[mutant.status in counts ? mutant.status : 'other'] += 1;
      }
    }
    results.push({ source, ...counts });
  } catch {
    results.push({ source, error: true });
  }
}

console.log('\n=== Summary');
let killed = 0;
let survived = 0;
for (const result of results) {
  if (result.error) {
    console.log(`${result.source}: no report`);
    continue;
  }
  const caught = result.Killed + result.Timeout;
  const total = caught + result.Survived + result.NoCoverage;
  killed += caught;
  survived += result.Survived + result.NoCoverage;
  const score = total === 0 ? 100 : (100 * caught) / total;
  console.log(
    `${score.toFixed(1).padStart(5)}%  ${String(caught).padStart(4)} caught  ${String(result.Survived).padStart(4)} survived  ${String(result.NoCoverage).padStart(4)} not covered  ${result.source}`,
  );
}
const total = killed + survived;
console.log(
  `\n${total === 0 ? 100 : ((100 * killed) / total).toFixed(1)}% of ${total} changes were noticed.`,
);
if (skipped.length > 0) {
  console.log(`\nNo unit test imports these, so they were not mutated:\n  ${skipped.join('\n  ')}`);
}
