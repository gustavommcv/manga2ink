// Pictures that show what cropping keeps: the page with the part that was kept outlined and the part
// that was cut away shaded, and next to it the page as it came out; or one page with the parts kept by
// several settings drawn one inside the other. The part kept is not estimated: a page cropped without
// enlarging is a piece of the page converted without cropping, so it is found by matching the pixels.
// There are no words in the pictures, so both languages use them, and the numbers are drawn as strokes
// so that no font changes the file.
import sharp from 'sharp';

const MAT = '#cfcfcf';
const BEZEL = '#2b2b2b';
const SCREEN = '#ececec';
const INK = '#222222';
const KEPT = '#00798c';
const CUT = '209, 73, 91';
const RAMP = ['#00798c', '#66a61e', '#e6ab02', '#d95f02', '#c2185b'];
const WIDTH = 800;
const MARGIN = 30;
const PAGE_HEIGHT = 420;
const BEZEL_WIDTH = 10;

/**
 * Where a cropped page sits in the page it was cut from, as `{ x, y, width, height }`. Both are images
 * of the same pipeline's output, so the match is exact; a page that is not a piece of the other is an
 * error, not a guess.
 */
export async function findBox(reference, cropped) {
  const ref = await sharp(reference).grayscale().raw().toBuffer({ resolveWithObject: true });
  const cut = await sharp(cropped).grayscale().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = ref.info;
  const { width: w, height: h } = cut.info;
  if (w > W || h > H) throw new Error(`A page of ${w}x${h} is not a piece of one of ${W}x${H}.`);
  const probes = [];
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 16; j++)
      probes.push([Math.round((i * (w - 1)) / 15), Math.round((j * (h - 1)) / 15)]);
  const same = (x, y) => {
    for (let row = 0; row < h; row++) {
      const a = (y + row) * W + x;
      const b = row * w;
      if (Buffer.compare(ref.data.subarray(a, a + w), cut.data.subarray(b, b + w)) !== 0)
        return false;
    }
    return true;
  };
  for (let y = 0; y <= H - h; y++) {
    for (let x = 0; x <= W - w; x++) {
      let hit = true;
      for (const [px, py] of probes) {
        if (ref.data[(y + py) * W + x + px] !== cut.data[py * w + px]) {
          hit = false;
          break;
        }
      }
      if (hit && same(x, y)) return { x, y, width: w, height: h };
    }
  }
  throw new Error(`A page of ${w}x${h} was not found in the page of ${W}x${H}.`);
}

// Strokes of the digits and the point, in a cell 10 wide and 16 high.
const GLYPHS = {
  0: 'M5 0 C1 0 0 4 0 8 C0 12 1 16 5 16 C9 16 10 12 10 8 C10 4 9 0 5 0 Z',
  1: 'M2 4 L6 0 V16',
  2: 'M0 4 C0 0 10 -1 10 4 C10 8 0 11 0 16 H10',
  3: 'M0 2 C3 -1 10 0 10 4 C10 7 6 8 4 8 C7 8 10 9 10 12 C10 17 2 17 0 14',
  4: 'M8 16 V0 L0 11 H10',
  5: 'M9 0 H1 L0 7 C3 5 10 6 10 11 C10 17 2 17 0 14',
  6: 'M9 1 C3 -1 0 5 0 10 C0 15 3 16 5 16 C9 16 10 13 10 11 C10 8 8 6 5 6 C2 6 0 8 0 10',
  7: 'M0 0 H10 L4 16',
  8: 'M5 8 C1 8 1 0 5 0 C9 0 9 8 5 8 C0 8 0 16 5 16 C10 16 10 8 5 8 Z',
  9: 'M1 15 C7 17 10 11 10 6 C10 1 7 0 5 0 C1 0 0 3 0 5 C0 8 2 10 5 10 C8 10 10 8 10 6',
  '.': 'M5 15 L5.1 15',
};

