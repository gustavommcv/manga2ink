import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { base } from '../../site.config.mjs';

const root = base.replace(/\/?$/, '/');

// A page every language has, in the three languages of the site.
const directories = { en: '', 'pt-BR': 'pt-br/', ja: 'ja/' };
const address = (lang, suffix = '') =>
  `${root}${directories[lang]}getting-started/installation/${suffix}`;

/** What the suggestion says, in the language it suggests: the words of `languageSuggestion` of the catalogs. */
const words = {
  en: {
    label: 'Language of this page',
    message: 'Your browser is set to English, and this guide is available in English.',
    switch: 'Switch to English',
    dismiss: 'Not now',
    never: 'Don’t ask again',
  },
  'pt-BR': {
    label: 'Idioma desta página',
    message: 'Seu navegador está em português, e este guia está disponível em português.',
    switch: 'Mudar para português',
    dismiss: 'Agora não',
    never: 'Não perguntar de novo',
  },
  ja: {
    label: 'このページの言語',
    message: 'お使いのブラウザは日本語に設定されています。このガイドは日本語でも読めます。',
    switch: '日本語に切り替える',
    dismiss: '今はしない',
    never: '今後は表示しない',
  },
};

/** Makes the browser ask for these languages, the one it wants most first, as a reader's browser does. */
async function asking(page, languages) {
  await page.addInitScript((list) => {
    Object.defineProperty(navigator, 'languages', { get: () => list });
    Object.defineProperty(navigator, 'language', { get: () => list[0] });
  }, languages);
}

const suggestion = (page) => page.locator('[data-language-suggestion] section');

/** The menu of a narrow screen holds the selector of the language. */
async function openMenuIfNarrow(page, testInfo) {
  if (testInfo.project.name === 'mobile') await page.locator('button.sl-menu-button').click();
}

const pairs = [
  ['en', 'pt-BR'],
  ['en', 'ja'],
  ['pt-BR', 'en'],
  ['pt-BR', 'ja'],
  ['ja', 'en'],
  ['ja', 'pt-BR'],
];

for (const [pageLanguage, readerLanguage] of pairs) {
  test(`a page in ${pageLanguage} suggests ${readerLanguage} to a browser that asks for it, in ${readerLanguage}`, async ({
    page,
  }) => {
    await asking(page, [readerLanguage]);
    await page.goto(address(pageLanguage, '?search=1#install'));

    const box = suggestion(page);
    await expect(box).toBeVisible();
    await expect(box).toHaveAttribute('lang', readerLanguage);
    await expect(box).toHaveAccessibleName(words[readerLanguage].label);
    await expect(box).toContainText(words[readerLanguage].message);
    // The same page, in that language, with what was asked for and where in it.
    await expect(box.getByRole('link', { name: words[readerLanguage].switch })).toHaveAttribute(
      'href',
      address(readerLanguage, '?search=1#install'),
    );
    await expect(box.getByRole('button', { name: words[readerLanguage].dismiss })).toBeVisible();
    await expect(box.getByRole('button', { name: words[readerLanguage].never })).toBeVisible();
  });
}

for (const lang of Object.keys(directories)) {
  test(`a page in ${lang} suggests nothing to a browser that asks for ${lang}`, async ({
    page,
  }) => {
    await asking(page, [lang, 'de']);
    await page.goto(address(lang));

    await expect(page.locator('[data-language-suggestion]')).toBeHidden();
    await expect(suggestion(page)).toHaveCount(0);
  });
}

test('a browser that asks for languages the site does not have is suggested nothing', async ({
  page,
}) => {
  await asking(page, ['de-DE', 'fr']);
  await page.goto(address('en'));

  await expect(suggestion(page)).toHaveCount(0);
});

test('the first language the site has is the one suggested, whichever the browser asks for first', async ({
  page,
}) => {
  await asking(page, ['de-DE', 'ja-JP', 'pt-BR']);
  await page.goto(address('en'));

  await expect(suggestion(page)).toHaveAttribute('lang', 'ja');
});

test('another region of the language comes to the language of the site', async ({ page }) => {
  await asking(page, ['pt-PT']);
  await page.goto(address('en'));

  await expect(suggestion(page)).toHaveAttribute('lang', 'pt-BR');
});

test('the words of the other languages are not text of the page', async ({ page }) => {
  await asking(page, ['en']);
  await page.goto(address('en'));

  const text = await page.locator('main').innerText();
  expect(text).not.toContain(words['pt-BR'].message);
  expect(text).not.toContain(words.ja.message);
  await expect(page.locator('[data-language-suggestion]')).toHaveAttribute('data-pagefind-ignore');
});

