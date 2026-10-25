import { deflateRawSync } from 'node:zlib';

export interface ZipEntrySpec {
  readonly name: string;
  readonly data: Buffer;
  /** 0 stores the bytes as they are, 8 deflates them; any other number is only written down. */
  readonly method?: number;
  /** Bit 0 is encryption, bit 11 says the name is UTF-8. */
  readonly flags?: number;
  /** The name as it is written, when that is not what `name` says (an older code page). */
  readonly rawName?: Buffer;
  /** The size the directory says the entry has once read, when that is not the truth. */
  readonly claimedSize?: number;
}

export interface ZipTampering {
  /** Replaces the signature of the directory entry of the first entry. */
  readonly badDirectoryEntry?: boolean;
  readonly badLocalHeader?: boolean;
  /** Says there are more entries than the directory holds. */
  readonly extraEntries?: number;
  /** Writes the all-ones of zip64 where the directory's size and place go. */
  readonly zip64?: boolean;
  /** Leaves the end record out, as in a file that was cut. */
  readonly noEnd?: boolean;
  /** Says the directory is far bigger than it is. */
  readonly hugeDirectory?: boolean;
  /** Says the first entry's data is longer than the file. */
  readonly truncatedData?: boolean;
  /** Says the directory begins after the file ends. */
  readonly directoryBeyondFile?: boolean;
  /** Says the first entry begins after the file ends. */
  readonly entryBeyondFile?: boolean;
}

/** A zip archive made by hand, byte by byte, so that a test can write what a real tool never would. */
export function zipOf(entries: readonly ZipEntrySpec[], tampering: ZipTampering = {}): Buffer {
  const parts: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  entries.forEach((entry, index) => {
    const method = entry.method ?? 0;
    const body = method === 8 ? deflateRawSync(entry.data) : entry.data;
    const name = entry.rawName ?? Buffer.from(entry.name, 'utf8');
    const flags = entry.flags ?? 0x800;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(index === 0 && tampering.badLocalHeader === true ? 0 : 0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    parts.push(local, name, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(index === 0 && tampering.badDirectoryEntry === true ? 0 : 0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(
      index === 0 && tampering.truncatedData === true ? body.length + 1_000_000 : body.length,
      20,
    );
    central.writeUInt32LE(entry.claimedSize ?? entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(
      index === 0 && tampering.entryBeyondFile === true ? offset + 10_000_000 : offset,
      42,
    );
    directory.push(central, name);
    offset += 30 + name.length + body.length;
  });
  const directoryBytes = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length + (tampering.extraEntries ?? 0), 10);
  end.writeUInt32LE(
    tampering.hugeDirectory === true ? 64 * 1024 * 1024 : directoryBytes.length,
    12,
  );
  end.writeUInt32LE(tampering.directoryBeyondFile === true ? offset + 10_000_000 : offset, 16);
  if (tampering.zip64 === true) {
    end.writeUInt32LE(0xffffffff, 12);
    end.writeUInt32LE(0xffffffff, 16);
  }
  return Buffer.concat([...parts, directoryBytes, ...(tampering.noEnd === true ? [] : [end])]);
}
