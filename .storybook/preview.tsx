/// <reference types="vite/client" />
import type { Preview } from '@storybook/react-vite';

import { useEffect } from 'react';

import { languages } from '../src/domain/app-settings';
import { themes } from '../src/domain/theme';
import { languageNames, messagesFor } from '../src/i18n/messages';
import { I18nContext } from '../src/renderer/hooks/use-messages';
import { languageOf } from '../src/renderer/stories/language';
import { themeOf } from '../src/renderer/stories/theme';

import '../src/renderer/styles.css';

const preview: Preview = {
  parameters: {
    a11y: {
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  // The language of the window, for any story: the toolbar picks it, and the address of a story can
  // say it (`&globals=language:pt-BR`), which is how the tutorial images are made in each language.
  // A story that sets its own language (the ones called InPortuguese) keeps it, since its decorator
  // is inside this one.
  globalTypes: {
    language: {
      description: 'The language of the window',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        dynamicTitle: true,
        items: languages.map((language) => ({ value: language, title: languageNames[language] })),
      },
    },
    theme: {
      description: 'The theme of the window',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: themes.map((theme) => ({ value: theme, title: theme })),
      },
    },
  },
  // The theme every story opens in: the default one, or the one `STORYBOOK_THEME` names, which is how
  // the same stories are run once more in the light theme (`storybook-light` in vitest.config.ts).
  initialGlobals: { language: 'en', theme: themeOf({ theme: import.meta.env.STORYBOOK_THEME }) },
  decorators: [
    (Story, context) => {
      const language = languageOf(context.globals);
      // The page says which language it is in, as the app's does, so what is made for a language
      // (the forms of the characters, how a line breaks) is made for it here too.
      useEffect(() => {
        document.documentElement.lang = language;
      }, [language]);
      return (
        <I18nContext.Provider value={{ language, messages: messagesFor(language) }}>
          <Story />
        </I18nContext.Provider>
      );
    },
    // The theme, as the app puts it on the page: `styles.css` selects its variables by it (ADR 0066).
    (Story, context) => {
      const theme = themeOf(context.globals);
      useEffect(() => {
        document.documentElement.dataset.theme = theme;
      }, [theme]);
      return <Story />;
    },
  ],
};

export default preview;
