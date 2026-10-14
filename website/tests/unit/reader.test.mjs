import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';

import { readerPicture, screensOf } from '../../scripts/options-gallery/reader.mjs';

test('pages are put in screens by the side each takes: a pair shares one, a lone side leaves the other empty', () => {
  assert.deepEqual(screensOf(['right', 'left', 'right']), [{ right: 0 }, { left: 1, right: 2 }]);
  assert.deepEqual(screensOf(['left', 'right', 'left']), [{ left: 0, right: 1 }, { left: 2 }]);
  assert.deepEqual(screensOf(['center', 'center']), [{ center: 0 }, { center: 1 }]);
  assert.deepEqual(screensOf([]), []);
});

test('a page that is not placed on a side is an error, not a guess', () => {
  assert.throws(() => screensOf(['left', null]), /Page 2 is not placed on a side/);
});

/** A page of one gray. */
const page = (width, height) =>
  sharp({ create: { width, height, channels: 3, background: '#888' } })
    .png()
    .toBuffer();

test('the picture of a book is the same size whichever way it turns', async () => {
  const pages = await Promise.all([page(30, 40), page(30, 41), page(31, 40)]);
  const sizes = [];
  for (const [sides, direction] of [
    [['right', 'left', 'right'], 'rtl'],
    [['left', 'right', 'left'], 'ltr'],
    [['center', 'center', 'center'], 'rtl'],
  ]) {
    const { width, height } = await (await readerPicture({ pages, sides, direction })).metadata();
    sizes.push([width, height]);
  }
  assert.deepEqual(sizes, Array(3).fill([1100, 336]));
});

test('a book whose sides or pages do not agree cannot be drawn', async () => {
  const pages = await Promise.all([page(30, 40), page(30, 40)]);
  await assert.rejects(
    readerPicture({ pages, sides: ['left'], direction: 'ltr' }),
    /cannot be drawn/,
  );
  const four = await Promise.all([1, 2, 3, 4].map(() => page(30, 40)));
  await assert.rejects(
    readerPicture({ pages: four, sides: ['left', 'right', 'left', 'right'], direction: 'ltr' }),
    /cannot be drawn/,
  );
});
