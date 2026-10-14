// A picture that shows where the pages of a book sit in a reader that shows two pages side by side: the
// screens in the order they are read, each with a left half and a right half, the pages placed in them by
// the side the book's package file gives each, and an arrow for the direction the book turns. The first
// screen is at the end the arrow starts from, so a book that turns right to left reads from the right. A
// half with no page is left empty, and a page that is alone and centered fills a screen. There are no
// words in it, so the same picture serves both languages.
import sharp from 'sharp';

import { badge, COLORS } from './flow.mjs';

const MAT = '#cfcfcf';
const BEZEL = '#2b2b2b';
const SCREEN = '#ececec';
const EMPTY = '#d6d6d6';
const GUTTER = '#b4b4b4';
const INK = '#222222';
const WIDTH = 1100;
const MARGIN = 30;
const BEZEL_WIDTH = 10;
const HALF = 150;
const INNER_HEIGHT = 196;
const TILE_HEIGHT = 168;
const SCREEN_WIDTH = 2 * HALF + 2 * BEZEL_WIDTH;
const SCREEN_HEIGHT = INNER_HEIGHT + 2 * BEZEL_WIDTH;
const GAP = 36;
const ARROW_DROP = 36;
const BADGE_RADIUS = 15;

/**
 * The screens of a reader in two-page view, in reading order, given the side each page takes (`'left'`,
 * `'right'` or `'center'`, one for each page in order): a left page and the right page after it share
 * a screen, a page on one side alone leaves the other side empty, and a centered page is alone. Each
 * screen says which page (by index) is on which side: `{ left, right }` or `{ center }`.
 */
export function screensOf(sides) {
  const screens = [];
  for (let i = 0; i < sides.length; i++) {
    if (sides[i] === 'center') screens.push({ center: i });
    else if (sides[i] === 'left') {
      const pair = sides[i + 1] === 'right';
      screens.push(pair ? { left: i, right: i + 1 } : { left: i });
      if (pair) i++;
    } else if (sides[i] === 'right') screens.push({ right: i });
    else throw new Error(`Page ${i + 1} is not placed on a side.`);
  }
  return screens;
}

/** The arrow of the direction the book turns, from `from` to `to` (x), with a dot where it starts. */
function turnArrow(from, to, y) {
  const head = Math.sign(to - from) * 16;
  return (
    `<path d="M${from} ${y} H${to} M${to - head} ${y - 15} L${to} ${y} L${to - head} ${y + 15}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${from}" cy="${y}" r="8" fill="${INK}"/>`
  );
}

/**
 * The pages of a book (their image files, in order) placed in the screens of a two-page view by `sides`,
 * for a book that turns in `direction` (`'ltr'` or `'rtl'`).
 */
export async function readerPicture({ pages, sides, direction }) {
  if (pages.length !== sides.length || pages.length > COLORS.length)
    throw new Error(`A book of ${pages.length} pages with ${sides.length} sides cannot be drawn.`);
  const screens = screensOf(sides);
  const metas = await Promise.all(pages.map((bytes) => sharp(bytes).metadata()));
  const tiles = metas.map((meta) => ({
    width: Math.min(Math.round((TILE_HEIGHT * meta.width) / meta.height), HALF - 8),
    height: TILE_HEIGHT,
  }));
  const rowWidth = screens.length * SCREEN_WIDTH + (screens.length - 1) * GAP;
  const left = Math.round((WIDTH - rowWidth) / 2);
  const height = MARGIN * 2 + SCREEN_HEIGHT + ARROW_DROP + 24;
  // The first screen is where the book starts: at the right when it turns right to left.
  const slots = direction === 'rtl' ? [...screens].reverse() : screens;
  const under = [];
  const over = [];
  const layers = [];
  for (const [position, screen] of slots.entries()) {
    const x = left + position * (SCREEN_WIDTH + GAP);
    const inner = { x: x + BEZEL_WIDTH, y: MARGIN + BEZEL_WIDTH };
    under.push(
      `<rect x="${x}" y="${MARGIN}" width="${SCREEN_WIDTH}" height="${SCREEN_HEIGHT}" rx="16" fill="${BEZEL}"/>`,
      `<rect x="${inner.x}" y="${inner.y}" width="${2 * HALF}" height="${INNER_HEIGHT}" rx="5" fill="${SCREEN}"/>`,
    );
    if (screen.center === undefined) {
      for (const [side, offset] of [
        ['left', 0],
        ['right', HALF],
      ])
        if (screen[side] === undefined)
          under.push(
            `<rect x="${inner.x + offset}" y="${inner.y}" width="${HALF}" height="${INNER_HEIGHT}" fill="${EMPTY}"/>`,
          );
      under.push(
        `<line x1="${inner.x + HALF}" y1="${inner.y}" x2="${inner.x + HALF}" y2="${inner.y + INNER_HEIGHT}" stroke="${GUTTER}" stroke-width="2"/>`,
      );
    }
    const placed =
      screen.center === undefined
        ? ['left', 'right'].filter((side) => screen[side] !== undefined)
        : ['center'];
    for (const side of placed) {
      const index = screen[side];
      const tile = tiles[index];
      const middle =
        inner.x + (side === 'center' ? HALF : side === 'left' ? HALF / 2 : (3 * HALF) / 2);
      const tileX = Math.round(middle - tile.width / 2);
      const tileY = inner.y + Math.round((INNER_HEIGHT - tile.height) / 2);
      layers.push({
        input: await sharp(pages[index])
          .flatten({ background: '#fff' })
          .resize({ width: tile.width, height: tile.height, fit: 'fill' })
          .png()
          .toBuffer(),
        left: tileX,
        top: tileY,
      });
      over.push(
        `<rect x="${tileX - 1}" y="${tileY - 1}" width="${tile.width + 2}" height="${tile.height + 2}" fill="none" stroke="${COLORS[index]}" stroke-width="4"/>`,
        badge(index + 1, tileX + 8, tileY + 8, BADGE_RADIUS),
      );
    }
  }
  const arrowY = MARGIN + SCREEN_HEIGHT + ARROW_DROP;
  over.push(
    direction === 'rtl'
      ? turnArrow(left + rowWidth - 24, left + 24, arrowY)
      : turnArrow(left + 24, left + rowWidth - 24, arrowY),
  );
  const drawing = (shapes) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}">${shapes.join('')}</svg>`,
    );
  return sharp(
    await sharp({ create: { width: WIDTH, height, channels: 3, background: MAT } })
      .composite([
        { input: drawing(under), left: 0, top: 0 },
        ...layers,
        { input: drawing(over), left: 0, top: 0 },
      ])
      .png()
      .toBuffer(),
  );
}
