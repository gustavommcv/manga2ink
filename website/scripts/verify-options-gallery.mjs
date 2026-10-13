// Checks the advanced-options pages against the pictures, the pinned mangapress and the list of
// mangapress options (schemas/cli-capabilities.json). The rules are in options-gallery-check.mjs.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkGallery } from './options-gallery-check.mjs';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(website, '..');
const docs = path.join(website, 'src', 'content', 'docs');
const assets = path.join(website, 'src', 'assets', 'options');

const json = (...parts) => JSON.parse(readFileSync(path.join(...parts), 'utf8'));
const mdx = (directory) =>
  readdirSync(directory, { recursive: true })
    .map((name) => name.split(path.sep).join('/'))
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => name.slice(0, -'.mdx'.length));

const pagesIn = (directory) =>
  Object.fromEntries(
    mdx(directory).map((slug) => [slug, readFileSync(path.join(directory, `${slug}.mdx`), 'utf8')]),
  );

/** Every page under a folder, by its path without the extension, with its text. */
const guidesIn = (directory, keep) =>
  Object.fromEntries(
    mdx(directory)
      .filter(keep)
      .map((name) => [name, readFileSync(path.join(directory, `${name}.mdx`), 'utf8')]),
  );

const pictures = new Map(
  readdirSync(assets)
    .filter((name) => name.endsWith('.webp'))
    .map((name) => [
      name,
      createHash('sha256')
        .update(readFileSync(path.join(assets, name)))
        .digest('hex'),
    ]),
);

const pt = path.join(docs, 'pt-br');
const problems = checkGallery({
  manifest: json(assets, 'manifest.json'),
  pin: json(root, 'toolchain.lock.json').tools.mangapress.pin.releaseTag.replace(/^v/, ''),
  pictures,
  licenses: readFileSync(path.join(assets, 'LICENSES.md'), 'utf8'),
  userFlags: json(root, 'schemas', 'cli-capabilities.json').tools.mangapress.user,
  coverage: json(website, 'media-src', 'options', 'coverage.json'),
  pages: {
    en: pagesIn(path.join(docs, 'user-guide', 'advanced-options')),
    'pt-br': pagesIn(path.join(pt, 'user-guide', 'advanced-options')),
  },
  guides: {
    en: guidesIn(docs, (name) => !name.startsWith('pt-br/')),
    'pt-br': guidesIn(pt, () => true),
  },
});

if (problems.length > 0) {
  console.error(problems.map((problem) => `- ${problem}`).join('\n'));
  console.error(`\n${problems.length} problem(s) with the advanced-options pages.`);
  process.exit(1);
}
console.log('The advanced-options pages, their pictures and the mangapress options agree.');
