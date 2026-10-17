import type { AnyMessage } from '@/domain/message';
import type { UpdateCheck } from '@/domain/update-check';

import type {
  RestoredAppSettings,
  SaveAppSettingsCommand,
  SavedAppSettings,
} from './app-settings-contract';
import type { NetworkInterfaceOption, OpdsAuthConfig, OpdsSharingStatus } from './opds-contract';
import type { OpenAppFolderCommand } from './app-folders-contract';
import type { WaitingBooks } from '@/domain/pending-cleanup';
import type { IdleDaysCommand } from './pending-cleanup-contract';
import type { ProcessingFolderStatus } from './processing-folder-contract';
import type { OpenProjectLinkCommand } from './project-links-contract';
import type { RestoredSettings, SaveSettingsCommand } from './settings-contract';
import type { ToolchainStatus } from './toolchain-status';
import type {
  ArtifactSummary,
  ConversionCommand,
  ConversionProgressPayload,
  DeviceProfileSummary,
  InspectedInputPayload,
  LibraryConversionCommand,
  LibraryPlanSummary,
  LibraryTitleResult,
  MetadataProviderDescriptor,
  MetadataSearchResult,
  PlanSummary,
  PlanConversionCommand,
  CoverOfBookCommand,
  CoversChange,
  CoversFolderCommand,
  CoverTarget,
  DropCoversCommand,
  SaveBookDetailsCommand,
  PendingRunSummary,
  SaveAllResult,
  RegisteredInputs,
  SelectedLibrary,
  VolumeSuggestion,
  WorkflowResult,
} from './workflow-contract';

import type { AttachedCover } from '@/domain/book-covers';
import type { WorkingSpace } from '@/domain/working-space';
import type { MappingDraft } from '@/domain/mapping';

export interface RuntimeInfo {
  readonly electron: string;
  readonly platform: NodeJS.Platform;
  /** The full app version, including any prerelease label (e.g. "0.1.0-alpha.1"). */
  readonly version: string;
}

