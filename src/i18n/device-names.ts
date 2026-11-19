import type { Language } from '@/domain/app-settings';
import type { DeviceModel } from '@/domain/device-models';

const englishOrdinals = new Intl.PluralRules('en', { type: 'ordinal' });
const suffixes: Readonly<Record<Intl.LDMLPluralRule, string>> = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
  zero: 'th',
  many: 'th',
};

const generations: Readonly<Record<Language, (generation: number) => string>> = {
  en: (generation) =>
    `${String(generation)}${suffixes[englishOrdinals.select(generation)]} generation`,
  'pt-BR': (generation) => `${String(generation)}ª geração`,
  ja: (generation) => `第${String(generation)}世代`,
};

const withoutFrontLight: Readonly<Record<Language, string>> = {
  en: 'Kindle Scribe without Front Light',
  'pt-BR': 'Kindle Scribe sem iluminação frontal',
  ja: 'Kindle Scribe フロントライトなし',
};

/** Keep the model name recognizable in each language and the release year visible. */
export function deviceName(model: DeviceModel, language: Language): string {
  const name =
    model.name === 'Kindle Scribe without Front Light' ? withoutFrontLight[language] : model.name;
  if (model.year === undefined) return name;
  const open = language === 'ja' ? '（' : ' (';
  const close = language === 'ja' ? '）' : ')';
  if (model.generation === undefined) return `${name}${open}${String(model.year)}${close}`;
  const generation = generations[language](model.generation);
  if (model.name === 'Kindle') return `${name} ${generation}${open}${String(model.year)}${close}`;
  const separator = language === 'ja' ? '、' : ', ';
  return `${name}${open}${String(model.year)}${separator}${generation}${close}`;
}
