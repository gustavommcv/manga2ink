// A picture that shows what a tone correction does to a page: the page, and next to it how many of its
// pixels have each tone, from black on the left to white on the right, as bars; a dashed line follows the
// bars of the page as it is without the correction, so that what moved is seen. A bar that does not fit
// is broken. There are no words in it, so the same picture serves both languages.
import sharp from 'sharp';

const MAT = '#cfcfcf';
const INK = '#222222';
const BARS_COLOR = '#00798c';
const WIDTH = 800;
const MARGIN = 30;
const PAGE_HEIGHT = 280;
const PLOT_WIDTH = 440;
const PLOT_HEIGHT = 250;
const GAP = 60;
// The 256 levels of tone are shown as 64 bars of 4 levels.
const LEVELS_PER_BAR = 4;
// The share of the page, in percent, that a bar can show; one that holds more is cut and broken.
const CEILING = 14;

/** The share of the page, in percent, that has each group of tones, from black to white. */
export async function toneShares(page) {
  const { data } = await sharp(page).grayscale().raw().toBuffer({ resolveWithObject: true });
  const bars = new Array(256 / LEVELS_PER_BAR).fill(0);
  for (const level of data) bars[Math.floor(level / LEVELS_PER_BAR)]++;
  return bars.map((count) => (100 * count) / data.length);
}

/**
 * The page with the tones of its pixels counted next to it, and the count of `reference`, the page
 * without the correction, as a dashed line over it.
 */
export async function histogramPicture({ page, reference }) {
  const shares = await toneShares(page);
  const before = await toneShares(reference);
  const meta = await sharp(page).metadata();
  const pageWidth = Math.round((PAGE_HEIGHT * meta.width) / meta.height);
  const left = Math.round((WIDTH - (pageWidth + GAP + PLOT_WIDTH)) / 2);
  const plotLeft = left + pageWidth + GAP;
  const bar = PLOT_WIDTH / shares.length;
  const base = MARGIN + PLOT_HEIGHT;
  const height = (share) => (Math.min(share, CEILING) / CEILING) * PLOT_HEIGHT;
  const shapes = [
    '<defs><linearGradient id="tones"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>',
  ];
  for (const [i, share] of shares.entries())
    shapes.push(
      `<rect x="${plotLeft + i * bar}" y="${base - height(share)}" width="${bar - 0.6}" height="${height(share)}" fill="${BARS_COLOR}"/>`,
    );
  // A broken bar has a slanted gap across it, in the color of the mat.
  const gapTop = MARGIN + PLOT_HEIGHT * 0.3;
  for (const [i, share] of shares.entries()) {
    if (share <= CEILING) continue;
    const x = plotLeft + i * bar;
    shapes.push(
      `<path d="M${x - 1} ${gapTop + 8} L${x + bar + 0.4} ${gapTop} V${gapTop + 8} L${x - 1} ${gapTop + 16} Z" fill="${MAT}"/>`,
    );
  }
  const outline = before
    .map((share, i) => {
      const y = base - height(share);
      return `${i === 0 ? 'M' : 'L'}${plotLeft + i * bar} ${y} L${plotLeft + (i + 1) * bar} ${y}`;
    })
    .join(' ');
  shapes.push(
    `<path d="${outline}" fill="none" stroke="#fff" stroke-width="4.5"/>`,
    `<path d="${outline}" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="6 4"/>`,
    `<line x1="${plotLeft}" y1="${base}" x2="${plotLeft + PLOT_WIDTH}" y2="${base}" stroke="${INK}" stroke-width="2"/>`,
    `<rect x="${plotLeft}" y="${base + 8}" width="${PLOT_WIDTH}" height="${PAGE_HEIGHT - PLOT_HEIGHT - 8}" fill="url(#tones)" stroke="${INK}" stroke-width="1.5"/>`,
    `<rect x="${left}" y="${MARGIN}" width="${pageWidth}" height="${PAGE_HEIGHT}" fill="none" stroke="${INK}" stroke-width="2"/>`,
  );
  const thumb = await sharp(page)
    .flatten({ background: '#fff' })
    .resize({ width: pageWidth, height: PAGE_HEIGHT })
    .png()
    .toBuffer();
  const canvasHeight = MARGIN * 2 + PAGE_HEIGHT;
  const drawing = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${canvasHeight}">${shapes.join('')}</svg>`,
  );
  return sharp(
    await sharp({ create: { width: WIDTH, height: canvasHeight, channels: 3, background: MAT } })
      .composite([
        { input: thumb, left, top: MARGIN },
        { input: drawing, left: 0, top: 0 },
      ])
      .png()
      .toBuffer(),
  );
}
