import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import type { Language } from '../../src/domain/app-settings';
import { message } from '../../src/domain/message';
import { type Messages, messagesFor } from '../../src/i18n/messages';
import { say } from '../../src/i18n/say';
import { tutorialPresentation } from '../../playwright.tutorial.config';

const directory = path.resolve('website/src/assets/tutorial/generated');
// Starlight's guide column is at most 45rem (720 CSS pixels at the default font size).
const displayedWidth = 720;
const displayDensities = [1, 2, 3, 4];
// Screens without their own panel padding include some existing Storybook background.
const screenInset = 24;
/**
 * The languages the guide has pictures in: the app's own words, as the app says them. A language of
 * the guide that the app does not have yet (Japanese) uses the English pictures.
 */
const tutorialLanguages: readonly Language[] = ['en', 'pt-BR'];
/** English keeps the names it has always had; another language's pictures are in a folder named as its guide is. */
const folderOf = (language: Language): string =>
  language === 'en' ? '' : `${language.toLowerCase()}/`;
type CaptureVariant = { file: string; width: number; height: number; pixelRatio: number };
const captures = new Map<
  string,
  {
    name: string;
    language: Language;
    story: string;
    masterRatio: number;
    variants: CaptureVariant[];
  }
>();
type Capture = (
  page: Page,
  name: string,
  story: string,
  region?: Locator | [Locator, Locator],
  includeContext?: boolean,
) => Promise<void>;

/** What a scenario is given: the page, how to take a picture, how to open a story, and the words. */
interface Scenario {
  readonly page: Page;
  readonly capture: Capture;
  /** Opens a story in the language of the picture. */
  readonly open: (story: string) => Promise<void>;
  /** What the window says in that language: the catalogs of the app, not a copy of them. */
  readonly t: Messages;
  readonly language: Language;
}

/** A text that begins with these words, for a label that carries more after them. */
function startingWith(text: string): RegExp {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'u');
}

function tutorial(title: string, scenario: (scenario: Scenario) => Promise<void>): void {
  for (const language of tutorialLanguages) {
    test(`${title} (${language})`, async ({ browser }) => {
      // The 1× pass discovers each region's required densities. Only those contexts are rendered.
      const ratios = new Set([1]);
      for (const pixelRatio of ratios) {
        const context = await browser.newContext({
          ...tutorialPresentation,
          deviceScaleFactor: pixelRatio,
        });
        try {
          const page = await context.newPage();
          await scenario({
            page,
            capture: (target, name, story, region, includeContext) =>
              capture(
                target,
                `${folderOf(language)}${name}`,
                language,
                story,
                ratios,
                region,
                includeContext,
              ),
            open: (story) => openStory(page, story, language),
            t: messagesFor(language),
            language,
          });
        } finally {
          await context.close();
        }
      }
    });
  }
}

test.beforeAll(async () => {
  for (const language of tutorialLanguages) {
    await mkdir(path.join(directory, folderOf(language)), { recursive: true });
  }
});

test.afterAll(async () => {
  await writeFile(
    path.join(directory, 'capture.json'),
    JSON.stringify(
      {
        commit:
          process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
        captures: [...captures.values()].map(({ name, language, story, masterRatio, variants }) => {
          const master = variants.find((variant) => variant.pixelRatio === masterRatio);
          if (!master) throw new Error(`Missing full-size tutorial capture: ${name}`);
          return {
            name,
            language,
            story,
            width: master.width,
            height: master.height,
            pixelRatio: masterRatio,
            variants,
          };
        }),
      },
      null,
      2,
    ) + '\n',
  );
});

async function openStory(page: Page, story: string, language: Language): Promise<void> {
  await page.goto(`/iframe.html?id=${story}&viewMode=story&globals=language:${language}`);
  await expect(page.locator('#storybook-root')).toBeVisible();
}

