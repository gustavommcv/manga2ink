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
import {
  epubFacts,
  hasComicInfo,
  isPage,
  otherEntries,
  pdfFacts,
  pdfPictures,
} from './options-gallery/book-facts.mjs';
import {
  boxesPicture,
  cropPicture,
  findBox,
  findRemoved,
  gapsPicture,
} from './options-gallery/crop.mjs';
import { flowPicture } from './options-gallery/flow.mjs';
import { histogramPicture } from './options-gallery/histogram.mjs';
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

/** The pages an input is made from, in the order they are used. */
function refsOf(input) {
  return input.slices?.of ?? input.pages ?? input.stack ?? input.beside ?? [input];
}

/** Pages joined into one image: one under the other, or side by side (left to right). */
async function join(refs, beside) {
  const pages = await Promise.all(refs.map(page));
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
  const bytes = await sharp({ create: { width, height, channels: 3, background: '#fff' } })
    .composite(layers)
    .png()
    .toBuffer();
  return { bytes, width, height };
}

const numbered = (index, extension) => `${String(index + 1).padStart(3, '0')}.${extension}`;

/** The ComicInfo.xml of an example: its fields in the order given, with the text escaped. */
function comicInfoXml(fields) {
  const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<ComicInfo>',
    ...Object.entries(fields).map(([name, value]) => `  <${name}>${escape(value)}</${name}>`),
    '</ComicInfo>',
    '',
  ].join('\n');
}

/**
 * The input of an example as a folder mangapress can read: one page; several pages as they are
 * (`pages`); pages joined into a tall strip (`stack`); pages joined side by side into a spread
 * (`beside`, left to right); or a tall strip cut into images of `every` pixels (`slices`), the way a
 * webtoon is handed out. A ComicInfo.xml goes in the folder when the example has one. Returns the
 * pixel size of what is in the folder and the path of its first file.
 */
async function writeInput(example, directory, comicInfo) {
  const { stack, beside, slices } = example.input;
  let made;
  if (slices || stack || beside) {
    const joined = await join(refsOf(example.input), beside !== undefined);
    const { width, height } = joined;
    if (slices) {
      const files = [];
      for (let top = 0; top < height; top += slices.every) {
        const piece = await sharp(joined.bytes)
          .extract({ left: 0, top, width, height: Math.min(slices.every, height - top) })
          .png()
          .toBuffer();
        files.push(path.join(directory, numbered(files.length, 'png')));
        writeFileSync(files.at(-1), piece);
      }
      made = { width, height, file: files[0] };
    } else {
      // `ratio` cuts the middle of a spread to a width of that many heights: a wide first image of
      // a chosen shape.
      const ratio = example.input.ratio;
      const cut = ratio ? Math.round(height * ratio) : width;
      const bytes = ratio
        ? await sharp(joined.bytes)
            .extract({ left: Math.round((width - cut) / 2), top: 0, width: cut, height })
            .png()
            .toBuffer()
        : joined.bytes;
      const file = path.join(directory, '001.png');
      writeFileSync(file, bytes);
      made = { width: cut, height, file };
    }
  } else {
    const pages = await Promise.all(refsOf(example.input).map(page));
    const files = pages.map(({ bytes, extension }, i) => {
      const file = path.join(directory, numbered(i, extension));
      writeFileSync(file, bytes);
      return file;
    });
    const { width, height } = await sharp(pages[0].bytes).metadata();
    made = { width, height, file: files[0] };
  }
  if (comicInfo) writeFileSync(path.join(directory, 'ComicInfo.xml'), comicInfoXml(comicInfo));
  const first = await sharp(made.file).metadata();
  return { ...made, first: { width: first.width, height: first.height } };
}

/** A cover of one's own, written as `cover.<extension>`: a page, or pages joined as for an input. */
async function writeOwnCover(spec, directory) {
  mkdirSync(directory, { recursive: true });
  const { bytes, extension } =
    spec.beside || spec.stack
      ? { bytes: (await join(refsOf(spec), spec.beside !== undefined)).bytes, extension: 'png' }
      : await page(spec);
  const name = `cover.${extension}`;
  const file = path.join(directory, name);
  writeFileSync(file, bytes);
  return { file, name };
}

