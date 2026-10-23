import type { Language } from '@/domain/app-settings';
import type { ToolchainMessageValues } from '@/domain/messages/toolchain';

import type { SaidFor } from './say';

/** What the app says of its bundled tools once it has checked them, in every language (ADR 0053). */
export const toolchainSaid: Readonly<Record<Language, SaidFor<ToolchainMessageValues>>> = {
  en: {
    'toolchain.ready': () => 'Bundled conversion tools are verified and ready.',
    'toolchain.unavailable': () =>
      'Conversion is unavailable until the bundled tools are restored.',
    'toolchain.noTarget': ({ platform, arch }) =>
      `Manga2Ink does not bundle tools for ${platform}-${arch}.`,
    'toolchain.manifestUnverified': () =>
      'The bundled-tool manifest could not be verified. Reinstall Manga2Ink.',
    'toolchain.checkFailed': () => 'The bundled conversion tools could not be checked.',
    'toolchain.toolReady': ({ tool, release }) => `${tool} ${release} is verified.`,
    'toolchain.toolFailed': ({ tool }) =>
      `${tool} could not be verified. Reinstall Manga2Ink to restore its bundled tools.`,
  },
  'pt-BR': {
    'toolchain.ready': () =>
      'As ferramentas de conversão incluídas foram verificadas e estão prontas.',
    'toolchain.unavailable': () =>
      'A conversão fica indisponível até que as ferramentas incluídas sejam restauradas.',
    'toolchain.noTarget': ({ platform, arch }) =>
      `O Manga2Ink não inclui ferramentas para ${platform}-${arch}.`,
    'toolchain.manifestUnverified': () =>
      'Não foi possível verificar a lista das ferramentas incluídas. Reinstale o Manga2Ink.',
    'toolchain.checkFailed': () =>
      'Não foi possível verificar as ferramentas de conversão incluídas.',
    'toolchain.toolReady': ({ tool, release }) => `${tool} ${release} foi verificado.`,
    'toolchain.toolFailed': ({ tool }) =>
      `Não foi possível verificar ${tool}. Reinstale o Manga2Ink para restaurar as ferramentas incluídas.`,
  },
  ja: {
    'toolchain.ready': () => '同梱の変換ツールは検証済みで、使用できます。',
    'toolchain.unavailable': () => '同梱のツールが復元されるまで、変換は利用できません。',
    'toolchain.noTarget': ({ platform, arch }) =>
      `Manga2Ink は ${platform}-${arch} 向けのツールを同梱していません。`,
    'toolchain.manifestUnverified': () =>
      '同梱ツールのマニフェストを検証できませんでした。Manga2Ink を再インストールしてください。',
    'toolchain.checkFailed': () => '同梱の変換ツールを確認できませんでした。',
    'toolchain.toolReady': ({ tool, release }) => `${tool} ${release} は検証済みです。`,
    'toolchain.toolFailed': ({ tool }) =>
      `${tool} を検証できませんでした。Manga2Ink を再インストールして、同梱のツールを復元してください。`,
  },
};
