import { open } from 'node:fs/promises';
import { inflateRaw } from 'node:zlib';
import { promisify } from 'node:util';

const inflate = promisify(inflateRaw);

const directoryEntry = 0x02014b50;
const localHeader = 0x04034b50;
/** The end record is at the very end, but for a comment of up to 64 KiB after it. */
const endSearch = 22 + 0xffff;
/** A directory this big is not a comic: it is refused before it is read (a CBZ has hundreds of entries). */
const maxDirectoryBytes = 16 * 1024 * 1024;

/**
 * One entry of a zip archive (a `.cbz` is one), read without opening the rest of it, or undefined
 * when it cannot be had: it is not there, it is bigger than `maxBytes` when read, it is encrypted, it
 * is stored in a way other than as it is or deflated, or the archive is not one this reader can
 * follow (zip64, a damaged directory). Nothing here throws for a bad archive; a preview that cannot
 * be made is a preview that is not shown.
 */
export async function readZipEntry(
  archivePath: string,
  entryName: string,
  maxBytes: number,
): Promise<Buffer | undefined> {
  let file: Awaited<ReturnType<typeof open>> | undefined;
  try {
    file = await open(archivePath, 'r');
    const { size } = await file.stat();
    const tail = await readAt(file, Math.max(0, size - endSearch), Math.min(size, endSearch));
    const end = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (end < 0 || tail.length < end + 22) return undefined;
    const entries = tail.readUInt16LE(end + 10);
    const directorySize = tail.readUInt32LE(end + 12);
    const directoryOffset = tail.readUInt32LE(end + 16);
    // Zip64 archives write these as all ones; a page of a comic is never in one.
    if (directorySize === 0xffffffff || directoryOffset === 0xffffffff || entries === 0xffff) {
      return undefined;
    }
    if (directorySize > maxDirectoryBytes || directoryOffset + directorySize > size) {
      return undefined;
    }
    const directory = await readAt(file, directoryOffset, directorySize);
    return await entryFrom(file, directory, entries, entryName, maxBytes);
  } catch {
    return undefined;
  } finally {
    await file?.close();
  }
}

async function readAt(
  file: NonNullable<Awaited<ReturnType<typeof open>>>,
  position: number,
  length: number,
): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await file.read(buffer, 0, length, position);
  return buffer.subarray(0, bytesRead);
}

/** What an entry of the directory is called, as its name is written: UTF-8, or the older code page. */
function namesOf(raw: Buffer, flags: number): readonly string[] {
  const utf8 = raw.toString('utf8');
  return (flags & 0x800) !== 0 ? [utf8] : [utf8, raw.toString('latin1')];
}

async function entryFrom(
  file: NonNullable<Awaited<ReturnType<typeof open>>>,
  directory: Buffer,
  entries: number,
  entryName: string,
  maxBytes: number,
): Promise<Buffer | undefined> {
  let at = 0;
  for (let index = 0; index < entries; index += 1) {
    if (at + 46 > directory.length || directory.readUInt32LE(at) !== directoryEntry)
      return undefined;
    const flags = directory.readUInt16LE(at + 8);
    const method = directory.readUInt16LE(at + 10);
    const compressedSize = directory.readUInt32LE(at + 20);
    const size = directory.readUInt32LE(at + 24);
    const nameLength = directory.readUInt16LE(at + 28);
    const extraLength = directory.readUInt16LE(at + 30);
    const commentLength = directory.readUInt16LE(at + 32);
    const localOffset = directory.readUInt32LE(at + 42);
    const name = directory.subarray(at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;
    if (!namesOf(name, flags).includes(entryName)) continue;

    // An encrypted entry has no pages to show; a stored size beyond the limit is not read.
    if ((flags & 0x1) !== 0 || size > maxBytes || compressedSize > maxBytes) return undefined;
    const local = await readAt(file, localOffset, 30);
    if (local.length < 30 || local.readUInt32LE(0) !== localHeader) return undefined;
    const dataStart = localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
    const stored = await readAt(file, dataStart, compressedSize);
    if (stored.length !== compressedSize) return undefined;
    if (method === 0) return stored;
    if (method !== 8) return undefined;
    // The directory's size is what the entry says it will be; it is not trusted to stay within it.
    return await inflate(stored, { maxOutputLength: maxBytes });
  }
  return undefined;
}
