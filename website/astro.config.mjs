// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import { base, languages, site } from './site.config.mjs';

// The card that a link to any page of the guide shows when it is shared: `public/social-preview.png`.
const socialPreview = new URL(`${base.replace(/\/?$/, '/')}social-preview.png`, site).href;

// https://astro.build/config
export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: { webp: { lossless: true } },
    },
  },
  // This package must not load the Electron application's parent PostCSS configuration.
  vite: { css: { postcss: { plugins: [] } } },
  devToolbar: {
    enabled: false,
  },
  integrations: [
    starlight({
      title: 'Mangabound',
      logo: { src: './src/assets/branding/header.webp', alt: '', replacesTitle: false },
      favicon: '/favicon.ico',
      description:
        'Mangabound organizes manga chapters into volumes, converts them into EPUB, CBZ or PDF for your e-reader, and shares books with KOReader over your local network.',
      routeMiddleware: './src/routeData.ts',
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: socialPreview } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Mangabound logo' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: socialPreview } },
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/gustavommcv/mangabound' },
      ],
      defaultLocale: 'root',
      locales: Object.fromEntries(languages.map(({ key, label, lang }) => [key, { label, lang }])),
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Introduction',
          translations: { 'pt-BR': 'Introdução', ja: 'はじめに' },
          slug: 'index',
        },
        {
          label: 'User Guide',
          translations: { 'pt-BR': 'Guia do Usuário', ja: 'ユーザーガイド' },
          items: [
            { slug: 'getting-started/installation' },
            { slug: 'getting-started/quickstart' },
            { slug: 'user-guide/adding-manga' },
            { slug: 'user-guide/mapping-editor' },
            { slug: 'user-guide/output-profiles' },
            {
              label: 'Advanced options',
              translations: { 'pt-BR': 'Opções avançadas', ja: '詳細オプション' },
              items: [
                { slug: 'user-guide/advanced-options' },
                { slug: 'user-guide/advanced-options/reading' },
                { slug: 'user-guide/advanced-options/cropping' },
                { slug: 'user-guide/advanced-options/color-and-tone' },
                { slug: 'user-guide/advanced-options/double-page-spreads' },
                { slug: 'user-guide/advanced-options/size-and-borders' },
                { slug: 'user-guide/advanced-options/page-images' },
                { slug: 'user-guide/advanced-options/cover' },
                { slug: 'user-guide/advanced-options/book-metadata' },
              ],
            },
            { slug: 'user-guide/processing' },
            { slug: 'user-guide/exporting' },
            { slug: 'getting-started/overview' },
          ],
        },
        {
          label: 'KOReader & E-Reader Setup',
          translations: { 'pt-BR': 'KOReader e E-Readers', ja: 'KOReader と電子書籍リーダー' },
          items: [
            { slug: 'koreader/opds-sharing' },
            { slug: 'koreader/connecting' },
            { slug: 'koreader/recommended-settings' },
          ],
        },
        {
          label: 'CLI Reference (Power Users)',
          translations: { 'pt-BR': 'Referência das CLIs', ja: 'CLI リファレンス（上級者向け）' },
          items: [
            { slug: 'cli/mangabind' },
            { slug: 'cli/mangapress' },
            { slug: 'cli/machine-protocol' },
          ],
        },
        {
          label: 'Contributing & Development',
          translations: { 'pt-BR': 'Contribuição e Desenvolvimento', ja: '貢献と開発' },
          items: [{ slug: 'development/architecture' }, { slug: 'development/metadata-providers' }],
        },
      ],
    }),
  ],
});
