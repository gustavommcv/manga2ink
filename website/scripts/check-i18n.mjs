import { readFileSync } from 'node:fs';
import path from 'node:path';

import { languages } from '../site.config.mjs';
import { filesUnder } from './files.mjs';
import { translationGaps } from './verification.mjs';

const paths = filesUnder(path.resolve('src/content/docs')).filter((file) => /\.mdx?$/.test(file));
const untranslated = JSON.parse(readFileSync(path.resolve('i18n-gaps.json'), 'utf8'));
const result = translationGaps(paths, { languages, untranslated });
const [source, ...others] = languages;

console.log(
  [
    `${source.label}: ${result.counts[source.id]}`,
    ...others.map(
      ({ id, label }) =>
        `${label}: ${result.counts[id]}${result.listed[id] ? ` (${result.listed[id]} left in ${source.label} on purpose)` : ''}`,
    ),
  ].join('; '),
);
for (const { id, label } of others) {
  for (const file of result.missing[id]) console.error(`Missing ${label}: ${file}`);
  for (const file of result.orphans[id])
    console.error(`${label} has ${file}, and ${source.label} does not`);
  for (const file of result.stale[id])
    console.error(
      `i18n-gaps.json lists ${file} for ${label}, which is translated already or is not a page`,
    );
  if (result.missing[id].length || result.orphans[id].length || result.stale[id].length)
    process.exitCode = 1;
}
