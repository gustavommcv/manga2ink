// A picture that shows what a conversion does to a spread: the spread on top, and under it the pages
// made from it in reading order, each framed as the reader's screen and marked with the number and
// the color of the part of the spread it comes from. A page that was turned is shown as it is read,
// with the device turned, and the arrow says which way. There are no words in it, so the same
// picture serves both languages, and numerals are drawn as paths so that no font changes the file.
import sharp from 'sharp';

export const COLORS = ['#d1495b', '#00798c', '#e0a030'];
const MAT = '#cfcfcf';
const BEZEL = '#2b2b2b';
const SCREEN = '#ececec';
const INK = '#222222';
const MARGIN = 30;
const SOURCE_HEIGHT = 300;
const SCREEN_HEIGHT = 360;
const BEZEL_WIDTH = 10;
const GAP = 40;
const ARROW_SPACE = 70;
const MAX_WIDTH = 1100;
const BADGE = 22;

// Strokes of the digits one to three, in a box of 20 by 28 around the origin.
const DIGITS = {
  1: 'M-4 -9 L1 -14 V14',
  2: 'M-7 -7 C-7 -16 7 -16 7 -7 C7 -1 -7 5 -7 14 H8',
  3: 'M-7 -10 C-5 -16 7 -16 7 -9 C7 -3 0 -1 -2 -1 C0 -1 8 0 8 7 C8 16 -5 16 -8 10',
};

