import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';

import { findBox, findRemoved } from '../../scripts/options-gallery/crop.mjs';

/** A gray PNG from rows of pixel values. */
function picture(rows) {
  const height = rows.length;
  const width = rows[0].length;
  return sharp(Buffer.from(rows.flat()), { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

const transpose = (rows) => rows[0].map((_, x) => rows.map((row) => row[x]));

/** The rows of a page: a blank row is all 255, a row of ink is not, and no two rows of ink are alike. */
const rowsOf = (kinds) =>
  kinds.map((kind, y) =>
    Array.from({ length: 5 }, (_, x) => (kind === 'blank' ? 255 : (y * 7 + x * 3) % 200)),
  );

test('the rows taken out of a page are found, and a gap of blank rows is put in the middle of its run', async () => {
  const whole = rowsOf([
    'ink',
    'ink',
    'blank',
    'blank',
    'blank',
    'blank',
    'blank',
    'blank',
    'ink',
    'ink',
  ]);
  const part = [0, 1, 2, 3, 8, 9].map((y) => whole[y]);
  assert.deepEqual(await findRemoved(await picture(whole), await picture(part), 'rows'), [[3, 7]]);
});

test('a drawn row that was taken out is found where it is, and gaps that touch are one', async () => {
  const kinds = ['ink', 'blank', 'blank', 'blank', 'ink', 'blank', 'blank', 'ink'];
  const whole = rowsOf(kinds);
  const part = [whole[0], whole[1], whole[2], whole[7]];
  assert.deepEqual(await findRemoved(await picture(whole), await picture(part), 'rows'), [
    [2, 3],
    [4, 7],
  ]);
});

test('the columns taken out of a page are found the same way', async () => {
  const kinds = ['ink', 'blank', 'blank', 'blank', 'ink', 'blank', 'blank', 'ink'];
  const whole = rowsOf(kinds);
  const part = [whole[0], whole[1], whole[2], whole[7]];
  assert.deepEqual(
    await findRemoved(await picture(transpose(whole)), await picture(transpose(part)), 'columns'),
    [
      [2, 3],
      [4, 7],
    ],
  );
});

test('nothing taken out is no gap', async () => {
  const whole = await picture(rowsOf(['ink', 'blank', 'ink']));
  assert.deepEqual(await findRemoved(whole, whole, 'rows'), []);
});

test('a page that is not the other with lines taken out is an error, not a guess', async () => {
  const whole = await picture(rowsOf(['ink', 'blank', 'ink']));
  const other = await picture(rowsOf(['ink', 'ink']).map((row) => row.map((value) => 255 - value)));
  await assert.rejects(findRemoved(whole, other, 'rows'), /are not in the page of 5x3/);
  const wider = await picture(rowsOf(['ink']).map((row) => [...row, 1]));
  await assert.rejects(
    findRemoved(whole, wider, 'rows'),
    /is not a page of 5x3 with rows taken out/,
  );
  await assert.rejects(
    findRemoved(whole, wider, 'columns'),
    /is not a page of 5x3 with columns taken out/,
  );
});

test('where a cropped page sits in the page it was cut from is found exactly', async () => {
  const whole = Array.from({ length: 9 }, (_, y) =>
    Array.from({ length: 9 }, (_, x) => (x * 31 + y * 17) % 251),
  );
  const piece = whole.slice(3, 6).map((row) => row.slice(2, 6));
  assert.deepEqual(await findBox(await picture(whole), await picture(piece)), {
    x: 2,
    y: 3,
    width: 4,
    height: 3,
  });
});

test('a page that is not a piece of the other is an error', async () => {
  const whole = await picture(
    Array.from({ length: 6 }, (_, y) =>
      Array.from({ length: 6 }, (_, x) => (x * 31 + y * 17) % 251),
    ),
  );
  const unlike = await picture(Array.from({ length: 3 }, () => Array(3).fill(7)));
  await assert.rejects(findBox(whole, unlike), /was not found in the page of 6x6/);
  const bigger = await picture(Array.from({ length: 7 }, () => Array(7).fill(7)));
  await assert.rejects(findBox(whole, bigger), /is not a piece of one of 6x6/);
});
