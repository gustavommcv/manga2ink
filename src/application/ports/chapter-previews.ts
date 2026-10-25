import type { PagePreview } from '@/domain/chapter-versions';

export interface ChapterPreviewPort {
  /**
   * The first page of a folder or archive, or undefined when it cannot be had: the tool named none,
   * it is not an image a window can show, it is too big, or it cannot be read. A preview that cannot
   * be made is not an error; the file is shown without it.
   */
  firstPage(file: {
    readonly path: string;
    readonly kind: 'folder' | 'cbz';
    readonly firstPage?: string;
  }): Promise<PagePreview | undefined>;
}

/** What a workflow has when it is given no way to read pages: no preview of any file. */
export const noPreviews: ChapterPreviewPort = { firstPage: () => Promise.resolve(undefined) };