/** Runs mangapress on a folder and gives the book it wrote: its file name and bytes. */
function makeBook(mangapress, input, flags, work, profile, format) {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  execFileSync(
    mangapress,
    [input, '--profile', profile, '--format', format, '-o', work, '--quiet', ...flags],
    { stdio: 'pipe' },
  );
  const [fileName] = readdirSync(work);
  return { fileName, bytes: readFileSync(path.join(work, fileName)) };
}

/** The pages of a CBZ, in order, with the extension of each (`.extensions`). */
function pagesOf(bytes) {
  const made = [...readZip(bytes)]
    .filter(([name]) => isPage(name))
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const pages = made.map(([, data]) => data);
  pages.extensions = made.map(([name]) => name.split('.').pop().toLowerCase());
  return pages;
}

function convert(mangapress, input, flags, work, profile) {
  return pagesOf(makeBook(mangapress, input, flags, work, profile, base.format).bytes);
}

/** A page converted without enlarging and without loss, so that a crop of it is a piece of it. */
function nativePage(mangapress, input, flags, work, profile, index) {
  const all = combine(base.flags, [...flags, '--forcepng', '--noquantize'], ['--upscale']);
  return pagesOf(makeBook(mangapress, input, all, work, profile, base.format).bytes)[index];
}

/** Writes the picture of a variant as a WebP in the assets folder and records it in the entry. */
async function savePicture(entry, example, variant, picture) {
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

/**
 * What a book says about itself, for the example kind `book`: the values mangapress wrote into it,
 * read back from the file. A value the format has no place for is null.
 */
async function bookFacts(format, book, sourceComicInfo, first) {
  const facts = {
    fileName: book.fileName,
    source: `${first.width} × ${first.height}`,
    title: null,
    author: null,
    language: null,
    direction: null,
    comicInfo: 'none',
    cover: null,
  };
  if (format === 'epub') {
    const files = readZip(book.bytes);
    Object.assign(facts, epubFacts(files.get('OEBPS/content.opf').toString('utf8')));
    if (hasComicInfo([...files.keys()])) throw new Error('An EPUB with a ComicInfo.xml.');
    facts.pages = await pageSizes(
      [...files].filter(([name]) => /^OEBPS\/Images\/c\d+\//.test(name)).map(([, data]) => data),
    );
    facts.cover = await coverFact(files.get('OEBPS/Images/cover.jpg'));
  } else if (format === 'pdf') {
    Object.assign(facts, pdfFacts(book.bytes));
    const { pages, images } = pdfPictures(book.bytes);
    if (images !== pages) throw new Error(`A PDF with ${images} images for ${pages} pages.`);
  } else {
    const files = readZip(book.bytes);
    const extra = otherEntries([...files.keys()]);
    if (extra.length > 0) throw new Error(`A CBZ with more than pages: ${extra.join(', ')}.`);
    const kept = [...files].find(([name]) => name.split('/').pop() === 'ComicInfo.xml');
    if (kept) facts.comicInfo = kept[1].toString('utf8') === sourceComicInfo ? 'copy' : 'changed';
    facts.pages = await pageSizes(pagesOf(book.bytes));
    facts.cover = await coverFact(files.get('##cover.jpg'));
  }
  facts.firstPage = facts.pages?.[0] ?? null;
  return facts;
}

async function pageSizes(pages) {
  const sizes = await Promise.all(pages.map((bytes) => sharp(bytes).metadata()));
  return sizes.map(({ width, height }) => `${width} × ${height}`);
}

/** The size of a book's cover and whether it is in color, or null for a book with none. */
async function coverFact(bytes) {
  if (!bytes) return null;
  const { width, height, channels } = await sharp(bytes).metadata();
  return { width, height, color: channels > 1 };
}

/** The cover image of a book made for the example kind `pictures` with `cover: true`. */
function coverOf(format, bytes) {
  const files = readZip(bytes);
  const cover = files.get(format === 'epub' ? 'OEBPS/Images/cover.jpg' : '##cover.jpg');
  if (!cover) throw new Error(`The ${format} has no cover.`);
  return cover;
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

/**
 * The licence the pictures of an example carry: the one of the page they are made from. When the
 * pages differ, a ShareAlike one wins, because an adaptation of a page under CC BY 4.0 may be
 * shared under CC BY-SA 4.0 and not the other way round; two other licences are not mixed.
 */
function licenceOf(ids) {
  const found = [...new Map(ids.map((id) => [sources[id].license, sources[id]])).values()];
  const shareAlike = found.filter((source) => source.license.includes('-SA'));
  if (shareAlike.length > 1 || (shareAlike.length === 0 && found.length > 1))
    throw new Error(`Cannot tell the licence of pictures made from ${ids.join(', ')}.`);
  const chosen = shareAlike[0] ?? found[0];
  return { license: chosen.license, licenseUrl: chosen.licenseUrl };
}

/**
 * A folder holding the input of an example. A book is named after its folder, so an example that
 * shows a file name gives it one (`name`); `withInfo` puts the example's ComicInfo.xml in it.
 */
async function prepareInput(example, scratch, withInfo) {
  const directory = path.join(
    scratch,
    'input',
    example.id,
    withInfo ? 'with-info' : 'without-info',
    example.name ?? example.id,
  );
  mkdirSync(directory, { recursive: true });
  return { directory, ...(await writeInput(example, directory, withInfo && example.comicInfo)) };
}

async function runExample(mangapress, example, scratch) {
  const withInfo = example.comicInfo !== undefined;
  const sourceSize = await prepareInput(example, scratch, withInfo);
  const withoutInfo = example.variants.some((variant) => variant.noComicInfo)
    ? await prepareInput(example, scratch, false)
    : undefined;
  const all = example.show === 'all';
  const variants = [];
  // For the pictures of what cropping keeps: the page converted without cropping, and where the crop of
  // each variant sits in it.
  const cropping = example.crop ?? example.boxes;
  const native = (name, flags) =>
    nativePage(
      mangapress,
      sourceSize.directory,
      flags,
      path.join(scratch, 'native', example.id, name),
      example.profile ?? base.profile,
      example.show ?? 0,
    );
  const reference = cropping ? native('reference', cropping.reference) : undefined;
  const referenceSize = reference ? await sharp(reference).metadata() : undefined;
  const boxOf = new Map();
  if (example.crop)
    for (const variant of example.variants)
      boxOf.set(variant.id, await findBox(reference, native(variant.id, variant.flags)));
  // For the pictures of the gaps cut out of a page: the page of each variant, and which of its rows and
  // columns the variants took out of one another (`gaps.rows` and `gaps.columns` name the page that was
  // cut and the page that is left).
  const gapPages = new Map();
  const gapsOf = new Map();
  if (example.gaps) {
    for (const variant of example.variants)
      gapPages.set(variant.id, native(variant.id, variant.flags));
    const found = (axis, pair) =>
      pair ? findRemoved(gapPages.get(pair[0]), gapPages.get(pair[1]), axis) : [];
    for (const variant of example.variants)
      gapsOf.set(variant.id, {
        rows: await found('rows', variant.gaps?.rows),
        columns: await found('columns', variant.gaps?.columns),
      });
  }
  // For the pictures of the tones of a page: the page converted without the correction, to count the
  // tones of it as well.
  const toneReference = example.histogram
    ? convert(
        mangapress,
        sourceSize.directory,
        combine(base.flags, example.histogram.reference, example.without ?? []),
        path.join(scratch, 'output', example.id, 'reference'),
        example.profile ?? base.profile,
      )[example.show ?? 0]
    : undefined;
  for (const variant of example.variants) {
    const entry = { id: variant.id, label: variant.label, flags: variant.flags ?? [] };
    // A variant may have an input of its own, such as a wide first image for the cover.
    const source = variant.input
      ? await prepareInput(
          { ...example, id: `${example.id}-${variant.id}`, input: variant.input },
          scratch,
          withInfo && !variant.noComicInfo,
        )
      : variant.noComicInfo
        ? withoutInfo
        : sourceSize;
    const input = source.directory;
    const format = variant.format ?? example.format ?? base.format;
    const profile = variant.profile ?? example.profile ?? base.profile;
    // A cover of one's own is a file named on the command line, as `--cover cover.jpg`.
    const ownCover = variant.ownCover
      ? await writeOwnCover(variant.ownCover, path.join(scratch, 'covers', example.id, variant.id))
      : undefined;
    if (ownCover) entry.flags = [...entry.flags, '--cover', ownCover.name];
    const flags = variant.original
      ? []
      : [
          ...combine(base.flags, variant.flags, [
            ...(example.without ?? []),
            ...(variant.without ?? []),
          ]),
          ...(ownCover ? ['--cover', ownCover.file] : []),
        ];
    if (example.boxes) {
      // One picture for the whole example: the part kept by each setting, one inside the other.
      const settings = [];
      for (const [index, setting] of example.boxes.settings.entries())
        settings.push({
          label: setting.label,
          box: await findBox(reference, native(`setting-${index}`, setting.flags)),
        });
      await savePicture(
        entry,
        example,
        variant,
        await boxesPicture({
          source: readFileSync(source.file),
          size: referenceSize,
          boxes: settings,
        }),
      );
      entry.plain = true;
      entry.width = referenceSize.width;
      entry.height = referenceSize.height;
      entry.pageBytes = 0;
      variants.push(entry);
      console.log(
        `  ${variant.id.padEnd(28)} ${settings.map((b) => `${b.label}: ${b.box.width}x${b.box.height}`).join(', ')}`,
      );
      continue;
    }
    if (example.kind === 'book') {
      const work = path.join(scratch, 'output', example.id, variant.id);
      const book = makeBook(mangapress, input, flags, work, profile, format);
      const given = withInfo && !variant.noComicInfo ? comicInfoXml(example.comicInfo) : undefined;
      entry.format = format;
      entry.profile = profile;
      entry.facts = await bookFacts(format, book, given, source.first);
      variants.push(entry);
      console.log(`  ${variant.id.padEnd(28)} ${JSON.stringify(entry.facts)}`);
      continue;
    }
    let pages;
    if (variant.original) {
      entry.original = true;
      pages = [readFileSync(source.file)];
    } else if (example.cover) {
      // The picture is the book's cover, not a page.
      pages = [
        coverOf(
          format,
          makeBook(
            mangapress,
            input,
            flags,
            path.join(scratch, 'output', example.id, variant.id),
            profile,
            format,
          ).bytes,
        ),
      ];
      pages.extensions = ['jpg'];
    } else {
      pages = convert(
        mangapress,
        input,
        flags,
        path.join(scratch, 'output', example.id, variant.id),
        profile,
      );
    }
    const extension = (pages.extensions ?? [sourceSize.file.split('.').pop()])[example.show ?? 0];
    const picked = all ? pages : [pages[example.show ?? 0]];
    if (picked.some((bytes) => !bytes))
      throw new Error(
        `${example.id}/${variant.id}: mangapress made ${pages.length} pages, no page ${example.show}.`,
      );
    const sizes = await Promise.all(picked.map((bytes) => sharp(bytes).metadata()));
    entry.width = sizes[0].width;
    entry.height = sizes[0].height;
    entry.pageBytes = picked.reduce((sum, bytes) => sum + bytes.length, 0);
    if (example.kind === 'files') {
      entry.fileType = ['jpg', 'jpeg'].includes(extension) ? 'JPEG' : extension.toUpperCase();
      entry.sameAsInput = sha256(picked[0]) === sha256(readFileSync(sourceSize.file));
    }
    if (all)
      entry.pages = sizes.map((size, i) => ({
        width: size.width,
        height: size.height,
        bytes: picked[i].length,
      }));
    if (example.kind === 'sizes' || example.kind === 'files') {
      if (example.kind === 'sizes')
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
      if (variant.flow)
        picture = await flowPicture({
          source: readFileSync(source.file),
          pages: picked,
          flow: variant.flow,
          screen: example.flowScreen,
        });
      else if (example.crop)
        picture = await cropPicture({
          source: readFileSync(source.file),
          size: referenceSize,
          box: boxOf.get(variant.id),
          compare: variant.compare ? boxOf.get(variant.compare) : undefined,
          result: picked[0],
          screen: example.crop.screen,
        });
      else if (example.gaps)
        picture = await gapsPicture({
          source: gapPages.get(example.gaps.reference),
          size: await sharp(gapPages.get(example.gaps.reference)).metadata(),
          ...gapsOf.get(variant.id),
          result: gapPages.get(variant.id),
        });
      else if (example.histogram)
        picture = await histogramPicture({ page: picked[0], reference: toneReference });
      else if (all) picture = await row(picked);
      else if (example.zoom)
        picture = sharp(picked[0])
          .extract(example.zoom)
          .resize({ width: PICTURE_WIDTH, kernel: 'nearest' });
      else if (example.screen && !variant.original)
        picture = await onScreen(picked[0], example.screen);
      else picture = sharp(picked[0]).resize({ width: PICTURE_WIDTH });
      await savePicture(entry, example, variant, picture);
    }
    variants.push(entry);
    const shape = all
      ? sizes.map((s) => `${s.width}x${s.height}`).join(' + ')
      : `${entry.width}x${entry.height}`;
    console.log(`  ${variant.id.padEnd(28)} ${shape}${entry.file ? `  ${entry.bytes} bytes` : ''}`);
  }
  const used = [
    ...new Set(
      [
        example.input,
        ...example.variants.flatMap((variant) => [variant.input, variant.ownCover]).filter(Boolean),
      ]
        .flatMap(refsOf)
        .map((ref) => ref.source),
    ),
  ];
  return {
    kind: example.kind,
    layout: example.layout ?? (all ? 'rows' : 'grid'),
    sources: used,
    ...licenceOf(used),
    source: { width: sourceSize.width, height: sourceSize.height },
    ...(example.screen ? { screen: example.screen, screenLabel: example.screenLabel } : {}),
    ...(example.columns ? { columns: example.columns } : {}),
    variants,
  };
}

/** What goes next to the pictures, so that whoever has the files and not the site can read it. */
function licencesFile(manifest) {
  const rows = Object.entries(manifest.examples)
    .filter(([, example]) => example.variants.some((variant) => variant.file))
    .map(([id, example]) => {
      const made = example.sources
        .map(
          (source) =>
            `[${sources[source].title}](${sources[source].page}) by ${sources[source].author}`,
        )
        .join('; ');
      return `| \`${id}-*.webp\` | ${made} | [${example.license}](${example.licenseUrl}) |`;
    });
  return [
    '# Licences of these pictures',
    '',
    'The pictures in this folder are adaptations of pages of comics whose authors allow them to be copied and adapted.',
    'Each keeps the licence of the page it was made from, **not the MIT licence of this repository**, and must be',
    'credited as below wherever it is shared. They were converted, resized and saved again by mangapress',
    `${manifest.mangapress}; some are magnified details, some join several pages side by side or one under the other, and on the spreads page the pages are placed in frames with numbers and arrows drawn for the guide.`,
    'The pages are listed with their download addresses and checksums in `website/media-src/options/sources.json`.',
    'This file is written by `npm run site:options`.',
    '',
    '| Pictures | Made from | Licence |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
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
  const licencesPath = path.join(output, 'LICENSES.md');
  writeFileSync(
    licencesPath,
    await format(licencesFile(manifest), {
      ...(await resolveConfig(licencesPath)),
      filepath: licencesPath,
    }),
  );
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