export interface MangaboundBridge {
  readonly runtime: RuntimeInfo;
  readonly getToolchainStatus: () => Promise<ToolchainStatus>;
  /** Opens a native picker for several comic files or several manga folders. */
  readonly chooseInputs: (kind: 'files' | 'folders') => Promise<WorkflowResult<RegisteredInputs>>;
  /** Registers files dropped on the window; the paths are read from the files, not typed in. */
  readonly registerDroppedFiles: (
    files: readonly File[],
  ) => Promise<WorkflowResult<RegisteredInputs>>;
  readonly inspectInput: (selectionId: string) => Promise<WorkflowResult<InspectedInputPayload>>;
  readonly releaseInput: (sessionId: string) => Promise<WorkflowResult<undefined>>;
  readonly chooseLibrary: () => Promise<WorkflowResult<SelectedLibrary | null>>;
  readonly getDeviceProfiles: () => Promise<WorkflowResult<readonly DeviceProfileSummary[]>>;
  readonly convert: (
    command: ConversionCommand,
  ) => Promise<WorkflowResult<readonly ArtifactSummary[]>>;
  readonly planConversion: (command: PlanConversionCommand) => Promise<WorkflowResult<PlanSummary>>;
  readonly createPendingRun: () => Promise<WorkflowResult<string>>;
  readonly listPendingRuns: () => Promise<WorkflowResult<readonly PendingRunSummary[]>>;
  readonly discardPendingRun: (libraryId: string) => Promise<WorkflowResult<undefined>>;
  /** How much waits in conversions untouched for that many days, which a clean-up would delete (ADR 0061). */
  readonly countIdlePending: (command: IdleDaysCommand) => Promise<WorkflowResult<WaitingBooks>>;
  /** Deletes the conversions untouched for that many days, apart from any in use; says what went. */
  readonly deleteIdlePending: (command: IdleDaysCommand) => Promise<WorkflowResult<WaitingBooks>>;
  readonly saveArtifactAs: (
    artifactId: string,
  ) => Promise<WorkflowResult<{ saved: boolean; warning?: AnyMessage }>>;
  readonly saveAllArtifacts: (
    artifactIds: readonly string[],
  ) => Promise<WorkflowResult<SaveAllResult | null>>;
  readonly cancelConversion: (jobId: string) => Promise<WorkflowResult<undefined>>;
  /** Reads a library again, after a title's mapping was saved. */
  readonly planLibrary: (
    jobId: string,
    sessionId: string,
  ) => Promise<WorkflowResult<LibraryPlanSummary>>;
  readonly writeTitleMapping: (
    sessionId: string,
    title: string,
    mapping: MappingDraft,
  ) => Promise<WorkflowResult<undefined>>;
  /** Keeps the author and language of a folder, or of a library's title, with that folder. */
  readonly saveBookDetails: (command: SaveBookDetailsCommand) => Promise<WorkflowResult<undefined>>;
  /** The covers kept for the books of an item. */
  readonly listCovers: (target: CoverTarget) => Promise<WorkflowResult<readonly AttachedCover[]>>;
  /** Asks for one image and makes it that book's cover; `null` when nothing was picked. */
  readonly chooseCover: (
    command: CoverOfBookCommand,
  ) => Promise<WorkflowResult<CoversChange | null>>;
  /** Asks for a folder and gives its images to the books in order; `null` when none was picked. */
  readonly chooseCoversFolder: (
    command: CoversFolderCommand,
  ) => Promise<WorkflowResult<CoversChange | null>>;
  /** Takes what was dropped on the covers; the paths are read from the files, not typed in. */
  readonly dropCovers: (
    command: DropCoversCommand,
    files: readonly File[],
  ) => Promise<WorkflowResult<CoversChange>>;
  readonly removeCover: (command: CoverOfBookCommand) => Promise<WorkflowResult<CoversChange>>;
  readonly convertLibrary: (
    command: LibraryConversionCommand,
  ) => Promise<WorkflowResult<readonly LibraryTitleResult[]>>;
  readonly listMetadataProviders: () => Promise<
    WorkflowResult<readonly MetadataProviderDescriptor[]>
  >;
  readonly searchMetadata: (
    jobId: string,
    providerId: string,
    title: string,
  ) => Promise<WorkflowResult<readonly MetadataSearchResult[]>>;
  readonly suggestVolumes: (
    jobId: string,
    providerId: string,
    workId: string,
    /** The language the folders declare, so the volumes are those of that translation. */
    language?: string,
  ) => Promise<WorkflowResult<{ volumes: readonly VolumeSuggestion[] }>>;
  /** Opens a source's own site in the browser: the provider is named, its address is not. */
  readonly openProviderHomepage: (providerId: string) => Promise<WorkflowResult<undefined>>;
  readonly openArtifact: (artifactId: string) => Promise<WorkflowResult<undefined>>;
  readonly showArtifactInFolder: (artifactId: string) => Promise<WorkflowResult<undefined>>;
  readonly onConversionProgress: (
    listener: (progress: ConversionProgressPayload) => void,
  ) => () => void;
  readonly listNetworkInterfaces: () => Promise<WorkflowResult<readonly NetworkInterfaceOption[]>>;
  readonly startSharing: (
    libraryId: string,
    interfaceAddress: string,
    auth: OpdsAuthConfig,
  ) => Promise<WorkflowResult<OpdsSharingStatus>>;
  readonly stopSharing: () => Promise<WorkflowResult<undefined>>;
  readonly getSharingStatus: () => Promise<WorkflowResult<OpdsSharingStatus>>;
  /** The options kept from the last session. */
  readonly loadSettings: () => Promise<WorkflowResult<RestoredSettings>>;
  /** Keeps the options; the last native Save-dialog folder remains main-process state. */
  readonly saveSettings: (command: SaveSettingsCommand) => Promise<WorkflowResult<undefined>>;
  /** What a person decided about the app itself, and the language it comes to (ADR 0052). */
  readonly loadAppSettings: () => Promise<WorkflowResult<RestoredAppSettings>>;
  /** Keeps the app settings, and says the language they come to. */
  readonly saveAppSettings: (
    command: SaveAppSettingsCommand,
  ) => Promise<WorkflowResult<SavedAppSettings>>;
  /**
   * Opens a place the About tab names in the browser of the system. The window names the place and
   * its own language; it never gives an address (ADR 0054).
   */
  readonly openProjectLink: (command: OpenProjectLinkCommand) => Promise<WorkflowResult<undefined>>;
  /**
   * Looks for a version newer than the one that is running, in the list of releases that GitHub has
   * (ADR 0062). Only when it is called: nothing looks for one by itself.
   */
  readonly checkForUpdates: () => Promise<WorkflowResult<UpdateCheck>>;
  /** Puts the diagnostics for a report of a problem on the clipboard (ADR 0057). */
  readonly copyDiagnostics: () => Promise<WorkflowResult<undefined>>;
  /** Opens a folder of the app, by name, in the file manager (ADR 0057). */
  readonly openAppFolder: (command: OpenAppFolderCommand) => Promise<WorkflowResult<undefined>>;
  /** Where the app builds volumes and keeps finished books, and what is waiting elsewhere (ADR 0056). */
  readonly getProcessingFolder: () => Promise<WorkflowResult<ProcessingFolderStatus>>;
  /** What is left on the drives the app works on, to say before a run that there is too little (ADR 0060). */
  readonly getWorkingSpace: () => Promise<WorkflowResult<WorkingSpace>>;
  /** Opens a dialog to choose the folder the app works in; resolves to null when it is cancelled. */
  readonly chooseProcessingFolder: () => Promise<WorkflowResult<ProcessingFolderStatus | null>>;
  /** Puts the app back to the places it picks itself. */
  readonly useDefaultProcessingFolder: () => Promise<WorkflowResult<ProcessingFolderStatus>>;
}
