import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { readZipEntry } from './zip-entry';

import type { ChapterPreviewPort } from '@/application/ports/chapter-previews';
import type { PagePreview } from '@/domain/chapter-versions';

/** A page bigger than this is not read to be shown small: a preview is a few hundred kilobytes at most. */
export const maxPreviewBytes = 6 * 1024 * 1024;

/** The images a window can show; the others a comic may hold (JPEG XL, TIFF) it cannot. */
const imageTypes: Readonly<Record<string, string>> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
};

/**
 * Reads the first page of a folder or of a comic archive from disk. The name of the page is the one
 * the tool gave of the file, and is checked to stay inside the folder it is said to be in.
 */
export class FsChapterPreviews implements ChapterPreviewPort {
  async firstPage(file: {
    readonly path: string;
    readonly kind: 'folder' | 'cbz';
    readonly firstPage?: string;
  }): Promise<PagePreview | undefined> {
    const name = file.firstPage;
    const mime = name === undefined ? undefined : imageTypes[path.extname(name).toLowerCase()];
    if (name === undefined || mime === undefined) return undefined;
    try {
      const bytes =
        file.kind === 'cbz'
          ? await readZipEntry(file.path, name, maxPreviewBytes)
          : await readInside(file.path, name);
      return bytes === undefined ? undefined : { mime, bytes: new Uint8Array(bytes) };
    } catch {
      return undefined;
    }
  }
}

async function readInside(folder: string, name: string): Promise<Buffer | undefined> {
  const relative = path.relative(folder, path.resolve(folder, name));
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
  const target = path.join(folder, relative);
  if ((await stat(target)).size > maxPreviewBytes) return undefined;
  return readFile(target);
}
