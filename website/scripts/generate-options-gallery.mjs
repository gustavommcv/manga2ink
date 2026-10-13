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
const ROW_HEIGHT = 560;
const ROW_GAP = 14;
const ROW_WIDTH_LIMIT = 1100;

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

/**
 * The input of an example as a folder mangapress can read: one page, pages joined into a tall strip
 * (`stack`) or pages joined side by side into a spread (`beside`, left to right). Returns the pixel
 * size of what is in the folder and the path of the file.
 */
async function writeInput(example, directory) {
  const { stack, beside } = example.input;
  const refs = stack ?? beside ?? [example.input];
  const pages = await Promise.all(refs.map(page));
  if (!stack && !beside) {
    const { bytes, extension } = pages[0];
    const file = path.join(directory, `001.${extension}`);
    writeFileSync(file, bytes);
    const { width, height } = await sharp(bytes).metadata();
    return { width, height, file };
  }
  const decoded = await Promise.all(
    pages.map(({ bytes }) =>
      sharp(bytes)
        .metadata()
        .then((m) => ({ bytes, ...m })),
    ),
  );
  const width = beside
    ? decoded.reduce((sum, p) => sum + p.width, 0)
    : Math.max(...decoded.map((p) => p.width));
  const height = beside
    ? Math.max(...decoded.map((p) => p.height))
    : decoded.reduce((sum, p) => sum + p.height, 0);
  let offset = 0;
  const layers = decoded.map((p) => {
    const at = offset;
    offset += beside ? p.width : p.height;
    return { input: p.bytes, left: beside ? at : 0, top: beside ? 0 : at };
  });
  const joined = await sharp({ create: { width, height, channels: 3, background: '#fff' } })
    .composite(layers)
    .png()
    .toBuffer();
  const file = path.join(directory, '001.png');
  writeFileSync(file, joined);
  return { width, height, file };
}

function convert(mangapress, input, flags, work, profile) {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  execFileSync(
    mangapress,
    [input, '--profile', profile, '--format', base.format, '-o', work, '--quiet', ...flags],
    { stdio: 'pipe' },
  );
  const book = readdirSync(work).find((name) => name.endsWith('.cbz'));
  return [...readZip(readFileSync(path.join(work, book)))]
    .filter(([name]) => /\.(jpe?g|png|gif)$/i.test(name))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, data]) => data);
}

const round = (value, places = 1) => Math.round(value * 10 ** places) / 10 ** places;

/** Pages side by side at one height on a gray mat, the way a reader turns through them. */
async function row(pages) {
  const tiles = await Promise.all(
    pages.map((bytes) =>
      sharp(bytes).flatten({ background: '#fff' }).resize({ height: ROW_HEIGHT }).png().toBuffer(),
    ),
  );
  const widths = await Promise.all(tiles.map(async (tile) => (await sharp(tile).metadata()).width));
  const total = widths.reduce((sum, w) => sum + w, 0) + ROW_GAP * (tiles.length + 1);
  let left = ROW_GAP;
  const layers = tiles.map((input, i) => {
    const layer = { input, left, top: ROW_GAP };
    left += widths[i] + ROW_GAP;
    return layer;
  });
  const mat = await sharp({
    create: { width: total, height: ROW_HEIGHT + 2 * ROW_GAP, channels: 3, background: '#cfcfcf' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  return sharp(mat).resize({ width: Math.min(total, ROW_WIDTH_LIMIT) });
}

/**
 * The flags of a run: Mangabound's starting ones, without those the example or variant takes out and
 * without those the variant sets again (mangapress refuses a flag given twice), then the variant's.
 */
function combine(shared, own, without) {
  const groups = [];
  for (const token of shared) {
    if (token.startsWith('--') || groups.length === 0) groups.push([token]);
    else groups.at(-1).push(token);
  }
  const named = (group) => group[0];
  const set = new Set(own.filter((token) => token.startsWith('--')));
  return [
    ...groups.filter((group) => !without.includes(named(group)) && !set.has(named(group))).flat(),
    ...own,
  ];
}

/** The page as the reader would hold it: centered on the screen's own size, on a gray mat. */
async function onScreen(bytes, screen) {
  const page = await sharp(bytes).flatten({ background: '#fff' }).toBuffer();
  const { width, height } = await sharp(page).metadata();
  const canvas = await sharp({
    create: { width: screen.width, height: screen.height, channels: 3, background: '#bdbdbd' },
  })
    .composite([
      {
        input: page,
        left: Math.max(0, Math.round((screen.width - width) / 2)),
        top: Math.max(0, Math.round((screen.height - height) / 2)),
      },
    ])
    .png()
    .toBuffer();
  return sharp(canvas).resize({ width: PICTURE_WIDTH });
}

async function runExample(mangapress, example, scratch) {
  const input = path.join(scratch, 'input', example.id);
  mkdirSync(input, { recursive: true });
  const sourceSize = await writeInput(example, input);
  const all = example.show === 'all';
  const variants = [];
  for (const variant of example.variants) {
    const entry = { id: variant.id, label: variant.label, flags: variant.flags ?? [] };
    let pages;
    if (variant.original) {
      entry.original = true;
      pages = [readFileSync(sourceSize.file)];
    } else {
      const flags = combine(base.flags, variant.flags, [
        ...(example.without ?? []),
        ...(variant.without ?? []),
      ]);
      pages = convert(
        mangapress,
        input,
        flags,
        path.join(scratch, 'output', example.id, variant.id),
        example.profile ?? base.profile,
      );
    }
    const picked = all ? pages : [pages[example.show ?? 0]];
    if (picked.some((bytes) => !bytes))
      throw new Error(
        `${example.id}/${variant.id}: mangapress made ${pages.length} pages, no page ${example.show}.`,
      );
    const sizes = await Promise.all(picked.map((bytes) => sharp(bytes).metadata()));
    entry.width = sizes[0].width;
    entry.height = sizes[0].height;
    entry.pageBytes = picked.reduce((sum, bytes) => sum + bytes.length, 0);
    if (all)
      entry.pages = sizes.map((size, i) => ({
        width: size.width,
        height: size.height,
        bytes: picked[i].length,
      }));
    if (example.kind === 'sizes') {
      entry.keptPercent = round(
        ((entry.width * entry.height) / (sourceSize.width * sourceSize.height)) * 100,
      );
    } else {
      if (example.stats) {
        const channel = (await sharp(picked[0]).grayscale().stats()).channels[0];
        entry.darkest = channel.min;
        entry.mean = round(channel.mean);
      }
      let picture;
      if (all) picture = await row(picked);
      else if (example.zoom)
        picture = sharp(picked[0])
          .extract(example.zoom)
          .resize({ width: PICTURE_WIDTH, kernel: 'nearest' });
      else if (example.screen) picture = await onScreen(picked[0], example.screen);
      else picture = sharp(picked[0]).resize({ width: PICTURE_WIDTH });
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
    const shape = all
      ? sizes.map((s) => `${s.width}x${s.height}`).join(' + ')
      : `${entry.width}x${entry.height}`;
    console.log(`  ${variant.id.padEnd(28)} ${shape}${entry.file ? `  ${entry.bytes} bytes` : ''}`);
  }
  const refs = example.input.stack ?? example.input.beside ?? [example.input];
  return {
    kind: example.kind,
    layout: all ? 'rows' : 'grid',
    sources: [...new Set(refs.map((ref) => ref.source))],
    source: { width: sourceSize.width, height: sourceSize.height },
    ...(example.screen ? { screen: example.screen, screenLabel: example.screenLabel } : {}),
    variants,
  };
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
