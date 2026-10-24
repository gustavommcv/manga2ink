import type { NoValues } from './values';

/**
 * What the editor of the chapter-to-volume mapping says when an edit cannot be made and when the
 * mapping has a problem to fix, in the words of a code (ADR 0053).
 */
export interface MappingMessageValues {
  /** An edit that was refused. */
  readonly 'mapping.invalidVolumeNumber': { readonly value: string };
  readonly 'mapping.chapterNotMappable': { readonly name: string };
  readonly 'mapping.chapterBadSpecial': { readonly name: string };
  readonly 'mapping.unknownChapter': { readonly id: string };
  readonly 'mapping.unknownVolume': { readonly id: string };
  readonly 'mapping.unknownVersionGroup': { readonly token: string };
  readonly 'mapping.unknownVersion': { readonly id: string };
  readonly 'mapping.duplicateChapterId': { readonly id: string };
  readonly 'mapping.duplicateVolumeId': { readonly id: string };
  readonly 'mapping.chooseOneChapter': NoValues;
  readonly 'mapping.splitLeavesNone': NoValues;
  readonly 'mapping.chooseTwoVolumes': NoValues;
  /** The mapping cannot be saved while it has errors. */
  readonly 'mapping.hasErrors': NoValues;

  /** What is wrong with the mapping, or worth a look. */
  readonly 'mapping.issue.invalidSource': NoValues;
  readonly 'mapping.issue.emptyVolume': { readonly number: string };
  readonly 'mapping.issue.unparseable': { readonly name: string };
  readonly 'mapping.issue.filenameConflict': {
    readonly name: string;
    readonly named: number;
    readonly volume: string;
  };
  readonly 'mapping.issue.duplicateVolume': { readonly number: string };
  readonly 'mapping.issue.duplicateSources': { readonly token: string };
  readonly 'mapping.issue.copiesInFolder': { readonly token: string };
  readonly 'mapping.issue.unassigned': { readonly count: number };
}
