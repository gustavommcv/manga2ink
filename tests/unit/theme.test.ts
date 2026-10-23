import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  defaultTheme,
  defaultThemePreference,
  isTheme,
  isThemePreference,
  resolveTheme,
  type Theme,
  themePreferences,
  themes,
  themeWindowColors,
} from '@/domain/theme';
import { themeOf } from '@/renderer/stories/theme';

const stylesheet = path.resolve('src', 'renderer', 'styles.css');

/** The declarations of the block a theme selects in the stylesheet, by name. */
async function tokensOf(theme: Theme): Promise<ReadonlyMap<string, string>> {
  const css = (await readFile(stylesheet, 'utf8')).replace(/\/\*[\s\S]*?\*\//gu, '');
  for (const [, selectors = '', body = ''] of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const names = selectors.split(',').map((selector) => selector.trim());
    if (!names.includes(`:root[data-theme='${theme}']`)) continue;
    return new Map(
      [...body.matchAll(/([\w-]+)\s*:\s*([^;]+);/gu)].map(([, name = '', value = '']) => [
        name,
        value.trim(),
      ]),
    );
  }
  throw new Error(`The stylesheet has no block for the ${theme} theme.`);
}

/** The selectors of the block of a theme, to say which one the bare `:root` is. */
async function selectorsOf(theme: Theme): Promise<readonly string[]> {
  const css = (await readFile(stylesheet, 'utf8')).replace(/\/\*[\s\S]*?\*\//gu, '');
  for (const [, selectors = ''] of css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const names = selectors.split(',').map((selector) => selector.trim());
    if (names.includes(`:root[data-theme='${theme}']`)) return names;
  }
  return [];
}

/** An `oklch(L C h)` of the stylesheet as the three bytes the screen is given for it. */
function bytesOf(color: string | undefined): readonly [number, number, number] {
  const parsed = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/u.exec(color ?? '');
  if (parsed === null) throw new Error(`Not an oklch color: ${String(color)}`);
  const [lightness, chroma, hue] = parsed.slice(1).map(Number) as [number, number, number];
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const [red = 0, green = 0, blue = 0] = linear.map((value) => {
    const clamped = Math.min(1, Math.max(0, value));
    const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  });
  return [red, green, blue];
}

/** The hex the system paints a color of the stylesheet with. */
function hexOf(color: string | undefined): string {
  return `#${bytesOf(color)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** WCAG's relative luminance of the three bytes a color is painted with. */
function luminanceOfBytes(bytes: readonly [number, number, number]): number {
  const [red = 0, green = 0, blue = 0] = bytes.map((byte) => {
    const encoded = byte / 255;
    return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG's contrast ratio of two colors, as the bytes they are painted with. */
function contrastOfBytes(
  first: readonly [number, number, number],
  second: readonly [number, number, number],
): number {
  const [light = 0, dark = 0] = [luminanceOfBytes(first), luminanceOfBytes(second)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG's contrast ratio of two colors of the stylesheet. */
function contrastOf(first: string | undefined, second: string | undefined): number {
  return contrastOfBytes(bytesOf(first), bytesOf(second));
}

/** What a color painted over another at some opacity comes to, as the bytes it is painted with. */
function overOf(
  top: string | undefined,
  alpha: number,
  ground: string | undefined,
): readonly [number, number, number] {
  const [a, b] = [bytesOf(top), bytesOf(ground)];
  const mixed = a.map((byte, index) => Math.round(byte * alpha + (b[index] ?? 0) * (1 - alpha)));
  return [mixed[0] ?? 0, mixed[1] ?? 0, mixed[2] ?? 0];
}

describe('the themes of the app', () => {
  it('are the dark one, which is the one a person is given, and the light one', () => {
    expect(themes).toEqual(['dark', 'light']);
    expect(defaultTheme).toBe('dark');
    expect(themes).toContain(defaultTheme);
  });

  it('are told from what is not a theme', () => {
    for (const theme of themes) expect(isTheme(theme)).toBe(true);
    for (const other of ['Light', 'Dark', 'system', '', 'neon', undefined, null, 3, {}]) {
      expect(isTheme(other)).toBe(false);
    }
  });

  it('have the colors of their window as hex, each', () => {
    expect(Object.keys(themeWindowColors).sort()).toEqual([...themes].sort());
    for (const theme of themes) {
      expect(themeWindowColors[theme].background).toMatch(/^#[0-9a-f]{6}$/u);
      expect(themeWindowColors[theme].foreground).toMatch(/^#[0-9a-f]{6}$/u);
    }
  });

  it('are the one a story shows when it is not told another', () => {
    expect(themeOf({})).toBe(defaultTheme);
    expect(themeOf({ theme: 'neon' })).toBe(defaultTheme);
    expect(themeOf({ theme: 3 })).toBe(defaultTheme);
    for (const theme of themes) expect(themeOf({ theme })).toBe(theme);
  });
});

describe('what a person chooses of the look', () => {
  it('is a theme, or to look as the system does, which is where a person starts', () => {
    expect(themePreferences).toEqual(['system', 'dark', 'light']);
    expect(defaultThemePreference).toBe('system');
    expect(themePreferences).toContain(defaultThemePreference);
  });

  it('is told from what is not a choice', () => {
    for (const choice of themePreferences) expect(isThemePreference(choice)).toBe(true);
    for (const other of ['System', 'auto', '', 'neon', undefined, null, 3, {}]) {
      expect(isThemePreference(other)).toBe(false);
    }
  });

  it.each(themes)(
    'comes to the theme itself when it is the %s theme, whatever the system is set to',
    (theme) => {
      expect(resolveTheme(theme, true)).toBe(theme);
      expect(resolveTheme(theme, false)).toBe(theme);
    },
  );

  it('comes to the dark theme when the system is set to dark, and the light one when it is not', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('the themes in the stylesheet', () => {
  it('have each a block, which sets the same variables as every other theme, and its color scheme', async () => {
    const first = await tokensOf(defaultTheme);
    expect(first.get('color-scheme')).toBeDefined();
    expect(first.size).toBeGreaterThan(10);

    for (const theme of themes) {
      const tokens = await tokensOf(theme);
      expect([...tokens.keys()].sort()).toEqual([...first.keys()].sort());
      expect(tokens.get('color-scheme')).toMatch(/^(dark|light)$/u);
    }
  });

  it('are drawn as the default theme is when the page names none, since the bare root is that theme', async () => {
    expect(await selectorsOf(defaultTheme)).toContain(':root');
    const notTheDefault = (theme: string): boolean => theme !== defaultTheme;
    for (const theme of themes.filter(notTheDefault)) {
      expect(await selectorsOf(theme)).not.toContain(':root');
    }
  });

  it('are the colors the window is painted with, which Electron cannot read from the page, and its scheme', async () => {
    for (const theme of themes) {
      const tokens = await tokensOf(theme);
      expect(hexOf(tokens.get('--background'))).toBe(themeWindowColors[theme].background);
      expect(hexOf(tokens.get('--foreground'))).toBe(themeWindowColors[theme].foreground);
      expect(tokens.get('color-scheme')).toBe(themeWindowColors[theme].scheme);
    }
  });

  it('set the same few things once, for every theme, and the colors in each', async () => {
    const css = (await readFile(stylesheet, 'utf8')).replace(/\/\*[\s\S]*?\*\//gu, '');
    const shared = /(?:^|\})\s*:root\s*\{([^{}]*)\}/u.exec(css)?.[1] ?? '';

    expect([...shared.matchAll(/(--[\w-]+)\s*:/gu)].map(([, name]) => name)).toEqual([
      '--font-sans',
      '--radius',
    ]);
    for (const theme of themes) {
      const tokens = await tokensOf(theme);
      expect(tokens.has('--font-sans')).toBe(false);
      expect(tokens.has('--radius')).toBe(false);
    }
  });

  describe.each(themes)('in the %s theme, can be read', (theme) => {
    // What the interface puts text of one color on: the page, a raised surface, and what is muted
    // (a hovered row, a chip). The numbers are the least that every theme measures today.
    const grounds = ['--background', '--surface', '--muted'] as const;
    const least = (text: string, ground: (typeof grounds)[number]): number => {
      const onMuted = ground === '--muted';
      if (text === '--foreground') return 12;
      return onMuted ? 6 : 7;
    };

    it.each([
      '--foreground',
      '--muted-foreground',
      '--accent',
      '--override',
      '--status-failed',
      '--status-warning',
    ])('with %s on the page, on a surface and on what is muted', async (text) => {
      const tokens = await tokensOf(theme);
      for (const ground of grounds) {
        expect(
          contrastOf(tokens.get(text), tokens.get(ground)),
          `${text} on ${ground}`,
        ).toBeGreaterThanOrEqual(least(text, ground));
      }
    });

    it('on the edge of a control: the box, the field and the select, against what each is on', async () => {
      // The boundary a control is told by is at least 2.1:1 with what is around it: the page, a
      // raised surface, a row the pointer is over (muted at half over a surface), or the panel of the
      // controls of a table (muted at 30%). WCAG 1.4.11 asks 3:1, and ADR 0076 held it there; the
      // owner chose a softer edge (ADR 0088), which this holds from going back to the hairline.
      const leastEdge = 2.1;
      const tokens = await tokensOf(theme);
      const border = bytesOf(tokens.get('--control-border'));
      const around = {
        'the page': bytesOf(tokens.get('--background')),
        'a surface': bytesOf(tokens.get('--surface')),
        'a row under the pointer': overOf(tokens.get('--muted'), 0.5, tokens.get('--surface')),
        'a panel of controls': overOf(tokens.get('--muted'), 0.3, tokens.get('--surface')),
      };

      for (const [name, ground] of Object.entries(around)) {
        expect(
          contrastOfBytes(border, ground),
          `--control-border on ${name}`,
        ).toBeGreaterThanOrEqual(leastEdge);
      }
    });

    it('on the buttons: the label of a primary button, and of a destructive one', async () => {
      const tokens = await tokensOf(theme);

      expect(
        contrastOf(tokens.get('--primary-foreground'), tokens.get('--primary')),
      ).toBeGreaterThanOrEqual(7);
      expect(
        contrastOf(tokens.get('--destructive-foreground'), tokens.get('--destructive')),
      ).toBeGreaterThanOrEqual(5.5);
    });
  });

  it('keep the default color of an edge in the base layer, where a utility can change it', async () => {
    // A rule outside every layer wins over all of Tailwind's utilities, whatever their specificity:
    // with `* { border-color }` outside the base layer, `border-control-border`, `border-primary` and
    // the amber of a warning had no effect (ADR 0076).
    const css = (await readFile(stylesheet, 'utf8')).replace(/\/\*[\s\S]*?\*\//gu, '');

    expect(css).toMatch(/@layer base\s*\{\s*\*\s*\{\s*border-color:\s*var\(--border\);\s*\}\s*\}/u);
    expect(css.replace(/@layer base\s*\{\s*\*\s*\{[^{}]*\}\s*\}/u, '')).not.toMatch(
      /(?:^|\})\s*\*\s*\{[^{}]*border-color/u,
    );
  });

  it('name the default theme on the page itself, before the app has read what a person chose', async () => {
    const page = await readFile(path.resolve('src', 'renderer', 'index.html'), 'utf8');

    expect(page).toContain(`data-theme="${defaultTheme}"`);
  });
});