async function capture(
  page: Page,
  name: string,
  language: Language,
  story: string,
  requestedRatios: Set<number>,
  region?: Locator | [Locator, Locator],
  includeContext = false,
): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Documentation illustrates mouse use; keyboard-focus behavior stays tested separately.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const target = Array.isArray(region) ? region[0] : (region ?? page.locator('#storybook-root'));
  await target.scrollIntoViewIfNeeded();
  const bounds = await target.boundingBox();
  if (bounds === null) throw new Error(`Tutorial region is not visible: ${name}`);
  if (Array.isArray(region)) {
    const end = await region[1].boundingBox();
    if (end === null) throw new Error(`Tutorial end region is not visible: ${name}`);
    // Two consecutive panels in one column retain their real gap, not a stitched bitmap.
    expect(end.x).toBeCloseTo(bounds.x, 1);
    expect(end.width).toBeCloseTo(bounds.width, 1);
    expect(end.y).toBeGreaterThan(bounds.y + bounds.height);
    bounds.height = end.y + end.height - bounds.y;
  }
  const inset = includeContext ? screenInset : 0;
  const area = { width: bounds.width + inset * 2, height: bounds.height + inset * 2 };
  const pixelRatio = await page.evaluate(() => window.devicePixelRatio);
  const ratios = [
    ...new Set(
      displayDensities.map((density) => Math.ceil((displayedWidth * density) / area.width)),
    ),
  ];
  const masterRatio = Math.max(3, ...ratios);
  for (const ratio of [...ratios, masterRatio]) requestedRatios.add(ratio);
  if (!ratios.includes(pixelRatio) && pixelRatio !== masterRatio) return;
  const file = pixelRatio === masterRatio ? `${name}.png` : `${name}@${pixelRatio}x.png`;
  const options = {
    animations: 'disabled' as const,
    caret: 'hide' as const,
    path: path.join(directory, file),
    scale: 'device' as const,
  };
  let screenshot: Buffer;
  if (includeContext || Array.isArray(region)) {
    const pageBounds = await page.evaluate(() => ({
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));
    const clip = {
      x: bounds.x + pageBounds.scrollX - inset,
      y: bounds.y + pageBounds.scrollY - inset,
      ...area,
    };
    // Fail if the story no longer has this space; never synthesize a border in the bitmap.
    expect(clip.x).toBeGreaterThanOrEqual(0);
    expect(clip.y).toBeGreaterThanOrEqual(0);
    expect(clip.x + clip.width).toBeLessThanOrEqual(pageBounds.width);
    expect(clip.y + clip.height).toBeLessThanOrEqual(pageBounds.height);
    screenshot = await page.screenshot({ ...options, clip, fullPage: true });
  } else {
    screenshot = await target.screenshot(options);
  }
  const { width, height } = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, screenshot.toString('base64'));
  // Element screenshots round both CSS edges before applying device pixel density.
  const edgeRounding = 2 * pixelRatio;
  expect(Math.abs(width - area.width * pixelRatio)).toBeLessThanOrEqual(edgeRounding);
  expect(Math.abs(height - area.height * pixelRatio)).toBeLessThanOrEqual(edgeRounding);
  if (pixelRatio === masterRatio) {
    expect(width).toBeGreaterThanOrEqual(displayedWidth * Math.max(...displayDensities));
  }
  const record = captures.get(name) ?? { name, language, story, masterRatio, variants: [] };
  record.variants.push({ file, width, height, pixelRatio });
  captures.set(name, record);
}

tutorial(
  'the queue illustrates a chapter folder, a library and a complete CBZ',
  async ({ capture, open, page, t }) => {
    const story = 'workflows-queue--tutorial-inputs';
    await open(story);
    await expect(page.getByRole('list', { name: t.queue.items }).getByRole('listitem')).toHaveCount(
      3,
    );
    await expect(page.getByRole('button', { name: t.queue.folder, exact: true })).toBeVisible();
    await capture(
      page,
      'queue-inputs',
      story,
      page.locator('#storybook-root section').first(),
      true,
    );
  },
);

