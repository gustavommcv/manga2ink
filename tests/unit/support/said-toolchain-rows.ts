import type { ToolchainMessageValues } from '@/domain/messages/toolchain';

import type { Rows } from './said-table';

/** What the app says of its bundled tools once it has checked them (ADR 0053). */
export const toolchainRows: Rows<ToolchainMessageValues> = {
  'toolchain.ready': [
    [
      {},
      'Bundled conversion tools are verified and ready.',
      'As ferramentas de conversão incluídas foram verificadas e estão prontas.',
    ],
  ],
  'toolchain.unavailable': [
    [
      {},
      'Conversion is unavailable until the bundled tools are restored.',
      'A conversão fica indisponível até que as ferramentas incluídas sejam restauradas.',
    ],
  ],
  'toolchain.noTarget': [
    [
      { platform: 'linux', arch: 'arm64' },
      'Manga2Ink does not bundle tools for linux-arm64.',
      'O Manga2Ink não inclui ferramentas para linux-arm64.',
    ],
  ],
  'toolchain.manifestUnverified': [
    [
      {},
      'The bundled-tool manifest could not be verified. Reinstall Manga2Ink.',
      'Não foi possível verificar a lista das ferramentas incluídas. Reinstale o Manga2Ink.',
    ],
  ],
  'toolchain.checkFailed': [
    [
      {},
      'The bundled conversion tools could not be checked.',
      'Não foi possível verificar as ferramentas de conversão incluídas.',
    ],
  ],
  'toolchain.toolReady': [
    [
      { tool: 'mangabind', release: 'v0.7.2' },
      'mangabind v0.7.2 is verified.',
      'mangabind v0.7.2 foi verificado.',
    ],
  ],
  'toolchain.toolFailed': [
    [
      { tool: 'mangaprep' },
      'mangaprep could not be verified. Reinstall Manga2Ink to restore its bundled tools.',
      'Não foi possível verificar mangaprep. Reinstale o Manga2Ink para restaurar as ferramentas incluídas.',
    ],
  ],
};
