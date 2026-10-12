import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

import { $, browser } from '@wdio/globals';

import {
  listZipEntryNames,
  readZipEntry,
  recordProgress,
  reportedProgress,
  resetQueue,
  saveBookAs,
  setFormat,
  setSteps,
} from './support';

const temporaryDirectories: string[] = [];

after(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(name: string, data: Buffer): Buffer {
  const type = Buffer.from(name, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
}

const width = 800;
const height = 1200;

/** A grayscale page with panels, lines and a little noise, so it is not the size of a blank one. */
function page(seed: number): Buffer {
  const scanlines = Buffer.alloc((width + 1) * height);
  let state = seed * 2654435761 + 1;
  for (let y = 0; y < height; y += 1) {
    const row = y * (width + 1);
    for (let x = 0; x < width; x += 1) {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      const panel = ((Math.floor(x / 120) + Math.floor(y / 150) + seed) & 1) * 120;
      const ink = x % 97 < 3 || y % 131 < 3 ? 15 : panel + 80;
      scanlines[row + 1 + x] = Math.min(255, ink + ((state >>> 24) & 15));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 0;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const chapterCount = 6;
const pagesPerChapter = 40;
const pages = chapterCount * pagesPerChapter;

/** A series of one volume of hundreds of pages, named the way mangabind groups it on its own. */
async function writeSeries(root: string): Promise<string> {
  const series = path.join(root, 'Big Manga');
  for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
    const directory = path.join(
      series,
      `Vol.01 Ch.${String(chapter).padStart(4, '0')} - Part ${String(chapter)} (en) [Group]`,
    );
    await mkdir(directory, { recursive: true });
    for (let index = 1; index <= pagesPerChapter; index += 1) {
      await writeFile(
        path.join(directory, `${String(index).padStart(3, '0')}.png`),
        page(chapter * 100 + index),
      );
    }
  }
  return series;
}

const heapUsed = (): Promise<number> =>
  browser.electron.execute(() => process.memoryUsage().heapUsed);

describe('packaged conversion of a volume of hundreds of pages', function () {
  // Making the pages, then converting them, on a slow runner.
  this.timeout(600_000);

  for (const format of ['CBZ', 'EPUB'] as const) {
    it(`makes every page into a ${format}, reports all of them, and does not hold on to them`, async () => {
      const testRoot = await mkdtemp(path.join(os.tmpdir(), 'mangabound-large-volume-e2e-'));
      temporaryDirectories.push(testRoot);
      const series = await writeSeries(testRoot);
      const libraryPath = path.join(testRoot, 'library');
      await mkdir(libraryPath);

      const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
      await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [series] });

      await resetQueue();
      await setSteps({ group: true, convert: true });
      await setFormat(format);
      await $('button=Folder').click();
      await $('span=1 volume').waitForDisplayed({ timeout: 120_000 });
      const before = await heapUsed();

      await recordProgress();
      const started = Date.now();
      await $('button=Process 1 item').click();
      await $('h1=1 book ready').waitForDisplayed({ timeout: 540_000 });
      const seconds = (Date.now() - started) / 1000;
      console.log(`${format}: ${String(pages)} pages in ${seconds.toFixed(1)} s`);

      // Not a benchmark. It takes about ten seconds on a laptop; a slow runner has room, and a volume
      // that took many times what it should would be noticed.
      assert.ok(seconds < 150, `${String(pages)} pages took ${seconds.toFixed(0)} s.`);

      const seen = await reportedProgress();
      const counted = seen.filter(
        (progress) => progress.stage === 'processing' && progress.total !== undefined,
      );
      assert.ok(counted.length > 0, 'The pages should have been counted as they were made.');
      assert.equal(counted.at(-1)?.completed, counted.at(-1)?.total);
      assert.equal(counted.at(-1)?.total, pages);
      // The count only goes up.
      let last = 0;
      for (const progress of counted) {
        const completed = progress.completed ?? 0;
        assert.ok(
          completed >= last,
          `The count went back from ${String(last)} to ${String(completed)}.`,
        );
        last = completed;
      }

      const name = `Big Manga - Vol.01.${format.toLowerCase()}`;
      const saved = path.join(libraryPath, name);
      await saveBookAs(name, saved);
      assert.deepEqual((await readdir(libraryPath)).sort(), ['.mangabound', name]);

      const entries = await listZipEntryNames(saved);
      const images = entries.filter((entry) => /\.(png|jpe?g)$/iu.test(entry));
      if (format === 'CBZ') {
        // Every page, and the same number of them.
        assert.equal(images.length, pages);
      } else {
        // The pages and the cover that is made from the first of them.
        assert.ok(
          images.length >= pages,
          `${String(images.length)} images for ${String(pages)} pages.`,
        );
        const opf = await readZipEntry(saved, (entry) => entry.endsWith('.opf'));
        assert.equal((opf.match(/<itemref /gu) ?? []).length >= pages, true);
      }

      // What a run held while it made hundreds of pages is let go of afterwards.
      const after = await browser.electron.execute(() => {
        globalThis.gc?.();
        return process.memoryUsage().heapUsed;
      });
      assert.ok(
        after - before < 512 * 1024 * 1024,
        `The main process grew by ${String(Math.round((after - before) / 1024 / 1024))} MB.`,
      );
      await resetQueue();
    });
  }
});
