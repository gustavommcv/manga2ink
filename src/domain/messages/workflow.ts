import type { NoValues } from './values';

/** What a run is about to do, when the settings or the mapping stand in its way. */
export type RunStep = 'converting' | 'validating';

/** Why a request to the conversion workflow was refused, in the words of a code (ADR 0053). */
export interface WorkflowMessageValues {
  readonly 'workflow.inputGone': NoValues;
  readonly 'workflow.titleGone': NoValues;
  readonly 'workflow.notALibrary': NoValues;
  readonly 'workflow.libraryNeedsTitle': NoValues;
  readonly 'workflow.libraryByTitle': NoValues;
  readonly 'workflow.detailsNeedFolder': NoValues;
  readonly 'workflow.mappingInvalid': NoValues;
  readonly 'workflow.mappingErrors': NoValues;
  readonly 'workflow.mappingNotSaved': NoValues;
  readonly 'workflow.detailsNotSaved': NoValues;
  readonly 'workflow.confirmMapping': { readonly before: RunStep };
  readonly 'workflow.reviewSettings': { readonly before: RunStep };
  readonly 'workflow.singleBookNeedsBoth': NoValues;
  readonly 'workflow.combineNeedsEpub': NoValues;
  readonly 'workflow.noVolumes': NoValues;
  readonly 'workflow.publishFailed': NoValues;
}
