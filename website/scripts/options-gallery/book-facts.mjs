// What a finished book says about itself: the title, author and language an EPUB's package file
// holds, the title and author in a PDF's document properties, the reading direction either one
// carries, and whether a CBZ holds a ComicInfo.xml. Pure: the generator passes the bytes in.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** The text of an XML value, with its entities (`&amp;`, `&#38;`, `&#x26;`) turned back into characters. */
export function unescapeXml(text) {
  return text.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos));/gi,
    (_, decimal, hex, name) =>
      name
        ? ENTITIES[name.toLowerCase()]
        : String.fromCodePoint(parseInt(decimal ?? hex, decimal ? 10 : 16)),
  );
}

/** The title, author and language of an EPUB's package file (`content.opf`), or null where it has none. */
export function epubFacts(opf) {
  const field = (name) => {
    const found = opf.match(new RegExp(`<dc:${name}>([^<]*)</dc:${name}>`));
    return found ? unescapeXml(found[1]) : null;
  };
  return {
    title: field('title'),
    author: field('creator'),
    language: field('language'),
    direction: opf.match(/page-progression-direction="(ltr|rtl)"/)?.[1] ?? null,
  };
}

/** A PDF string written as hexadecimal UTF-16, which is how the document properties are stored. */
function decodeHexString(hex) {
  const bytes = Buffer.from(hex, 'hex');
  const body = bytes.subarray(0, 2).equals(Buffer.from([0xfe, 0xff])) ? bytes.subarray(2) : bytes;
  return Buffer.from(body).swap16().toString('utf16le');
}

/**
 * The title, author, language and reading direction a PDF states, or null where it states none. The
 * title and author are in the document properties; the language and the direction are optional
 * entries (`/Lang`, and `/Direction` among the viewer preferences) that mangapress does not write.
 */
export function pdfFacts(bytes) {
  const text = Buffer.from(bytes).toString('latin1');
  const field = (name) => {
    const found = text.match(new RegExp(`/${name}\\s*<([0-9A-Fa-f]+)>`));
    return found ? decodeHexString(found[1]) : null;
  };
  const direction = text.match(/\/Direction\s*\/(L2R|R2L)/)?.[1];
  return {
    title: field('Title'),
    author: field('Author'),
    language: text.match(/\/Lang\s*\(([^)]+)\)/)?.[1] ?? null,
    direction: direction === undefined ? null : direction === 'R2L' ? 'rtl' : 'ltr',
  };
}

/**
 * How many pages a PDF has and how many images it holds: one image to a page, unless a picture such
 * as a cover is in it as well.
 */
export function pdfPictures(bytes) {
  const text = Buffer.from(bytes).toString('latin1');
  return {
    pages: (text.match(/\/Type\s*\/Page(?![a-z])/g) ?? []).length,
    images: (text.match(/\/Subtype\s*\/Image/g) ?? []).length,
  };
}

const lastPart = (name) => name.split('/').pop();

/** Whether an entry of a CBZ is its cover, which mangapress stores as `##cover.jpg` ahead of the pages. */
export const isCover = (name) => lastPart(name) === '##cover.jpg';

/** Whether an entry of a CBZ is a page. */
export const isPage = (name) => /\.(jpe?g|png|gif)$/i.test(name) && !isCover(name);

/** Whether the entries of a CBZ include a ComicInfo.xml, wherever it sits. */
export function hasComicInfo(names) {
  return names.some((name) => lastPart(name) === 'ComicInfo.xml');
}

/** The entries of a CBZ that are not pages, a cover or a ComicInfo.xml: a CBZ made here has none. */
export function otherEntries(names) {
  return names.filter(
    (name) => !isPage(name) && !isCover(name) && lastPart(name) !== 'ComicInfo.xml',
  );
}
