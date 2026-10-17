/**
 * Whether a version newer than the one that is running has been published (ADR 0063). A version is
 * a semantic version as the releases write it, with a `v` in the tag (`v0.1.0-alpha.15`), and an
 * alpha is before the version it leads to and after the alpha before it, so that
 * `0.1.0-alpha.9 < 0.1.0-alpha.10 < 0.1.0`.
 */

/** A published release as the check needs it: its tag, whether it is a pre-release, and when. */
export interface ReleaseSummary {
  readonly tag: string;
  readonly prerelease: boolean;
  /** An ISO date and time, when the release says one. */
  readonly publishedAt?: string;
}

/** What a check found: the installed version is the newest, or a newer one is out. */
export type UpdateCheck =
  | { readonly status: 'current'; readonly version: string }
  | {
      readonly status: 'available';
      readonly version: string;
      readonly tag: string;
      readonly publishedAt?: string;
    };

interface ParsedVersion {
  readonly numbers: readonly [number, number, number];
  /** The dot-separated labels after the hyphen, none for a version that is not a pre-release. */
  readonly labels: readonly (string | number)[];
}

const pattern =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/u;

/** A version of the shape the releases use, or `undefined` for anything else. */
export function parseVersion(text: string): ParsedVersion | undefined {
  const match = pattern.exec(text.trim());
  if (match === null) return undefined;
  const [, major, minor, patch, pre] = match;
  return {
    numbers: [Number(major), Number(minor), Number(patch)],
    labels: (pre?.split('.') ?? []).map((label) => (/^\d+$/u.test(label) ? Number(label) : label)),
  };
}

/** The version without the `v` of a tag, which is how the window says it. */
export function versionOfTag(tag: string): string {
  return tag.trim().replace(/^v/u, '');
}

/**
 * Orders two versions: negative when `left` is the older, positive when it is the newer, zero when
 * they are the same. A number in a label is before a word, and fewer labels are before more.
 */
export function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  const [leftMajor, leftMinor, leftPatch] = left.numbers;
  const [rightMajor, rightMinor, rightPatch] = right.numbers;
  const difference = leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch;
  if (difference !== 0) return difference;
  // A version with no label is the one the labelled ones lead to.
  if (left.labels.length === 0 || right.labels.length === 0) {
    return right.labels.length - left.labels.length;
  }
  for (const [index, label] of left.labels.entries()) {
    const other = right.labels[index];
    if (other === undefined) return 1;
    if (label === other) continue;
    if (typeof label === 'number' && typeof other === 'number') return label - other;
    if (typeof label === 'number') return -1;
    if (typeof other === 'number') return 1;
    return label < other ? -1 : 1;
  }
  return left.labels.length - right.labels.length;
}

/**
 * The newest release that is newer than `installed`, or that the installed one is the newest. A
 * release whose tag is not a version is not a release of the app and is left out, and a pre-release
 * is left out unless `prereleases` says to look for one.
 */
export function chooseUpdate(options: {
  readonly installed: string;
  readonly releases: readonly ReleaseSummary[];
  readonly prereleases: boolean;
}): UpdateCheck {
  const installed = parseVersion(options.installed);
  if (installed === undefined) {
    throw new Error(`The installed version is not a version: ${options.installed}`);
  }
  let newest: { readonly release: ReleaseSummary; readonly parsed: ParsedVersion } | undefined;
  for (const release of options.releases) {
    const parsed = parseVersion(release.tag);
    if (parsed === undefined) continue;
    if (release.prerelease && !options.prereleases) continue;
    if (newest === undefined || compareVersions(parsed, newest.parsed) > 0) {
      newest = { release, parsed };
    }
  }
  if (newest === undefined || compareVersions(newest.parsed, installed) <= 0) {
    return { status: 'current', version: versionOfTag(options.installed) };
  }
  return {
    status: 'available',
    version: versionOfTag(newest.release.tag),
    tag: newest.release.tag,
    ...(newest.release.publishedAt === undefined
      ? {}
      : { publishedAt: newest.release.publishedAt }),
  };
}
