import type { Preview } from '@storybook/react-vite';

import { languages } from '../src/domain/app-settings';
import { languageNames, messagesFor } from '../src/i18n/messages';
import { I18nContext } from '../src/renderer/hooks/use-messages';
import { languageOf } from '../src/renderer/stories/language';

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
  },
  initialGlobals: { language: 'en' },
  decorators: [
    (Story, context) => {
      const language = languageOf(context.globals);
      return (
        <I18nContext.Provider value={{ language, messages: messagesFor(language) }}>
          <Story />
        </I18nContext.Provider>
      );
    },
  ],
};

export default preview;
