import type { Language } from '@/domain/app-settings';

/** What a language writes between the sentences of a note, and to end one a screen puts together. */
export interface SentenceMarks {
  /** What goes between two sentences of one note: a space, except in Japanese. */
  readonly gap: string;
  /** The mark that ends a sentence the window ends itself, after a name or a list. */
  readonly stop: string;
}

export const sentenceMarks: Readonly<Record<Language, SentenceMarks>> = {
  en: { gap: ' ', stop: '.' },
  'pt-BR': { gap: ' ', stop: '.' },
  ja: { gap: '', stop: '。' },
};
