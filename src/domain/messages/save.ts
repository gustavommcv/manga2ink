import type { NoValues } from './values';

/** Why a pending book could not be saved where it was asked to, in the words of a code (ADR 0053). */
export interface SaveMessageValues {
  readonly 'save.bookGone': NoValues;
  readonly 'save.bookBeingDeleted': NoValues;
  readonly 'save.wrongExtension': { readonly extension: string };
  readonly 'save.nameUnavailable': NoValues;
  readonly 'save.destinationFull': NoValues;
  readonly 'save.cannotWrite': NoValues;
  readonly 'save.folderGone': NoValues;
  readonly 'save.failed': NoValues;
  /** The book was copied, but the catalog of the destination could not be updated. */
  readonly 'save.copiedCatalogFailed': NoValues;
  /** The book was copied, but the app could not record that it was saved. */
  readonly 'save.copiedNotRecorded': NoValues;
}
