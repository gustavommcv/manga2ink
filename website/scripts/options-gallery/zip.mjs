import { inflateRawSync } from 'node:zlib';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;

/**
 * The files of a ZIP archive, by the name each has inside it. A directory entry has no data and is
 * left out. Only what a comic book archive needs is read: stored and deflated entries, no
 * encryption, no ZIP64. Nothing is ever written to a path taken from an entry's name; the caller
 * gets the bytes and decides.
 */
export function readZip(archive) {
  let end = -1;
  for (let at = archive.length - 22; at >= Math.max(0, archive.length - 22 - 0xffff); at--) {
    if (archive.readUInt32LE(at) === END_OF_CENTRAL_DIRECTORY) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new Error('Not a ZIP archive: no end of central directory.');
  const count = archive.readUInt16LE(end + 10);
  let at = archive.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (archive.readUInt32LE(at) !== CENTRAL_DIRECTORY_ENTRY)
      throw new Error('The ZIP central directory is damaged.');
    const flags = archive.readUInt16LE(at + 8);
    const method = archive.readUInt16LE(at + 10);
    const compressedSize = archive.readUInt32LE(at + 20);
    const nameLength = archive.readUInt16LE(at + 28);
    const extraLength = archive.readUInt16LE(at + 30);
    const commentLength = archive.readUInt16LE(at + 32);
    const localHeader = archive.readUInt32LE(at + 42);
    const name = archive.toString('utf8', at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;
    if (flags & 1) throw new Error(`The ZIP entry ${name} is encrypted.`);
    if (archive.readUInt32LE(localHeader) !== LOCAL_FILE_HEADER)
      throw new Error(`The ZIP entry ${name} has no local header.`);
    const start =
      localHeader +
      30 +
      archive.readUInt16LE(localHeader + 26) +
      archive.readUInt16LE(localHeader + 28);
    const stored = archive.subarray(start, start + compressedSize);
    if (method === 0) files.set(name, Buffer.from(stored));
    else if (method === 8) files.set(name, inflateRawSync(stored));
    else throw new Error(`The ZIP entry ${name} uses compression method ${method}.`);
  }
  return files;
}
