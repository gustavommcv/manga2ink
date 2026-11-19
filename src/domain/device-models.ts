/** A commercial device name. Screen dimensions and families come from the bundled converter. */
export interface DeviceModel {
  readonly code: string;
  readonly name: string;
  readonly year?: number;
  readonly generation?: number;
}

/** The first model keeps the existing profile code so earlier saved choices remain selectable. */
const models: Readonly<Record<string, readonly DeviceModel[]>> = {
  K1: [{ code: 'K1', name: 'Kindle', year: 2007, generation: 1 }],
  K2: [{ code: 'K2', name: 'Kindle', year: 2009, generation: 2 }],
  KDX: [
    { code: 'KDX', name: 'Kindle DX', year: 2009, generation: 2 },
    { code: 'KDX-2010', name: 'Kindle DX Graphite', year: 2010, generation: 2 },
  ],
  K34: [
    { code: 'K34', name: 'Kindle Keyboard', year: 2010, generation: 3 },
    { code: 'K34-touch', name: 'Kindle Touch', year: 2011, generation: 4 },
  ],
  K57: [
    { code: 'K57', name: 'Kindle', year: 2012, generation: 5 },
    { code: 'K57-2014', name: 'Kindle', year: 2014, generation: 7 },
    { code: 'K57-2011', name: 'Kindle', year: 2011, generation: 4 },
  ],
  KPW: [
    { code: 'KPW', name: 'Kindle Paperwhite', year: 2012, generation: 5 },
    { code: 'KPW-2013', name: 'Kindle Paperwhite', year: 2013, generation: 6 },
  ],
  KV: [{ code: 'KV', name: 'Kindle Voyage', year: 2014, generation: 7 }],
  KPW34: [
    { code: 'KPW34', name: 'Kindle Paperwhite', year: 2015, generation: 7 },
    { code: 'KPW34-2018', name: 'Kindle Paperwhite', year: 2018, generation: 10 },
    { code: 'KPW34-oasis', name: 'Kindle Oasis', year: 2016, generation: 8 },
  ],
  K810: [
    { code: 'K810', name: 'Kindle', year: 2016, generation: 8 },
    { code: 'K810-2019', name: 'Kindle', year: 2019, generation: 10 },
    { code: 'K810-kids', name: 'Kindle Kids', year: 2019, generation: 10 },
  ],
  KO: [
    { code: 'KO', name: 'Kindle Oasis', year: 2017, generation: 9 },
    { code: 'KO-2019', name: 'Kindle Oasis', year: 2019, generation: 10 },
  ],
  K11: [
    { code: 'K11', name: 'Kindle', year: 2022, generation: 11 },
    { code: 'K11-2024', name: 'Kindle', year: 2024, generation: 11 },
    { code: 'K11-2026', name: 'Kindle', year: 2026 },
    { code: 'K11-aluminum', name: 'Kindle Aluminum', year: 2026 },
    { code: 'K11-kids-2022', name: 'Kindle Kids', year: 2022, generation: 11 },
    { code: 'K11-kids-2024', name: 'Kindle Kids', year: 2024, generation: 11 },
    { code: 'K11-kids-2026', name: 'Kindle Kids', year: 2026 },
  ],
  KPW5: [
    { code: 'KPW5', name: 'Kindle Paperwhite', year: 2021, generation: 11 },
    {
      code: 'KPW5-signature',
      name: 'Kindle Paperwhite Signature Edition',
      year: 2021,
      generation: 11,
    },
    { code: 'KPW5-kids', name: 'Kindle Paperwhite Kids', year: 2021, generation: 11 },
  ],
  KPW6: [
    { code: 'KPW6', name: 'Kindle Paperwhite', year: 2024, generation: 12 },
    {
      code: 'KPW6-signature-2024',
      name: 'Kindle Paperwhite Signature Edition',
      year: 2024,
      generation: 12,
    },
    { code: 'KPW6-kids-2024', name: 'Kindle Paperwhite Kids', year: 2024, generation: 12 },
    { code: 'KPW6-2026', name: 'Kindle Paperwhite', year: 2026 },
    { code: 'KPW6-signature-2026', name: 'Kindle Paperwhite Signature Edition', year: 2026 },
    { code: 'KPW6-kids-2026', name: 'Kindle Paperwhite Kids', year: 2026 },
  ],
  KS: [
    { code: 'KS', name: 'Kindle Scribe', year: 2022 },
    { code: 'KS-2024', name: 'Kindle Scribe', year: 2024 },
  ],
  KCS: [
    { code: 'KCS', name: 'Kindle Colorsoft Signature Edition', year: 2024, generation: 1 },
    { code: 'KCS-2025', name: 'Kindle Colorsoft', year: 2025, generation: 1 },
    { code: 'KCS-kids-2025', name: 'Kindle Colorsoft Kids', year: 2025, generation: 1 },
    { code: 'KCS-2026', name: 'Kindle Colorsoft', year: 2026 },
    { code: 'KCS-signature-2026', name: 'Kindle Colorsoft Signature Edition', year: 2026 },
    { code: 'KCS-kids-2026', name: 'Kindle Colorsoft Kids', year: 2026 },
  ],
  KS3: [
    { code: 'KS3', name: 'Kindle Scribe', year: 2025, generation: 3 },
    {
      code: 'KS3-no-front-light',
      name: 'Kindle Scribe without Front Light',
      year: 2026,
      generation: 3,
    },
  ],
  KSCS: [{ code: 'KSCS', name: 'Kindle Scribe Colorsoft', year: 2025, generation: 1 }],
  KoMT: [
    { code: 'KoMT', name: 'Kobo Mini', year: 2012 },
    { code: 'KoMT-touch', name: 'Kobo Touch', year: 2011 },
    { code: 'KoMT-touch-2', name: 'Kobo Touch 2.0', year: 2015 },
  ],
  KoG: [{ code: 'KoG', name: 'Kobo Glo', year: 2012 }],
  KoGHD: [{ code: 'KoGHD', name: 'Kobo Glo HD', year: 2015 }],
  KoA: [{ code: 'KoA', name: 'Kobo Aura', year: 2013 }],
  KoAHD: [{ code: 'KoAHD', name: 'Kobo Aura HD', year: 2013 }],
  KoAH2O: [{ code: 'KoAH2O', name: 'Kobo Aura H2O', year: 2014 }],
  KoAO: [{ code: 'KoAO', name: 'Kobo Aura ONE', year: 2016 }],
  KoN: [{ code: 'KoN', name: 'Kobo Nia', year: 2020 }],
  KoC: [
    { code: 'KoC', name: 'Kobo Clara HD', year: 2018 },
    { code: 'KoC-2e', name: 'Kobo Clara 2E', year: 2022 },
    { code: 'KoC-bw', name: 'Kobo Clara BW', year: 2024 },
  ],
  KoCC: [{ code: 'KoCC', name: 'Kobo Clara Colour', year: 2024 }],
  KoL: [
    { code: 'KoL', name: 'Kobo Libra H2O', year: 2019 },
    { code: 'KoL-2', name: 'Kobo Libra 2', year: 2021 },
  ],
  KoLC: [{ code: 'KoLC', name: 'Kobo Libra Colour', year: 2024 }],
  KoF: [{ code: 'KoF', name: 'Kobo Forma', year: 2018 }],
  KoS: [{ code: 'KoS', name: 'Kobo Sage', year: 2021 }],
  KoE: [
    { code: 'KoE', name: 'Kobo Elipsa', year: 2021 },
    { code: 'KoE-2e', name: 'Kobo Elipsa 2E', year: 2023 },
  ],
  Rmk1: [{ code: 'Rmk1', name: 'reMarkable 1', year: 2017 }],
  Rmk2: [{ code: 'Rmk2', name: 'reMarkable 2', year: 2020 }],
  RmkPP: [{ code: 'RmkPP', name: 'reMarkable Paper Pro', year: 2024 }],
  RmkPPMove: [{ code: 'RmkPPMove', name: 'reMarkable Paper Pro Move', year: 2025 }],
};

const conversionProfiles = new Map(
  Object.entries(models).flatMap(([profile, entries]) =>
    entries.map((model) => [model.code, profile]),
  ),
);
const modelGroups = new Map(Object.entries(models));

/** The converter receives its own profile code, including for choices saved by earlier versions. */
export function conversionProfileFor(modelCode: string): string {
  return conversionProfiles.get(modelCode) ?? modelCode;
}

/** Offer a model only while its conversion profile is actually advertised by the bundled tool. */
export function deviceModelsFor<Profile extends { readonly code: string; readonly name: string }>(
  profiles: readonly Profile[],
): readonly (Profile & DeviceModel)[] {
  return profiles.flatMap((profile) => {
    const entries = modelGroups.get(profile.code);
    if (entries === undefined) return [profile];
    return entries.map((model) => ({ ...profile, ...model }));
  });
}
