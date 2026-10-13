// Makes the pictures and the manifest of the advanced-options pages: runs the mangapress that
// Mangabound ships on pages from open-licensed comics, once for each variant of each example.
//
//   npm run site:options            every example
//   npm run site:options -- cropping-modes gamma     only these
//
// Needs the pinned tools (`npm run toolchain:acquire`). Downloads the source pages the first time,
// checks each against the SHA-256 in media-src/options/sources.json, and keeps them in the ignored
// website/.cache/options-art/. See ADR 0048 and website/MEDIA.md.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import sharp from 'sharp';

import { base, examples } from '../media-src/options/examples.mjs';
import { readZip } from './options-gallery/zip.mjs';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(website, '..');
const cache = path.join(website, '.cache', 'options-art');
const output = path.join(website, 'src', 'assets', 'options');
const PICTURE_WIDTH = 700;

const sources = JSON.parse(
  readFileSync(path.join(website, 'media-src', 'options', 'sources.json'), 'utf8'),
).sources;
const lock = JSON.parse(readFileSync(path.join(root, 'toolchain.lock.json'), 'utf8'));
const pinned = lock.tools.mangapress.pin.releaseTag.replace(/^v/, '');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function mangapressPath() {
  const target = `${process.platform}-${process.arch}`;
  const file = path.join(
    root,
    'vendor',
    'toolchain',
    target,
    process.platform === 'win32' ? 'mangapress.exe' : 'mangapress',
  );
  if (!existsSync(file))
    throw new Error(
      `No mangapress at ${file}. Run npm run toolchain:acquire at the repository root.`,
    );
  const version = execFileSync(file, ['--version'], { encoding: 'utf8' }).trim();
  if (version !== `mangapress ${pinned}`)
    throw new Error(
      `${file} says "${version}", the pin is ${pinned}. Run npm run toolchain:acquire.`,
    );
  return file;
}

const downloads = new Map();
/** The bytes of a source, downloaded once however many pages are asked for at the same time. */
function sourceBytes(id) {
  if (!downloads.has(id)) downloads.set(id, fetchSource(id));
  return downloads.get(id);
}

async function fetchSource(id) {
  const source = sources[id];
  if (!source) throw new Error(`Unknown source ${id}.`);
  const file = path.join(cache, `${id}.${source.kind === 'cbz' ? 'cbz' : source.extension}`);
  if (!existsSync(file)) {
    console.log(`Downloading ${source.url}`);
    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'mangabound-docs (https://github.com/gustavommcv/mangabound)' },
    });
    if (!response.ok) throw new Error(`${source.url}: HTTP ${response.status}`);
    mkdirSync(cache, { recursive: true });
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = readFileSync(file);
  if (sha256(bytes) !== source.sha256) {
    rmSync(file);
    throw new Error(
      `${id} does not match the SHA-256 in sources.json. The file was removed from the cache.`,
    );
  }
  return bytes;
}

const archives = new Map();
async function page({ source, page: name }) {
  const bytes = await sourceBytes(source);
  if (sources[source].kind === 'image') return { bytes, extension: sources[source].extension };
  if (!archives.has(source)) archives.set(source, readZip(bytes));
  for (const [entry, data] of archives.get(source)) {
    if (entry.split('/').pop() === name)
      return { bytes: data, extension: path.extname(name).slice(1) };
  }
  throw new Error(`${source} has no page ${name}.`);
}

/** The input of an example as a folder mangapress can read, and the pixel size of what is in it. */
async function writeInput(example, directory) {
  const refs = example.input.stack ?? [example.input];
  const pages = await Promise.all(refs.map(page));
  if (!example.input.stack) {
    const { bytes, extension } = pages[0];
    writeFileSync(path.join(directory, `001.${extension}`), bytes);
    const { width, height } = await sharp(bytes).metadata();
    return { width, height };
  }
  const decoded = await Promise.all(
    pages.map(({ bytes }) =>
      sharp(bytes)
        .metadata()
        .then((m) => ({ bytes, ...m })),
    ),
  );
  const width = Math.max(...decoded.map((p) => p.width));
  const height = decoded.reduce((sum, p) => sum + p.height, 0);
  let top = 0;
  const layers = decoded.map((p) => ({
    input: p.bytes,
    left: 0,
    top: ((top += p.height), top - p.height),
  }));
  const strip = await sharp({ create: { width, height, channels: 3, background: '#fff' } })
    .composite(layers)
    .png()
    .toBuffer();
  writeFileSync(path.join(directory, '001.png'), strip);
  return { width, height };
}

