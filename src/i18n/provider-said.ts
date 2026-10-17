import type { Language } from '@/domain/app-settings';
import type { ProviderMessageValues } from '@/domain/messages/provider';

import type { SaidFor } from './say';

/** Why a source of metadata could not be used just now, in every language (ADR 0053). */
export const providerSaid: Readonly<Record<Language, SaidFor<ProviderMessageValues>>> = {
  en: {
    'provider.catalogue': () => 'Community catalogue of manga, with volume and chapter data',
    'provider.timeout': ({ service }) => `${service} did not answer in time. Try again shortly.`,
    'provider.unreachable': ({ service }) => `Could not reach ${service}.`,
    'provider.rateLimited': ({ service }) =>
      `${service} is rate-limiting requests. Try again shortly.`,
    'provider.unexpectedStatus': ({ service, status }) =>
      `${service} returned an unexpected status (${String(status)}).`,
    'provider.malformedJson': ({ service }) => `${service} returned malformed JSON.`,
    'provider.unexpectedSearch': ({ service }) =>
      `${service} returned an unexpected search response.`,
    'provider.unexpectedVolumes': ({ service }) =>
      `${service} returned an unexpected volumes response.`,
    'provider.unexpectedReleases': ({ service }) =>
      `${service} returned an unexpected list of versions.`,
  },
  'pt-BR': {
    'provider.catalogue': () => 'Catálogo comunitário de mangás, com dados de volumes e capítulos',
    'provider.timeout': ({ service }) =>
      `${service} não respondeu a tempo. Tente de novo em instantes.`,
    'provider.unreachable': ({ service }) => `Não foi possível acessar ${service}.`,
    'provider.rateLimited': ({ service }) =>
      `${service} está limitando os pedidos. Tente de novo em instantes.`,
    'provider.unexpectedStatus': ({ service, status }) =>
      `${service} devolveu um status inesperado (${String(status)}).`,
    'provider.malformedJson': ({ service }) => `${service} devolveu um JSON malformado.`,
    'provider.unexpectedSearch': ({ service }) =>
      `${service} devolveu uma resposta de busca inesperada.`,
    'provider.unexpectedVolumes': ({ service }) =>
      `${service} devolveu uma resposta de volumes inesperada.`,
    'provider.unexpectedReleases': ({ service }) =>
      `${service} devolveu uma lista de versões inesperada.`,
  },
};
