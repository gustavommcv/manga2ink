import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { missingLabels } from './ui-labels.mjs';

/** The guides of the app itself. The other pages speak of other programs' menus, or of code. */
const guides = ['user-guide', 'getting-started/quickstart.mdx'];

/**
 * Bold phrases of those guides that are not a name in the interface, and the reason each is bold.
 * Everything else bold in a guide has to be something the interface says.
 */
const allowed = new Map([
  // Written as an example of what the interface would say about a folder, not as a label.
  ['Chapter 2 is in the folder more than once', 'an example of a problem the editor reports'],
  // Said with a number, and the interface says them with another one.
  ['Create volume 1', 'the label is "Create volume {number}"'],
  ['Process N items', 'the label counts the items in the queue'],
  ['Use pt-BR', 'the label is "Use {language}"'],
  // Emphasis on a column or a value of a table, or on a part of the page of options.
  ['The captions', 'emphasis on a part of the options page'],
  ['The tables of values', 'emphasis on a part of the options page'],
  ['What is not shown.', 'emphasis on a part of the options page'],
  ['On, with Manga reading order off', 'a value of a table'],
  ['On, with Crop the cover to fill the screen', 'a value of a table'],
  ['240 − 64 × power', 'a formula'],
  ['all pending generated books in that group', 'emphasis on what Delete removes'],
  ['A PDF is never given a cover', 'emphasis on a sentence of the cover page'],
]);

const root = path.resolve(import.meta.dirname, '..', '..');
const sourceFolders = ['src/renderer', 'src/domain', 'src/opds', 'src/shared'];

function filesIn(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

const interfaceText = sourceFolders
  .flatMap((folder) => filesIn(path.join(root, folder)))
  .filter((file) => /\.tsx?$/u.test(file) && !/\.(stories|test)\.tsx?$/u.test(file))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

const docs = path.resolve(import.meta.dirname, '..', 'src', 'content', 'docs');
const pages = guides.flatMap((guide) => {
  const target = path.join(docs, guide);
  return /\.mdx$/u.test(guide) ? [target] : filesIn(target).filter((file) => /\.mdx$/u.test(file));
});

let problems = 0;
for (const page of pages) {
  const missing = missingLabels(readFileSync(page, 'utf8'), interfaceText, new Set(allowed.keys()));
  for (const phrase of missing) {
    problems += 1;
    console.error(`${path.relative(docs, page)}: "${phrase}" is not a name in the interface.`);
  }
}
console.log(
  `UI labels: ${String(pages.length)} guides, ${String(problems)} names not found in the interface.`,
);
if (problems > 0) process.exitCode = 1;
