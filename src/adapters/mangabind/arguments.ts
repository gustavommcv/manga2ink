export interface MangabindRunArguments {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly metadataFilePath?: string;
  readonly dryRun: boolean;
  readonly batch?: boolean;
  readonly quiet?: boolean;
  /** Write the whole manga as one .cbz instead of one per volume - see mangabind's ADR 0012. */
  readonly combine?: boolean;
  readonly progressJson?: boolean;
  /**
   * Name each chapter in the volume by its own number (`Ch.6 - Title`), not by its place in it, so
   * that the table of contents of the book says the chapter it is - mangabind's ADR 0029.
   */
  readonly chapterLabels?: 'number';
}

export function buildMangabindArguments({
  batch,
  combine,
  dryRun,
  inputPath,
  metadataFilePath,
  outputPath,
  quiet,
  progressJson,
  chapterLabels,
}: MangabindRunArguments): readonly string[] {
  if (batch === true && metadataFilePath !== undefined) {
    throw new TypeError('Mangabind batch mode cannot use a shared metadata file.');
  }
  return [
    '--input',
    inputPath,
    '--output',
    outputPath,
    ...(metadataFilePath === undefined ? [] : ['--metadata-file', metadataFilePath]),
    ...(batch === true ? ['--batch'] : []),
    ...(combine === true ? ['--combine'] : []),
    ...(chapterLabels === undefined ? [] : ['--chapter-labels', chapterLabels]),
    ...(dryRun ? ['--dry-run'] : []),
    ...(quiet === true ? ['--quiet'] : []),
    '--json',
    ...(progressJson === true ? ['--progress-json'] : []),
  ];
}