tutorial(
  'manual mapping starts offline and shows actual chapter assignment',
  async ({ capture, open, page, t }) => {
    const { chaptersFrom, editor } = t.mapping;
    const story = 'workflows-mapping-editor--manual-with-online-option';
    await open(story);
    await expect(
      page.getByRole('tab', { name: chaptersFrom.tabs.manual, exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    const createFirst = page.getByRole('button', { name: editor.start.createFirst });
    await expect(createFirst).toBeVisible();
    await expect(createFirst).toHaveText(editor.start.createVolume('1'));
    await capture(page, 'manual-mapping-start', story);
    await createFirst.click();
    await page
      .getByRole('checkbox', {
        name: editor.chapters.select('Chapter 1 — The Long Way Home'),
        exact: true,
      })
      .check();
    await page
      .getByRole('checkbox', {
        name: editor.chapters.select('Chapter 2 — A Door Left Open'),
        exact: true,
      })
      .check();
    await page.getByRole('button', { name: editor.chapters.assignSelected, exact: true }).click();
    await expect(
      page
        .getByRole('region', { name: editor.chapters.title, exact: true })
        .locator('span')
        .filter({ hasText: new RegExp(`^${editor.chapters.volume('1')}$`, 'u') }),
    ).toHaveCount(2);
    await capture(page, 'manual-mapping', story);
  },
);

tutorial(
  'online mapping shows a search and the reviewed suggestion',
  async ({ capture, open, page, t }) => {
    const use = t.mapping.chaptersFrom.online.use;
    const story = 'workflows-mapping-editor--with-metadata-suggestions';
    await open(story);
    await expect(page.getByRole('button', { name: use, exact: true })).toHaveCount(2);
    await capture(page, 'online-mapping-search', story);
    await page.getByRole('button', { name: use, exact: true }).first().click();
    await expect(page.getByRole('region', { name: t.mapping.summary.title })).toBeVisible();
    await capture(page, 'online-mapping', story);
  },
);

tutorial(
  'book details show editable metadata and the resulting volume titles',
  async ({ capture, open, page, t }) => {
    const { details } = t;
    const story = 'workflows-book-details--finding-the-author';
    await open(story);
    await expect(page.getByLabel(details.author.label, { exact: true })).toHaveValue(
      'Fujimoto Tatsuki',
    );
    await page.getByLabel(details.titleField.series, { exact: true }).fill('Chainsaw Man (Deluxe)');
    await page.getByLabel(details.language.label, { exact: true }).fill('pt-BR');
    await expect(page.getByLabel(details.titleField.series, { exact: true })).toHaveValue(
      'Chainsaw Man (Deluxe)',
    );
    await expect(page.getByLabel(details.language.label, { exact: true })).toHaveValue('pt-BR');
    await expect(page.getByRole('list', { name: details.titled.list })).toContainText(
      'Chainsaw Man (Deluxe) - Vol.01',
    );
    await capture(
      page,
      'book-details',
      story,
      page.locator('#storybook-root section').first(),
      true,
    );
  },
);

tutorial(
  'covers distinguish individual choices, folder images and first-page fallbacks',
  async ({ capture, open, page, t }) => {
    const { covers: words } = t.details;
    const story = 'workflows-book-details--with-covers';
    await open(story);
    const covers = page.getByRole('list', { name: words.list });
    await expect(covers.getByRole('listitem')).toHaveCount(5);
    await expect(covers.getByText(words.fromFolder('01.jpg'), { exact: true })).toBeVisible();
    await expect(covers.getByText('IMG_2041.jpg', { exact: true })).toBeVisible();
    await expect(covers.getByText(words.firstPage, { exact: true })).toHaveCount(2);
    await expect(page.getByRole('button', { name: words.addFolder })).toBeVisible();
    await capture(
      page,
      'book-covers',
      story,
      page
        .getByRole('heading', { name: words.title, exact: true })
        .locator('xpath=ancestor::section[1]'),
    );
  },
);

tutorial(
  'reading and spread controls show their real conditional choices',
  async ({ capture, open, page, t }) => {
    const { reading, spreads } = t.fields;
    const story = 'workflows-output-settings--webtoon-strips';
    await open(story);
    await expect(
      page.getByRole('combobox', { name: reading.content.label, exact: true }),
    ).toHaveValue('webtoon');
    await expect(page.getByRole('checkbox', { name: reading.mangaStyle.label })).toBeDisabled();
    await expect(
      page.getByRole('combobox', { name: spreads.wide.label, exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole('checkbox', { name: spreads.noRotate.label })).toBeDisabled();
    await capture(page, 'page-layout', story, [
      page
        .getByRole('heading', { name: reading.title, exact: true })
        .locator('xpath=ancestor::section[1]'),
      page
        .getByRole('heading', { name: spreads.title, exact: true })
        .locator('xpath=ancestor::section[1]'),
    ]);
  },
);

tutorial(
  'color and page-image controls explain PNG choices and remaining JPEG pages',
  async ({ capture, open, page, t }) => {
    const { color, images } = t.fields;
    const story = 'workflows-output-settings--color-and-png';
    await open(story);
    await expect(page.getByRole('combobox', { name: color.pages.label, exact: true })).toHaveValue(
      'color',
    );
    await expect(
      page.getByRole('combobox', { name: images.format.label, exact: true }),
    ).toHaveValue('png');
    await expect(page.getByRole('checkbox', { name: images.noQuantize.label })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: images.pngLegacy.label })).toBeDisabled();
    await expect(page.getByLabel(startingWith(images.jpegQuality.label))).toBeEnabled();
    await expect(page.getByText(startingWith(images.jpegQuality.forColorPages))).toBeVisible();
    await capture(page, 'page-images', story, [
      page
        .getByRole('heading', { name: color.title, exact: true })
        .locator('xpath=ancestor::section[1]'),
      page
        .getByRole('heading', { name: images.title, exact: true })
        .locator('xpath=ancestor::section[1]'),
    ]);
  },
);

tutorial(
  'custom dimensions are real controlled fields, not an edited image',
  async ({ capture, open, page, t }) => {
    const { device } = t.fields;
    const story = 'workflows-conversion-options--normal';
    await open(story);
    await expect(
      page.getByRole('heading', { name: t.options.page.title, exact: true }),
    ).toBeFocused();
    const width = page.getByLabel(startingWith(device.customWidth.label));
    const height = page.getByLabel(startingWith(device.customHeight.label));
    await width.fill('1440');
    await height.fill('1920');
    await expect(width).toHaveValue('1440');
    await expect(height).toHaveValue('1920');
    await capture(
      page,
      'device-settings',
      story,
      page.getByLabel(device.profile.label).locator('xpath=ancestor::section[1]'),
    );
  },
);

tutorial(
  'single-book mode visibly locks the coupled process choices',
  async ({ capture, open, page, t }) => {
    const story = 'workflows-queue--single-book-active';
    await open(story);
    await expect(
      page.getByRole('checkbox', { name: t.queue.panel.singleBook.label }),
    ).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: t.queue.steps.group, exact: true }),
    ).toBeDisabled();
    await capture(
      page,
      'single-book',
      story,
      page.getByRole('complementary', { name: t.queue.panel.label }),
    );
  },
);