test('the not-found page suggests nothing: it is at no address in another language', async ({
  page,
}) => {
  await asking(page, ['ja']);
  await page.goto(`${root}this-page-does-not-exist/`);

  await expect(suggestion(page)).toHaveCount(0);
});

test('the link goes to the same page in the language, which says nothing more', async ({
  page,
}) => {
  await asking(page, ['pt-BR']);
  await page.goto(address('en'));

  await suggestion(page).getByRole('link', { name: words['pt-BR'].switch }).click();

  await expect(page).toHaveURL(address('pt-BR'));
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await expect(suggestion(page)).toHaveCount(0);
});

test('every address it leads to is a page of the site', async ({ page }) => {
  await asking(page, ['ja']);
  // A page far from the front, and one of the first a reader meets. A page a language does not translate yet
  // would be Starlight's fallback page at the same address (ADR 0051), so the address would exist all the same.
  for (const slug of ['cli/mangabind/', 'getting-started/installation/']) {
    await page.goto(`${root}${slug}`);
    const href = await suggestion(page)
      .getByRole('link', { name: words.ja.switch })
      .getAttribute('href');
    expect(href).toBe(`${root}ja/${slug}`);
    const response = await page.request.get(href);
    expect(response.ok(), href).toBe(true);
  }
});

test('"Not now" puts it away for the visit: it stays away on this tab and comes back on a new one', async ({
  page,
  context,
}) => {
  await asking(page, ['pt-BR']);
  await page.goto(address('en'));
  await suggestion(page).getByRole('button', { name: words['pt-BR'].dismiss }).click();
  await expect(suggestion(page)).toHaveCount(0);

  await page.reload();
  await expect(suggestion(page)).toHaveCount(0);
  await page.goto(address('en'));
  await expect(suggestion(page)).toHaveCount(0);

  const another = await context.newPage();
  await asking(another, ['pt-BR']);
  await another.goto(address('en'));
  await expect(suggestion(another)).toBeVisible();
});

test('"Don’t ask again" puts it away for good: on this tab, a new one, and every language', async ({
  page,
  context,
}) => {
  await asking(page, ['pt-BR']);
  await page.goto(address('en'));
  await suggestion(page).getByRole('button', { name: words['pt-BR'].never }).click();
  await expect(suggestion(page)).toHaveCount(0);

  await page.reload();
  await expect(suggestion(page)).toHaveCount(0);

  const another = await context.newPage();
  await asking(another, ['pt-BR']);
  for (const lang of ['en', 'ja']) {
    await another.goto(address(lang));
    await expect(suggestion(another)).toHaveCount(0);
  }
});

test('a reader who chooses a language with the selector of the site is not suggested another on it', async ({
  page,
}, testInfo) => {
  await asking(page, ['pt-BR']);
  await page.goto(address('en'));
  await expect(suggestion(page)).toBeVisible();

  await openMenuIfNarrow(page, testInfo);
  await page
    .locator('starlight-lang-select select')
    .filter({ visible: true })
    .first()
    .selectOption({ label: '日本語' });
  await expect(page).toHaveURL(address('ja'));
  await expect(suggestion(page)).toHaveCount(0);

  // It was the Japanese page that was chosen: the English one still suggests the reader's own.
  await page.goto(address('en'));
  await expect(suggestion(page)).toBeVisible();
});

test('a browser that will not keep anything still shows it, and can put it away for this page', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const refuse = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, { get: refuse });
    }
  });
  await asking(page, ['pt-BR']);
  await page.goto(address('en'));
  await expect(suggestion(page)).toBeVisible();

  await suggestion(page).getByRole('button', { name: words['pt-BR'].never }).click();

  await expect(suggestion(page)).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark']) {
  test(`it can be read and used, and breaks no page: ${colorScheme}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    await asking(page, ['ja']);
    await page.goto(address('en'));
    await expect(suggestion(page)).toBeVisible();

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(scan.violations).toEqual([]);

    // Nothing makes the page wider than the screen, however narrow it is.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, testInfo.project.name).toBeLessThanOrEqual(0);
  });
}

test('it can be used from the keyboard', async ({ page }) => {
  await asking(page, ['pt-BR']);
  await page.goto(address('en'));
  const box = suggestion(page);
  await box.getByRole('link', { name: words['pt-BR'].switch }).focus();

  await page.keyboard.press('Tab');
  await expect(box.getByRole('button', { name: words['pt-BR'].dismiss })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(box.getByRole('button', { name: words['pt-BR'].never })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(box).toHaveCount(0);
});
