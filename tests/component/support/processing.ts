import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';

/** Where the app works when nobody has chosen a folder: its own places, with room to spare. */
export const defaultProcessingStatus: ProcessingFolderStatus = {
  chosen: null,
  scratch: '/tmp',
  pending: '/home/reader/.local/share/mangabound/pending',
  available: true,
  freeBytes: 120 * 1024 ** 3,
  earlier: [],
};

/** Where the app works once a folder is chosen: Pending and Scratch inside it. */
export const chosenProcessingStatus: ProcessingFolderStatus = {
  chosen: '/mnt/books',
  scratch: '/mnt/books/Scratch',
  pending: '/mnt/books/Pending',
  available: true,
  freeBytes: 800 * 1024 ** 3,
  earlier: [],
};
