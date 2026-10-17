import type { WorkingSpace } from '@/domain/working-space';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';

/** Where the app works when nobody has chosen a folder: its own places, with room to spare. */
export const defaultProcessingStatus: ProcessingFolderStatus = {
  chosen: null,
  scratch: '/tmp',
  pending: '/home/reader/.local/share/mangabound/pending',
  available: true,
  freeBytes: 120 * 1024 ** 3,
  waiting: { runs: 0, books: 0, bytes: 0 },
  earlier: [],
};

/** Drives with room to spare, so no test is warned unless it is about the warning. */
export const roomyWorkingSpace: WorkingSpace = {
  scratchFreeBytes: 40 * 1024 ** 3,
  pendingFreeBytes: 120 * 1024 ** 3,
  sameDrive: false,
};

/** Where the app works once a folder is chosen: Pending and Scratch inside it. */
export const chosenProcessingStatus: ProcessingFolderStatus = {
  chosen: '/mnt/books',
  scratch: '/mnt/books/Scratch',
  pending: '/mnt/books/Pending',
  available: true,
  freeBytes: 800 * 1024 ** 3,
  waiting: { runs: 0, books: 0, bytes: 0 },
  earlier: [],
};