/** A disc in the color of its number, from one to three, with the number drawn in it, centered on (x, y). */
export function badge(number, x, y, radius = BADGE) {
  const scale = radius === BADGE ? '' : ` scale(${radius / BADGE})`;
  return (
    `<circle cx="${x}" cy="${y}" r="${radius + 3}" fill="#fff"/>` +
    `<circle cx="${x}" cy="${y}" r="${radius}" fill="${COLORS[number - 1]}"/>` +
    `<path d="${DIGITS[number]}" transform="translate(${x} ${y})${scale}" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

/** A circular arrow for a device that is turned: clockwise, or its mirror image for counterclockwise. */
function turnArrow(clockwise, x, y) {
  const r = 19;
  const point = (degrees) => [
    r * Math.cos((degrees * Math.PI) / 180),
    r * Math.sin((degrees * Math.PI) / 180),
  ];
  const [x0, y0] = point(140);
  const [x1, y1] = point(320);
  // The head points along the circle at its end, clockwise.
  const tx = -Math.sin((320 * Math.PI) / 180);
  const ty = Math.cos((320 * Math.PI) / 180);
  const head = [
    [x1 + tx * 13, y1 + ty * 13],
    [x1 - ty * 9, y1 + tx * 9],
    [x1 + ty * 9, y1 - tx * 9],
  ]
    .map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`)
    .join(' L');
  return (
    `<circle cx="${x}" cy="${y}" r="${r + 14}" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
    `<g transform="translate(${x} ${y}) scale(${clockwise ? 1 : -1} 1)" fill="${INK}" stroke="${INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none"/>` +
    `<path d="M${head} Z" stroke-width="2"/></g>`
  );
}

/**
 * @param source the spread as it came, an image
 * @param pages the pages mangapress made from it, in order
 * @param flow for each page, `from`: the part of the spread it is made of (`left`, `right`, `whole`, or
 *   a list of parts from top to bottom for a page that stacks two), and, for a page turned on its side,
 *   `turned` (`left` or `right`). Each part gets a number in the order they are named, which is the
 *   number and color it has in the spread and on the page.
 * @param screen the pixel size of the device's screen, upright
 */
export async function flowPicture({ source, pages, flow, screen }) {
  if (pages.length !== flow.length)
    throw new Error(`The flow names ${flow.length} pages and mangapress made ${pages.length}.`);
  const parts = [];
  for (const [page, item] of flow.entries()) {
    for (const region of Array.isArray(item.from) ? item.from : [item.from])
      parts.push({ region, number: parts.length + 1, page });
  }
  if (parts.length > COLORS.length) throw new Error('A flow has more parts than colors.');

  const sourceMeta = await sharp(source).metadata();
  const sourceWidth = Math.round((SOURCE_HEIGHT * sourceMeta.width) / sourceMeta.height);
  const thumb = await sharp(source)
    .flatten({ background: '#fff' })
    .resize({ width: sourceWidth, height: SOURCE_HEIGHT })
    .png()
    .toBuffer();

  const portrait = {
    width: Math.round((SCREEN_HEIGHT * screen.width) / screen.height),
    height: SCREEN_HEIGHT,
  };
  const landscape = { width: portrait.height, height: portrait.width };
  const frames = [];
  for (const [index, page] of pages.entries()) {
    const { turned } = flow[index];
    const area = turned ? landscape : portrait;
    let content = sharp(page).flatten({ background: '#fff' });
    if (turned) content = content.rotate(turned === 'left' ? 90 : -90);
    frames.push({
      area,
      turned,
      image: await content
        .resize({ width: area.width, height: area.height, fit: 'contain', background: SCREEN })
        .png()
        .toBuffer(),
      outer: { width: area.width + 2 * BEZEL_WIDTH, height: area.height + 2 * BEZEL_WIDTH },
    });
  }
  const rowWidth = frames.reduce((sum, f) => sum + f.outer.width, 0) + GAP * (frames.length - 1);
  const rowHeight = portrait.height + 2 * BEZEL_WIDTH;
  // Every picture is as wide as the widest, so that a screen is the same size in all of them.
  const width = Math.max(Math.max(sourceWidth, rowWidth) + 2 * MARGIN, MAX_WIDTH);
  const height = MARGIN + SOURCE_HEIGHT + ARROW_SPACE + rowHeight + MARGIN;
  const sourceLeft = Math.round((width - sourceWidth) / 2);
  const rowTop = MARGIN + SOURCE_HEIGHT + ARROW_SPACE;

  const under = []; // behind the pictures: the bezels and the rings around them
  const over = []; // on top of them: the parts of the spread, the numbers and the arrows
  let left = Math.round((width - rowWidth) / 2);
  for (const [index, frame] of frames.entries()) {
    const top = rowTop + Math.round((rowHeight - frame.outer.height) / 2);
    const stacked = parts.filter((p) => p.page === index).length > 1;
    const ring = stacked ? INK : COLORS[parts.find((p) => p.page === index).number - 1];
    under.push(
      `<rect x="${left - 8}" y="${top - 8}" width="${frame.outer.width + 16}" height="${frame.outer.height + 16}" rx="22" fill="none" stroke="${ring}" stroke-width="6"/>`,
      `<rect x="${left}" y="${top}" width="${frame.outer.width}" height="${frame.outer.height}" rx="16" fill="${BEZEL}"/>`,
    );
    frame.left = left + BEZEL_WIDTH;
    frame.top = top + BEZEL_WIDTH;
    const mine = parts.filter((p) => p.page === index);
    if (stacked) {
      // A page that stacks two parts: each part's number sits on its half of the page.
      mine.forEach((part, i) =>
        over.push(
          badge(
            part.number,
            left + frame.outer.width - 30,
            top + frame.outer.height * ((2 * i + 1) / (2 * mine.length)),
          ),
        ),
      );
    } else {
      over.push(badge(mine[0].number, left + 6, top + 6));
    }
    if (frame.turned)
      over.push(turnArrow(frame.turned === 'left', left + frame.outer.width - 6, top + 6));
    left += frame.outer.width + GAP;
  }

  // The parts of the spread, marked in the color of the page each becomes.
  const halves = parts.some((p) => p.region !== 'whole');
  for (const { region, number } of parts) {
    const color = COLORS[number - 1];
    const x0 = region === 'right' ? sourceWidth / 2 : 0;
    const w = region === 'whole' ? sourceWidth : sourceWidth / 2;
    const inset = region === 'whole' && halves ? 13 : 3;
    over.push(
      `<rect x="${sourceLeft + x0 + inset}" y="${MARGIN + inset}" width="${w - 2 * inset}" height="${SOURCE_HEIGHT - 2 * inset}" fill="${color}" fill-opacity="${region === 'whole' && halves ? 0 : 0.2}" stroke="${color}" stroke-width="6"/>`,
    );
  }
  if (halves) {
    const x = sourceLeft + sourceWidth / 2;
    over.push(
      `<line x1="${x}" y1="${MARGIN}" x2="${x}" y2="${MARGIN + SOURCE_HEIGHT}" stroke="#fff" stroke-width="7"/>`,
      `<line x1="${x}" y1="${MARGIN}" x2="${x}" y2="${MARGIN + SOURCE_HEIGHT}" stroke="${INK}" stroke-width="3" stroke-dasharray="11 9"/>`,
    );
  }
  for (const { region, number } of parts) {
    const x =
      region === 'whole'
        ? width / 2
        : sourceLeft + (region === 'left' ? sourceWidth / 4 : (3 * sourceWidth) / 4);
    over.push(
      badge(number, x, region === 'whole' && halves ? MARGIN + SOURCE_HEIGHT - 36 : MARGIN + 36),
    );
  }
  const arrowTop = MARGIN + SOURCE_HEIGHT + 14;
  over.push(
    `<path d="M${width / 2} ${arrowTop} V${arrowTop + 34} M${width / 2 - 17} ${arrowTop + 20} L${width / 2} ${arrowTop + 40} L${width / 2 + 17} ${arrowTop + 20}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  );

  const svg = (shapes) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shapes.join('')}</svg>`,
    );
  const base = await sharp({ create: { width, height, channels: 3, background: MAT } })
    .composite([
      { input: svg(under), left: 0, top: 0 },
      { input: thumb, left: sourceLeft, top: MARGIN },
      ...frames.map((f) => ({ input: f.image, left: f.left, top: f.top })),
      { input: svg(over), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
  return sharp(base).resize({ width: Math.min(width, MAX_WIDTH) });
}
