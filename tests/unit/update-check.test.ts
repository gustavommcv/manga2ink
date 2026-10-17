import { describe, expect, it } from 'vitest';

import fc from 'fast-check';

import {
  chooseUpdate,
  compareVersions,
  parseVersion,
  type ReleaseSummary,
  versionOfTag,
} from '@/domain/update-check';

const order = (left: string, right: string): number => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (a === undefined || b === undefined) throw new Error('not a version');
  return Math.sign(compareVersions(a, b));
};

describe('a version as the releases write it', () => {
  it('is read with or without the v of a tag, and with a pre-release label or build', () => {
    expect(parseVersion('v0.1.0-alpha.15')).toEqual({
      numbers: [0, 1, 0],
      labels: ['alpha', 15],
    });
    expect(parseVersion('1.2.3')).toEqual({ numbers: [1, 2, 3], labels: [] });
    expect(parseVersion(' 2.0.0+build.5 ')).toEqual({ numbers: [2, 0, 0], labels: [] });
  });

  it.each(['', 'latest', '1.2', '1.2.3.4', 'v1.2.x', '1.2.3-', '01a.2.3', '1.2.3-alpha..1'])(
    'is not read from %j',
    (text) => {
      expect(parseVersion(text)).toBeUndefined();
    },
  );

  it('is said without the v of its tag', () => {
    expect(versionOfTag('v0.1.0-alpha.16')).toBe('0.1.0-alpha.16');
    expect(versionOfTag(' 1.0.0 ')).toBe('1.0.0');
  });
});

describe('the order of versions', () => {
  it('is by the three numbers first, and a number is a number, not text', () => {
    expect(order('0.1.0', '0.1.1')).toBe(-1);
    expect(order('0.2.0', '0.1.9')).toBe(1);
    expect(order('1.0.0', '0.9.9')).toBe(1);
    expect(order('0.1.10', '0.1.9')).toBe(1);
  });

  it('puts a pre-release before the version it leads to, and an alpha after the alpha before it', () => {
    expect(order('0.1.0-alpha.15', '0.1.0')).toBe(-1);
    expect(order('0.1.0', '0.1.0-alpha.15')).toBe(1);
    expect(order('0.1.0-alpha.9', '0.1.0-alpha.10')).toBe(-1);
    expect(order('0.1.0-alpha.10', '0.1.0-alpha.9')).toBe(1);
    expect(order('0.1.0-alpha.15', '0.1.0-alpha.15')).toBe(0);
    expect(order('0.1.0', '0.1.0')).toBe(0);
  });

  it('follows semver for the labels: a number before a word, words as text, more labels after fewer', () => {
    expect(order('1.0.0-1', '1.0.0-alpha')).toBe(-1);
    expect(order('1.0.0-alpha', '1.0.0-1')).toBe(1);
    expect(order('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
    expect(order('1.0.0-beta', '1.0.0-alpha')).toBe(1);
    expect(order('1.0.0-alpha', '1.0.0-alpha.1')).toBe(-1);
    expect(order('1.0.0-alpha.1', '1.0.0-alpha')).toBe(1);
    expect(order('1.0.0-alpha.beta', '1.0.0-beta')).toBe(-1);
    expect(order('1.0.0-beta.2', '1.0.0-beta.11')).toBe(-1);
    expect(order('1.0.0-rc.1', '1.0.0')).toBe(-1);
  });

  const version = fc
    .tuple(
      fc.nat({ max: 3 }),
      fc.nat({ max: 3 }),
      fc.nat({ max: 3 }),
      fc.option(
        fc.array(
          fc.oneof(fc.nat({ max: 12 }).map(String), fc.constantFrom('alpha', 'beta', 'rc')),
          {
            minLength: 1,
            maxLength: 3,
          },
        ),
        { nil: undefined },
      ),
    )
    .map(([major, minor, patch, labels]) => {
      const text = `${String(major)}.${String(minor)}.${String(patch)}${
        labels === undefined ? '' : `-${labels.join('.')}`
      }`;
      return text;
    });

  it('is a total order: the reverse says the opposite, and two sides of a third are ordered', () => {
    fc.assert(
      fc.property(version, version, version, (a, b, c) => {
        expect(order(a, b)).toBe(-order(b, a));
        expect(order(a, a)).toBe(0);
        if (order(a, b) <= 0 && order(b, c) <= 0) expect(order(a, c)).toBeLessThanOrEqual(0);
      }),
    );
  });
});

describe('the update a check finds', () => {
  const release = (tag: string, prerelease = true, publishedAt?: string): ReleaseSummary => ({
    tag,
    prerelease,
    ...(publishedAt === undefined ? {} : { publishedAt }),
  });

  it('is the newest release when it is newer than the one that is running, with its date', () => {
    expect(
      chooseUpdate({
        installed: '0.1.0-alpha.15',
        releases: [
          release('v0.1.0-alpha.14'),
          release('v0.1.0-alpha.16', true, '2026-10-20T10:00:00Z'),
          release('v0.1.0-alpha.15'),
        ],
        prereleases: true,
      }),
    ).toEqual({
      status: 'available',
      version: '0.1.0-alpha.16',
      tag: 'v0.1.0-alpha.16',
      publishedAt: '2026-10-20T10:00:00Z',
    });
  });

  it('says nothing of a date a release does not give', () => {
    const found = chooseUpdate({
      installed: '0.1.0-alpha.15',
      releases: [release('v0.1.0-alpha.16')],
      prereleases: true,
    });

    expect(found).toEqual({
      status: 'available',
      version: '0.1.0-alpha.16',
      tag: 'v0.1.0-alpha.16',
    });
  });

  it('is that the installed version is the newest when nothing is newer, or the same', () => {
    for (const releases of [
      [],
      [release('v0.1.0-alpha.15')],
      [release('v0.1.0-alpha.14'), release('v0.1.0-alpha.15')],
    ]) {
      expect(chooseUpdate({ installed: 'v0.1.0-alpha.15', releases, prereleases: true })).toEqual({
        status: 'current',
        version: '0.1.0-alpha.15',
      });
    }
  });

  it('leaves out a pre-release unless one is looked for, and a tag that is not a version at all', () => {
    const releases = [
      release('v0.2.0-alpha.1'),
      release('nightly'),
      release('v0.1.1', false),
      release('v0.1.0-alpha.20'),
    ];

    expect(chooseUpdate({ installed: '0.1.0', releases, prereleases: false })).toMatchObject({
      status: 'available',
      version: '0.1.1',
    });
    expect(chooseUpdate({ installed: '0.1.0', releases, prereleases: true })).toMatchObject({
      status: 'available',
      version: '0.2.0-alpha.1',
    });
    expect(chooseUpdate({ installed: '0.1.1', releases, prereleases: false })).toEqual({
      status: 'current',
      version: '0.1.1',
    });
  });

  it('is a failure, not a guess, when the installed version is not a version', () => {
    expect(() =>
      chooseUpdate({ installed: 'dev', releases: [release('v1.0.0')], prereleases: true }),
    ).toThrow('not a version');
  });
});
