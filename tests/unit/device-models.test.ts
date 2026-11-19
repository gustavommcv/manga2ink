import { describe, expect, it } from 'vitest';

import { conversionProfileFor, deviceModelsFor } from '@/domain/device-models';
import {
  defaultForceColorFor,
  defaultJpegQualityFor,
  defaultUpscaleFor,
} from '@/domain/output-profile';

describe('commercial device choices', () => {
  it('offers individual models with the geometry and capabilities of the available converter profile', () => {
    const profile = {
      code: 'K11',
      name: 'Kindle 11/2026',
      width: 1072,
      height: 1448,
      grayLevels: 16,
    };
    const models = deviceModelsFor([profile]);
    expect(models.find(({ code }) => code === 'K11')).toMatchObject({ year: 2022, generation: 11 });
    expect(models.find(({ code }) => code === 'K11-2024')).toMatchObject({
      year: 2024,
      generation: 11,
    });
    expect(models.find(({ code }) => code === 'K11-2026')).toMatchObject({ year: 2026 });
    expect(models.some(({ code }) => code.startsWith('KPW'))).toBe(false);
    for (const model of models) {
      expect(model).toMatchObject({ width: 1072, height: 1448, grayLevels: 16 });
      expect(conversionProfileFor(model.code)).toBe('K11');
    }
  });

  it('keeps every existing converter choice and gives each model a unique saved identity', () => {
    const codes = [
      'K1',
      'K2',
      'KDX',
      'K34',
      'K57',
      'KPW',
      'KV',
      'KPW34',
      'K810',
      'KO',
      'K11',
      'KPW5',
      'KPW6',
      'KS',
      'KCS',
      'KS3',
      'KSCS',
      'KoMT',
      'KoG',
      'KoGHD',
      'KoA',
      'KoAHD',
      'KoAH2O',
      'KoAO',
      'KoN',
      'KoC',
      'KoCC',
      'KoL',
      'KoLC',
      'KoF',
      'KoS',
      'KoE',
      'Rmk1',
      'Rmk2',
      'RmkPP',
      'RmkPPMove',
    ];
    const models = deviceModelsFor(codes.map((code) => ({ code, name: code })));
    expect(new Set(models.map(({ code }) => code)).size).toBe(models.length);
    for (const code of codes) {
      expect(models.some((model) => model.code === code)).toBe(true);
      expect(conversionProfileFor(code)).toBe(code);
    }
    for (const model of models) {
      const profile = conversionProfileFor(model.code);
      expect(codes).toContain(profile);
      expect(defaultForceColorFor(model.code)).toBe(defaultForceColorFor(profile));
      expect(defaultUpscaleFor(model.code)).toBe(defaultUpscaleFor(profile));
      expect(defaultJpegQualityFor(model.code)).toBe(defaultJpegQualityFor(profile));
    }
  });

  it.each([
    ['KPW6-signature-2024', 'KPW6'],
    ['KPW34-2018', 'KPW34'],
    ['KCS-2025', 'KCS'],
    ['KS-2024', 'KS'],
    ['KoC-bw', 'KoC'],
    ['KoL-2', 'KoL'],
    ['KoE-2e', 'KoE'],
    ['KoMT-touch-2', 'KoMT'],
  ])('routes %s to the supported profile %s', (model, profile) => {
    expect(conversionProfileFor(model)).toBe(profile);
  });

  it.each(['OTHER', '1920x1440', 'future-profile', 'toString'])(
    'preserves unrecognized profile %s',
    (code) => {
      const profile = { code, name: 'Custom screen', width: 1920, height: 1440 };
      expect(deviceModelsFor([profile])).toEqual([profile]);
      expect(conversionProfileFor(code)).toBe(code);
    },
  );

  it('offers no models without an available converter profile', () => {
    expect(deviceModelsFor([])).toEqual([]);
  });
});
