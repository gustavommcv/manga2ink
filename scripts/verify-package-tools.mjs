// Fails when the mangabind or mangapress inside an unpacked Linux package is not the file pinned in
// toolchain.lock.json. The app hashes both tools every time it starts and refuses to convert when
// either differs, so a package builder that rewrites them (rpmbuild strips and edits ELF files by
// default) installs without a word and then keeps every conversion from starting.
//
//   node scripts/verify-package-tools.mjs <label> <folder the package was unpacked into> [lock file]
//
// .github/scripts/check-package-tools.sh unpacks each package and calls this.

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const target = 'linux-x64';
const tools = ['mangabind', 'mangapress'];

const [label, unpacked, lockPath = 'toolchain.lock.json'] = process.argv.slice(2);
if (label === undefined || unpacked === undefined) {
  console.error('Usage: verify-package-tools.mjs <label> <unpacked folder> [lock file]');
  process.exit(2);
}

const lock = JSON.parse(await readFile(lockPath, 'utf8'));
const entries = await readdir(unpacked, { recursive: true });
const problems = [];

for (const tool of tools) {
  const expected = lock.tools[tool].pin.artifacts[target].executableSha256;
  const suffix = path.join('toolchain', target, tool);
  const found = entries.filter((entry) => entry === suffix || entry.endsWith(path.sep + suffix));
  if (found.length === 0) {
    problems.push(`${tool}: not in the package (looked for …/${suffix}).`);
    continue;
  }
  for (const entry of found) {
    const actual = createHash('sha256')
      .update(await readFile(path.join(unpacked, entry)))
      .digest('hex');
    if (actual !== expected) {
      problems.push(`${tool}: ${entry} is ${actual}, the lock pins ${expected}.`);
    }
  }
}

if (problems.length > 0) {
  console.error(
    `${label}: a bundled tool is not the pinned one, so the app would refuse to convert.`,
  );
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`${label}: ${tools.join(' and ')} are byte for byte the pinned ${target} tools.`);
