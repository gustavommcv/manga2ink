import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  parseStoredSettings,
  serializeStoredSettings,
  settingsFileVersion,
} from '@/adapters/settings/stored-settings';
import { defaultMangapressSettings } from '@/domain/output-profile';
import { mangapressSettingsSchema } from '@/shared/workflow-contract';

/** Something that was a settings file once: the right version with whatever else got into it. */
const damaged = fc
  .record({
    mode: fc.anything(),
    format: fc.anything(),
    singleBook: fc.anything(),
    settings: fc.oneof(fc.anything(), fc.dictionary(fc.string({ maxLength: 20 }), fc.anything())),
    providerId: fc.anything(),
    outputFolder: fc.anything(),
    extra: fc.anything(),
  })
  .map((fields) => JSON.stringify({ version: settingsFileVersion, ...fields }));

describe('a settings file that was edited by hand, or damaged, or written by another version', () => {
  it('is never a crash: it is read, or it is not used', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.json(), damaged), (raw) => {
        expect(() => parseStoredSettings(raw)).not.toThrow();
      }),
      { numRuns: 400 },
    );
  });

  it('gives only options a conversion would accept, whatever it held', () => {
    fc.assert(
      fc.property(damaged, (raw) => {
        const parsed = parseStoredSettings(raw);
        if (parsed === undefined) return;
        expect(mangapressSettingsSchema.safeParse(parsed.settings.settings).success).toBe(true);
        expect(['cbz', 'epub', 'pdf']).toContain(parsed.settings.format);
      }),
      { numRuns: 400 },
    );
  });

  it('is read again as the same thing once it has been written back', () => {
    fc.assert(
      fc.property(damaged, (raw) => {
        const parsed = parseStoredSettings(raw);
        if (parsed === undefined) return;
        const again = parseStoredSettings(serializeStoredSettings(parsed.settings));
        expect(again?.settings).toEqual(parsed.settings);
        // What was out of range was put back to its default the first time: nothing is left to reset.
        expect(again?.reset).toEqual([]);
      }),
      { numRuns: 400 },
    );
  });

  it('keeps every option that was fine when only one of them was not', () => {
    const fields = Object.keys(defaultMangapressSettings);
    fc.assert(
      fc.property(fc.constantFrom(...fields), fc.anything(), (field, junk) => {
        const raw = JSON.stringify({
          version: settingsFileVersion,
          settings: { ...defaultMangapressSettings, deviceProfile: 'KS', [field]: junk },
        });
        const parsed = parseStoredSettings(raw);
        if (parsed === undefined) return;
        if (field !== 'deviceProfile') expect(parsed.settings.settings.deviceProfile).toBe('KS');
      }),
      { numRuns: 300 },
    );
  });
});