tutorial(
  'progress details show completed, converting and saving volumes',
  async ({ capture, open, page, t }) => {
    const { details } = t.running;
    const story = 'workflows-running--multiple-volumes';
    await open(story);
    await expect(page.getByRole('region', { name: details.region })).toBeVisible();
    await expect(page.getByRole('button', { name: details.hide })).toBeVisible();
    await capture(
      page,
      'processing-details',
      story,
      page.locator('#storybook-root section').first(),
      true,
    );
  },
);

tutorial(
  'results show repeatable saving and sharing without a focus outline',
  async ({ capture, open, page, t }) => {
    const story = 'workflows-results--saved';
    await open(story);
    const heading = page.getByRole('heading', { name: t.results.ready(3) });
    await expect(heading).toBeVisible();
    await expect(
      page.getByRole('button', { name: t.results.saveAll.label, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: t.sharing.send.share, exact: true }),
    ).toBeVisible();
    await capture(
      page,
      'save-results',
      story,
      page.locator('#storybook-root section').first(),
      true,
    );
    await expect(heading).not.toBeFocused();
  },
);

tutorial('ready books expose reopening and safe deletion', async ({ capture, open, page, t }) => {
  const { pending } = t.queue;
  const story = 'workflows-queue--ready-books';
  await open(story);
  await expect(
    page.getByRole('button', { name: pending.viewBooksFrom('Vol.01.epub') }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: pending.deleteFrom('Vol.01.epub') })).toBeVisible();
  await capture(
    page,
    'ready-books',
    story,
    page.getByRole('region', { name: pending.earlierBooks }),
  );
});

