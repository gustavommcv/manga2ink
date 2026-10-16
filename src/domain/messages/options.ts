import type { NoValues } from './values';

/** The options whose typed value is checked, which a sentence about a value names (ADR 0053). */
export type CheckedOption =
  | 'croppingPower'
  | 'croppingMinimum'
  | 'preserveMargin'
  | 'jpegQuality'
  | 'gamma'
  | 'customWidth'
  | 'customHeight';

/**
 * Why a conversion option has no effect with the other choices, and what is wrong with a value
 * typed for one, in the words of a code (ADR 0053).
 */
export interface OptionsMessageValues {
  /** Why a control is left without effect, and stays visible with its value (ADR 0005). */
  readonly 'options.lock.webtoon': NoValues;
  readonly 'options.lock.strips': NoValues;
  readonly 'options.lock.untouched': NoValues;
  readonly 'options.lock.pngOnly': NoValues;
  readonly 'options.lock.epubOnly': NoValues;
  readonly 'options.lock.bordersWebtoon': NoValues;
  readonly 'options.lock.bothVersions': NoValues;
  readonly 'options.lock.wholeSpreadKept': NoValues;
  readonly 'options.lock.spreadUpright': NoValues;
  readonly 'options.lock.noJpeg': NoValues;
  readonly 'options.lock.alreadyEightBit': NoValues;
  readonly 'options.lock.alwaysEightBitPdf': NoValues;
  readonly 'options.lock.colorKept': NoValues;
  readonly 'options.lock.pdfNoCover': NoValues;
  readonly 'options.lock.cbzCoverCut': NoValues;
  readonly 'options.lock.koboEpub': NoValues;
  readonly 'options.lock.customNamesEpub': NoValues;

  /** What is wrong with a value that was typed. */
  readonly 'options.issue.chooseDevice': NoValues;
  readonly 'options.issue.customSizeBoth': NoValues;
  readonly 'options.issue.languageCode': NoValues;
  readonly 'options.issue.number': {
    readonly option: CheckedOption;
    readonly minimum: number;
    readonly maximum: number;
  };
  readonly 'options.issue.percent': { readonly option: CheckedOption };
  readonly 'options.issue.whole': {
    readonly option: CheckedOption;
    readonly minimum: number;
    readonly maximum: number;
  };
}
