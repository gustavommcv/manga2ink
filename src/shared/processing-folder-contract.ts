/**
 * Where the app works, as the window is told of it (ADR 0055). The paths are for the person to read:
 * the window never sends one back, it asks the main process to open a dialog and to use what is
 * chosen in it.
 */
export interface ProcessingFolderStatus {
  /** The folder a person chose, or null while the app picks the places itself. */
  readonly chosen: string | null;
  /** The folder where volumes are built while the app converts, now. */
  readonly scratch: string;
  /** The folder where finished books wait to be saved, now. */
  readonly pending: string;
  /** False when the chosen folder is not there (a drive that is not connected): nothing can be converted until it is. */
  readonly available: boolean;
  /** What is left on the drive the finished books are on, or null when that cannot be said. */
  readonly freeBytes: number | null;
  /** Folders other than the one in use that books are still waiting in. They stay in the list. */
  readonly earlier: readonly ProcessingFolderEarlier[];
}

export interface ProcessingFolderEarlier {
  /** The folder the books are waiting in. */
  readonly folder: string;
  readonly books: number;
}

/** The codes of what can go wrong choosing a folder, which the window says in its own words. */
export const processingFolderFailureCodes = [
  'processing_busy',
  'processing_folder_unusable',
  'processing_folder_unavailable',
] as const;