/** A number written with strokes, its top left corner at (x, y), `scale` times a cell of 10 by 16. */
function text(string, x, y, scale, color) {
  let at = x;
  const parts = [];
  for (const character of string) {
    parts.push(
      `<path d="${GLYPHS[character]}" transform="translate(${at} ${y}) scale(${scale})" fill="none" stroke="${color}" stroke-width="${2.6}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    at += (character === '.' ? 6 : 14) * scale;
  }
  return { svg: parts.join(''), width: at - x };
}

const svg = (width, height, shapes) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${shapes.join('')}</svg>`,
  );

async function onMat(width, height, layers) {
  return sharp({ create: { width, height, channels: 3, background: MAT } })
    .composite(layers)
    .png()
    .toBuffer();
}

/**
 * The page with the part kept outlined and the rest shaded, an arrow, and the page as it came out on
 * the screen. `compare` is a second box drawn dashed, for what the setting adds to another.
 */
export async function cropPicture({ source, size, box, compare, result, screen }) {
  const pageWidth = Math.round((PAGE_HEIGHT * size.width) / size.height);
  const k = pageWidth / size.width;
  const thumb = await sharp(source)
    .flatten({ background: '#fff' })
    .resize({ width: pageWidth, height: PAGE_HEIGHT })
    .png()
    .toBuffer();
  const area = {
    width: Math.round((PAGE_HEIGHT * screen.width) / screen.height),
    height: PAGE_HEIGHT,
  };
  const frame = await sharp(result)
    .flatten({ background: '#fff' })
    .resize({ width: area.width, height: area.height, fit: 'contain', background: SCREEN })
    .png()
    .toBuffer();
  const outer = { width: area.width + 2 * BEZEL_WIDTH, height: area.height + 2 * BEZEL_WIDTH };
  const arrow = 90;
  const total = pageWidth + arrow + outer.width;
  const height = MARGIN * 2 + outer.height;
  const left = Math.round((WIDTH - total) / 2);
  const top = MARGIN + BEZEL_WIDTH;
  const px = (b) => ({ x: left + b.x * k, y: top + b.y * k, w: b.width * k, h: b.height * k });
  const kept = px(box);
  const page = { x: left, y: top, w: pageWidth, h: PAGE_HEIGHT };
  const shades = [
    `<path fill-rule="evenodd" d="M${page.x} ${page.y} h${page.w} v${page.h} h${-page.w} Z M${kept.x} ${kept.y} h${kept.w} v${kept.h} h${-kept.w} Z" fill="rgba(${CUT}, 0.42)"/>`,
    `<rect x="${kept.x + 2}" y="${kept.y + 2}" width="${kept.w - 4}" height="${kept.h - 4}" fill="none" stroke="${KEPT}" stroke-width="5"/>`,
  ];
  if (compare) {
    const c = px(compare);
    shades.push(
      `<rect x="${c.x + 2}" y="${c.y + 2}" width="${c.w - 4}" height="${c.h - 4}" fill="none" stroke="#fff" stroke-width="6"/>`,
      `<rect x="${c.x + 2}" y="${c.y + 2}" width="${c.w - 4}" height="${c.h - 4}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="11 9"/>`,
    );
  }
  const frameLeft = left + pageWidth + arrow;
  const arrowX = left + pageWidth + arrow / 2;
  const middle = MARGIN + outer.height / 2;
  const under = svg(WIDTH, height, [
    `<rect x="${frameLeft - 8}" y="${MARGIN - 8}" width="${outer.width + 16}" height="${outer.height + 16}" rx="22" fill="none" stroke="${KEPT}" stroke-width="6"/>`,
    `<rect x="${frameLeft}" y="${MARGIN}" width="${outer.width}" height="${outer.height}" rx="16" fill="${BEZEL}"/>`,
  ]);
  const over = svg(WIDTH, height, [
    ...shades,
    `<path d="M${arrowX - 22} ${middle} H${arrowX + 22} M${arrowX + 6} ${middle - 16} L${arrowX + 24} ${middle} L${arrowX + 6} ${middle + 16}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ]);
  const base = await onMat(WIDTH, height, [
    { input: under, left: 0, top: 0 },
    { input: thumb, left, top },
    { input: frame, left: frameLeft + BEZEL_WIDTH, top: MARGIN + BEZEL_WIDTH },
    { input: over, left: 0, top: 0 },
  ]);
  return sharp(base);
}

/**
 * One page with the part kept by each setting outlined, from the loosest to the tightest, and a key
 * beside it: a line in the color of the outline and the number of the setting. A setting that kept the
 * whole page has a dashed outline around it.
 */
export async function boxesPicture({ source, size, boxes }) {
  const pageHeight = 520;
  const pageWidth = Math.round((pageHeight * size.width) / size.height);
  const k = pageWidth / size.width;
  const thumb = await sharp(source)
    .flatten({ background: '#fff' })
    .resize({ width: pageWidth, height: pageHeight })
    .png()
    .toBuffer();
  const keyWidth = 150;
  const total = pageWidth + 50 + keyWidth;
  const height = MARGIN * 2 + pageHeight;
  const left = Math.round((WIDTH - total) / 2);
  const top = MARGIN;
  const shapes = [];
  const key = [];
  const whole = boxes.filter((b) => b.box.width === size.width && b.box.height === size.height);
  const cuts = boxes.filter((b) => !whole.includes(b));
  cuts.forEach((b, i) => {
    const color = RAMP[i % RAMP.length];
    const x = left + b.box.x * k;
    const y = top + b.box.y * k;
    shapes.push(
      `<rect x="${x + 1.5}" y="${y + 1.5}" width="${b.box.width * k - 3}" height="${b.box.height * k - 3}" fill="none" stroke="${color}" stroke-width="3.5"/>`,
    );
  });
  const rows = [
    ...cuts.map((b, i) => ({ label: b.label, color: RAMP[i % RAMP.length], dashed: false })),
    ...whole.map((b) => ({ label: b.label, color: INK, dashed: true })),
  ];
  if (whole.length > 0)
    shapes.push(
      `<rect x="${left + 1.5}" y="${top + 1.5}" width="${pageWidth - 3}" height="${pageHeight - 3}" fill="none" stroke="#fff" stroke-width="6"/>`,
      `<rect x="${left + 1.5}" y="${top + 1.5}" width="${pageWidth - 3}" height="${pageHeight - 3}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="11 9"/>`,
    );
  const keyLeft = left + pageWidth + 50;
  rows.forEach((row, i) => {
    const y = top + 30 + i * 50;
    key.push(
      row.dashed
        ? `<line x1="${keyLeft}" y1="${y + 8}" x2="${keyLeft + 46}" y2="${y + 8}" stroke="${INK}" stroke-width="4" stroke-dasharray="9 7"/>`
        : `<line x1="${keyLeft}" y1="${y + 8}" x2="${keyLeft + 46}" y2="${y + 8}" stroke="${row.color}" stroke-width="5"/>`,
      text(row.label, keyLeft + 62, y, 1.4, INK).svg,
    );
  });
  const base = await onMat(WIDTH, height, [
    { input: thumb, left, top },
    { input: svg(WIDTH, height, [...shapes, ...key]), left: 0, top: 0 },
  ]);
  return sharp(base);
}

/**
 * Which rows (or columns) of a page were deleted to make another: both are lossless output of the same
 * pipeline, so the second is the first with some lines taken out, and the lines are found by matching them
 * in order. A line of the second that is not in the first is an error, not a guess. Lines that are alike
 * (the blank rows of a gutter) could have been taken out from anywhere in their run, and the picture is the
 * same whichever they were, so they are put in the middle of it, where a gutter is cut. Returns runs of
 * deleted lines in the numbering of the first page, as `[start, end)`.
 */
export async function findRemoved(whole, part, axis) {
  const a = await sharp(whole).grayscale().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(part).grayscale().raw().toBuffer({ resolveWithObject: true });
  const rows = axis === 'rows';
  const { width: aw, height: ah } = a.info;
  const { width: bw, height: bh } = b.info;
  if (rows ? bw !== aw : bh !== ah)
    throw new Error(`A page of ${bw}x${bh} is not a page of ${aw}x${ah} with ${axis} taken out.`);
  const line = (image, index) => {
    const { width, height } = image.info;
    if (rows) return image.data.subarray(index * width, (index + 1) * width);
    return Buffer.from(Array.from({ length: height }, (_, y) => image.data[y * width + index]));
  };
  const count = rows ? ah : aw;
  const kept = rows ? bh : bw;
  const lines = Array.from({ length: count }, (_, i) => line(a, i));
  const wanted = Array.from({ length: kept }, (_, i) => line(b, i));
  // Runs of alike lines of the first page, and how many of each were taken out.
  const taken = [];
  let next = 0;
  for (let start = 0; start < count;) {
    let end = start + 1;
    while (end < count && Buffer.compare(lines[end], lines[start]) === 0) end++;
    let used = 0;
    while (next < kept && used < end - start && Buffer.compare(wanted[next], lines[start]) === 0) {
      used++;
      next++;
    }
    taken.push([start, end, end - start - used]);
    start = end;
  }
  if (next !== kept)
    throw new Error(`The ${axis} of a page of ${bw}x${bh} are not in the page of ${aw}x${ah}.`);
  const spans = [];
  for (const [start, end, gone] of taken) {
    if (gone === 0) continue;
    const first = start + Math.floor((end - start - gone) / 2);
    // A span that begins where the one before ends is one gap.
    if (spans.length > 0 && spans.at(-1)[1] === first) spans.at(-1)[1] = first + gone;
    else spans.push([first, first + gone]);
  }
  return spans;
}

/**
 * The page with the rows and columns that were deleted shaded, an arrow, and the page that is left, at the
 * same scale, so that its being shorter or narrower is seen. With nothing deleted the page is the same on
 * both sides.
 */
export async function gapsPicture({ source, size, rows, columns, result }) {
  const height = 360;
  const k = height / size.height;
  const pageWidth = Math.round(size.width * k);
  const meta = await sharp(result).metadata();
  const resultSize = { width: Math.round(meta.width * k), height: Math.round(meta.height * k) };
  const flat = (bytes, width, tall) =>
    sharp(bytes).flatten({ background: '#fff' }).resize({ width, height: tall }).png().toBuffer();
  const arrow = 90;
  const left = Math.round((WIDTH - (pageWidth + arrow + resultSize.width)) / 2);
  const resultLeft = left + pageWidth + arrow;
  const resultTop = MARGIN + Math.round((height - resultSize.height) / 2);
  const arrowX = left + pageWidth + arrow / 2;
  const middle = MARGIN + height / 2;
  const shade = (x, y, width, tall) =>
    `<rect x="${x}" y="${y}" width="${width}" height="${tall}" fill="rgba(${CUT}, 0.6)"/>`;
  const shapes = [
    ...rows.map(([start, end]) =>
      shade(left, MARGIN + start * k, pageWidth, Math.max((end - start) * k, 1.5)),
    ),
    ...columns.map(([start, end]) =>
      shade(left + start * k, MARGIN, Math.max((end - start) * k, 1.5), height),
    ),
    `<rect x="${left}" y="${MARGIN}" width="${pageWidth}" height="${height}" fill="none" stroke="${INK}" stroke-width="2"/>`,
    `<rect x="${resultLeft - 3}" y="${resultTop - 3}" width="${resultSize.width + 6}" height="${resultSize.height + 6}" fill="none" stroke="${KEPT}" stroke-width="6"/>`,
    `<path d="M${arrowX - 22} ${middle} H${arrowX + 22} M${arrowX + 6} ${middle - 16} L${arrowX + 24} ${middle} L${arrowX + 6} ${middle + 16}" fill="none" stroke="${INK}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ];
  return sharp(
    await onMat(WIDTH, MARGIN * 2 + height, [
      { input: await flat(source, pageWidth, height), left, top: MARGIN },
      {
        input: await flat(result, resultSize.width, resultSize.height),
        left: resultLeft,
        top: resultTop,
      },
      { input: svg(WIDTH, MARGIN * 2 + height, shapes), left: 0, top: 0 },
    ]),
  );
}
