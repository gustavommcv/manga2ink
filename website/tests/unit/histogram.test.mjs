import assert from 'node:assert/strict';
import test from 'node:test';

import sharp from 'sharp';

import { histogramPicture, toneShares } from '../../scripts/options-gallery/histogram.mjs';

/** A gray PNG of one row of pixel values. */
const row = (values) =>
  sharp(Buffer.from(values), { raw: { width: values.length, height: 1, channels: 1 } })
    .png()
    .toBuffer();

test('the tones of a page are counted in groups of four, as a share of the page', async () => {
  const shares = await toneShares(await row([0, 3, 4, 255]));
  assert.equal(shares.length, 64);
  assert.equal(shares[0], 50);
  assert.equal(shares[1], 25);
  assert.equal(shares[63], 25);
  assert.equal(
    shares.reduce((sum, share) => sum + share, 0),
    100,
  );
});

test('a page in color is counted by its gray', async () => {
  const white = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } })
    .png()
    .toBuffer();
  assert.equal((await toneShares(white))[63], 100);
});

test('the picture of a page and of the page without the correction is a fixed size', async () => {
  const gray = await sharp(Buffer.from(Array.from({ length: 30 * 40 }, (_, i) => i % 256)), {
    raw: { width: 30, height: 40, channels: 1 },
  })
    .png()
    .toBuffer();
  const { width, height } = await (
    await histogramPicture({ page: gray, reference: gray })
  ).metadata();
  assert.deepEqual([width, height], [800, 340]);
  // A page that is all white is one bar that holds more than the ceiling, which is broken.
  const white = await sharp({ create: { width: 30, height: 40, channels: 3, background: '#fff' } })
    .png()
    .toBuffer();
  const broken = await histogramPicture({ page: white, reference: gray });
  assert.deepEqual([(await broken.metadata()).width, (await broken.metadata()).height], [800, 340]);
});