function convert(mangapress, input, flags, work) {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  execFileSync(
    mangapress,
    [input, '--profile', base.profile, '--format', base.format, '-o', work, '--quiet', ...flags],
    { stdio: 'pipe' },
  );
  const book = readdirSync(work).find((name) => name.endsWith('.cbz'));
  return [...readZip(readFileSync(path.join(work, book)))]
    .filter(([name]) => /\.(jpe?g|png|gif)$/i.test(name))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, data]) => data);
}

const round = (value, places = 1) => Math.round(value * 10 ** places) / 10 ** places;

async function runExample(mangapress, example, scratch) {
  const input = path.join(scratch, 'input', example.id);
  mkdirSync(input, { recursive: true });
  const sourceSize = await writeInput(example, input);
  const sharedFlags = base.flags.filter((flag) => !(example.without ?? []).includes(flag));
  const variants = [];
  for (const variant of example.variants) {
    const pages = convert(
      mangapress,
      input,
      [...sharedFlags, ...variant.flags],
      path.join(scratch, 'output', example.id, variant.id),
    );
    const picked = pages[example.show ?? 0];
    if (!picked)
      throw new Error(
        `${example.id}/${variant.id}: mangapress made ${pages.length} pages, no page ${example.show ?? 0}.`,
      );
    const { width, height } = await sharp(picked).metadata();
    const entry = {
      id: variant.id,
      label: variant.label,
      flags: variant.flags,
      width,
      height,
      pageBytes: picked.length,
    };
    if (example.kind === 'sizes') {
      entry.keptPercent = round(((width * height) / (sourceSize.width * sourceSize.height)) * 100);
    } else {
      if (example.stats) {
        const channel = (await sharp(picked).grayscale().stats()).channels[0];
        entry.darkest = channel.min;
        entry.mean = round(channel.mean);
      }
      let picture = sharp(picked);
      if (example.zoom)
        picture = picture.extract(example.zoom).resize({ width: PICTURE_WIDTH, kernel: 'nearest' });
      else picture = picture.resize({ width: PICTURE_WIDTH });
      const encoded = await picture
        .webp({ quality: 80, effort: 6 })
        .toBuffer({ resolveWithObject: true });
      entry.file = `${example.id}-${variant.id}.webp`;
      entry.pictureWidth = encoded.info.width;
      entry.pictureHeight = encoded.info.height;
      entry.bytes = encoded.data.length;
      entry.sha256 = sha256(encoded.data);
      writeFileSync(path.join(output, entry.file), encoded.data);
    }
    variants.push(entry);
    console.log(
      `  ${variant.id.padEnd(28)} ${width}x${height}${entry.file ? `  ${entry.bytes} bytes` : ''}`,
    );
  }
  const used = (example.input.stack ?? [example.input]).map((ref) => ref.source);
  return { kind: example.kind, sources: [...new Set(used)], source: sourceSize, variants };
}

const only = process.argv.slice(2);
const wanted = examples.filter((example) => only.length === 0 || only.includes(example.id));
if (wanted.length === 0) throw new Error(`No example is called ${only.join(', ')}.`);
const manifestFile = path.join(output, 'manifest.json');
const previous = existsSync(manifestFile)
  ? JSON.parse(readFileSync(manifestFile, 'utf8'))
  : { examples: {} };
const mangapress = mangapressPath();
mkdirSync(output, { recursive: true });
const scratch = mkdtempSync(path.join(tmpdir(), 'options-gallery-'));
try {
  const made = {};
  for (const example of wanted) {
    console.log(example.id);
    made[example.id] = await runExample(mangapress, example, scratch);
  }
  // Examples that were not asked for keep their entries, so a partial run leaves the rest alone.
  const kept = Object.fromEntries(
    Object.entries(previous.examples).filter(
      ([id]) => examples.some((e) => e.id === id) && !(id in made),
    ),
  );
  const manifest = {
    schema: 1,
    mangapress: pinned,
    base: { profile: base.profile, format: base.format, flags: base.flags },
    examples: Object.fromEntries(
      examples.map((e) => [e.id, made[e.id] ?? kept[e.id]]).filter(([, value]) => value),
    ),
  };
  const prettierOptions = { ...(await resolveConfig(manifestFile)), filepath: manifestFile };
  writeFileSync(manifestFile, await format(JSON.stringify(manifest), prettierOptions));
  // A full run also removes the pictures that no example makes any more.
  if (only.length === 0) {
    const listed = new Set(
      Object.values(manifest.examples).flatMap((e) => e.variants.map((v) => v.file)),
    );
    for (const name of readdirSync(output)) {
      if (name.endsWith('.webp') && !listed.has(name)) rmSync(path.join(output, name));
    }
  }
  console.log(`Wrote ${path.relative(root, manifestFile)} for mangapress ${pinned}.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
