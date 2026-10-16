import type { NoValues } from './values';

/** The things the app runs one at a time, and says so when one is asked for twice. */
export type RunningThing = 'validation' | 'discovery' | 'search' | 'lookup' | 'conversion';

/**
 * What the main process tells the window when a request cannot be done, in the words of a code
 * (ADR 0053). What went wrong inside stays in the app's own log; these say what the person can do.
 */
export interface FailureMessageValues {
  readonly 'failure.cancelled': NoValues;
  readonly 'failure.conversionCancelled': NoValues;
  readonly 'failure.internal': NoValues;
  readonly 'failure.invalidRequest': NoValues;
  readonly 'failure.untrustedSender': NoValues;
  readonly 'failure.fileAccessDenied': NoValues;
  readonly 'failure.diskFull': NoValues;
  readonly 'failure.settingsNotSaved': NoValues;
  readonly 'failure.settingsNotLoaded': NoValues;
  readonly 'failure.suggestionNotApplied': NoValues;
  readonly 'failure.searchNotCompleted': NoValues;
  readonly 'failure.catalogUnreadable': NoValues;
  readonly 'failure.toolIncompatible': NoValues;
  /** The tool failed and said nothing the person can use. */
  readonly 'failure.bindingFailed': NoValues;
  readonly 'failure.conversionFailed': NoValues;
  /** A title of a library that was not converted, and nothing says why. */
  readonly 'failure.titleNotConverted': NoValues;
  /** The cover chosen for a book was not one the tool could use. */
  readonly 'failure.coverUnusable': { readonly book: string };
  readonly 'failure.alreadyRunning': { readonly what: RunningThing };
  readonly 'failure.conversionNotRunning': NoValues;
  readonly 'failure.sourceUnavailable': NoValues;
  readonly 'failure.sourceUnsafeAddress': NoValues;
  readonly 'failure.savedBookGone': NoValues;
  readonly 'failure.chooseInputAgain': NoValues;
  readonly 'failure.chooseLibraryAgain': NoValues;
  readonly 'failure.pendingConversionGone': NoValues;
  readonly 'failure.pendingConversionBeingDeleted': NoValues;
  readonly 'failure.pendingStillSaving': NoValues;
  readonly 'failure.pendingNotFound': NoValues;
  readonly 'failure.pendingUnreadable': NoValues;
  readonly 'failure.pendingDeleteFailed': NoValues;
  /** The request to delete did not even get an answer. */
  readonly 'failure.pendingNotDeleted': NoValues;
  readonly 'failure.readyBooksShared': NoValues;
  readonly 'failure.waitForConversion': NoValues;
  readonly 'failure.sharingAlreadyRunning': NoValues;
  readonly 'failure.sharingNotRunning': NoValues;
  readonly 'failure.sharingAddressUnavailable': NoValues;
  readonly 'failure.sharingPendingBeingDeleted': NoValues;
  readonly 'failure.sharingPortInUse': { readonly port: number };
  readonly 'failure.sharingAddressRefused': NoValues;
  /** The folder the app works in was chosen and is not there now (ADR 0056). */
  readonly 'failure.processingFolderUnavailable': { readonly folder: string };
  /** A folder that was offered as the one to work in cannot be worked in. */
  readonly 'failure.processingFolderUnusable': { readonly folder: string };
  /** Where the app works cannot change while something is being made or shared. */
  readonly 'failure.processingBusy': NoValues;
  /** The diagnostics could not be put on the clipboard. */
  readonly 'failure.diagnosticsNotCopied': NoValues;
  /** A folder of the app could not be opened in the file manager. */
  readonly 'failure.folderNotOpened': NoValues;
}