tutorial(
  'warnings name affected books without turning successful conversion into failure',
  async ({ capture, open, page, t }) => {
    const story = 'workflows-results--with-warnings';
    await open(story);
    await expect(page.getByRole('heading', { name: t.results.ready(3) })).toBeVisible();
    const said = (text: Parameters<typeof say>[1]): string => say(t.said, text);
    await expect(
      page.getByText(said(message('warning.title', { code: 'images_smaller_than_device' })), {
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      page.getByText(said(message('warning.title', { code: 'source_already_converted' })), {
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      page.getByText(startingWith(said(message('warning.inAll', { count: 3 })))),
    ).toBeVisible();
    await expect(
      page.getByText(
        startingWith(said(message('warning.inOne', { first: 'Vagabond Vol.03.epub' }))),
      ),
    ).toBeVisible();
    await capture(
      page,
      'book-warnings',
      story,
      page.locator('#storybook-root section').first(),
      true,
    );
  },
);

tutorial(
  'sharing explains the interface and then the catalog address',
  async ({ capture, open, page, t }) => {
    const { panel } = t.sharing;
    const setup = 'workflows-share-panel--ready-to-start';
    await open(setup);
    await expect(page.getByRole('combobox', { name: panel.networkInterface })).toBeVisible();
    await expect(page.getByRole('button', { name: panel.start })).toBeEnabled();
    await capture(page, 'share-setup', setup, page.getByRole('region', { name: panel.title }));
    const active = 'workflows-share-panel--tutorial-sharing';
    await open(active);
    await expect(page.getByLabel(panel.addressLabel)).toHaveValue('http://192.168.1.20:48123');
    await expect(page.getByRole('button', { name: panel.stop })).toBeVisible();
    await capture(page, 'share-panel', active, page.getByRole('region', { name: panel.title }));
  },
);

/** The stories of the dialog of the app settings, one for each tab, in each language of the pictures. */
const settingsStories = {
  en: {
    interface: 'settings-app-settings-dialog--open',
    processing: 'settings-app-settings-dialog--processing',
    updates: 'settings-app-settings-dialog--updates',
    about: 'settings-app-settings-dialog--about',
  },
  'pt-BR': {
    interface: 'settings-app-settings-dialog--in-portuguese',
    processing: 'settings-app-settings-dialog--processing-in-own-places-in-portuguese',
    updates: 'settings-app-settings-dialog--updates-in-portuguese',
    about: 'settings-app-settings-dialog--about-in-portuguese',
  },
} as const satisfies Record<Language, Record<string, string>>;

tutorial(
  'the app settings show each of their tabs, and the end of the longest',
  async ({ capture, language, open, page, t }) => {
    const stories = settingsStories[language];
    const words = t.appSettings;
    const dialog = page.getByRole('dialog', { name: words.title });
    const selected = (name: string): Locator =>
      dialog.getByRole('tab', { name, exact: true, selected: true });

    await open(stories.interface);
    await expect(dialog).toBeVisible();
    await expect(selected(words.interface)).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: words.language.label })).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: words.theme.label })).toBeVisible();
    await capture(page, 'app-settings-interface', stories.interface, dialog);

    await open(stories.processing);
    await expect(dialog).toBeVisible();
    await expect(selected(words.processing)).toBeVisible();
    await expect(dialog.getByRole('button', { name: t.processing.choose })).toBeVisible();
    await capture(page, 'app-settings-processing', stories.processing, dialog);
    // The choices about a queue are at the end of the tab, below what the dialog shows at first: the
    // tab is scrolled to its end, which is what a person does to reach them.
    await expect(
      dialog.getByRole('checkbox', { name: t.processing.queue.notify.label }),
    ).toBeChecked();
    await expect(
      dialog.getByRole('checkbox', { name: t.processing.queue.awake.label }),
    ).toBeChecked();
    await dialog.getByText(t.processing.queue.awake.help, { exact: true }).evaluate((element) => {
      element.scrollIntoView({ block: 'end' });
    });
    await expect(dialog.getByText(t.processing.queue.title, { exact: true })).toBeInViewport();
    await capture(page, 'app-settings-queue', stories.processing, dialog);

    await open(stories.updates);
    await expect(dialog).toBeVisible();
    await expect(selected(words.updates)).toBeVisible();
    await expect(dialog.getByRole('button', { name: t.updates.check })).toBeEnabled();
    await expect(dialog.getByRole('checkbox', { name: t.updates.automatic.label })).toBeDisabled();
    await capture(page, 'app-settings-updates', stories.updates, dialog);

    await open(stories.about);
    await expect(dialog).toBeVisible();
    await expect(selected(words.about)).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: t.about.learnMore.releaseNotes }),
    ).toBeVisible();
    // What helps a report of a problem is in the picture too: the diagnostics and the two folders.
    await expect(dialog.getByRole('button', { name: t.about.troubleshooting.copy })).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: t.about.troubleshooting.openLogs }),
    ).toBeVisible();
    await capture(page, 'app-settings-about', stories.about, dialog);
  },
);
