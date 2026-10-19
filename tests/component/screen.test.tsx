import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { TwoColumns } from '@/renderer/components/shared/two-columns';

describe('Screen', () => {
  it('is a region named by its title', () => {
    render(
      <Screen labelledBy="title">
        <ScreenHeader id="title" title="Queue" />
      </Screen>,
    );

    expect(screen.getByRole('region', { name: 'Queue' })).toBeInTheDocument();
  });

  it.each([
    ['wide', undefined, false],
    ['form', 'max-w-3xl', true],
    ['status', 'max-w-xl', true],
  ] as const)('is as wide as a %s screen is', (width, bound, centered) => {
    render(
      <Screen labelledBy="title" width={width}>
        <ScreenHeader id="title" title="Queue" />
      </Screen>,
    );

    const region = screen.getByRole('region', { name: 'Queue' });
    if (bound === undefined) expect(region.className).not.toMatch(/max-w-/u);
    else expect(region).toHaveClass(bound);
    expect(region.classList.contains('mx-auto')).toBe(centered);
  });

  it('is as wide as the page when it is not told', () => {
    render(
      <Screen labelledBy="title">
        <ScreenHeader id="title" title="Queue" />
      </Screen>,
    );

    expect(screen.getByRole('region', { name: 'Queue' }).className).not.toMatch(/max-w-/u);
  });

  it('lets a screen change the space between what it is made of', () => {
    render(
      <Screen className="space-y-0" labelledBy="title">
        <ScreenHeader id="title" title="Queue" />
      </Screen>,
    );

    const region = screen.getByRole('region', { name: 'Queue' });
    expect(region).toHaveClass('space-y-0');
    expect(region).not.toHaveClass('space-y-6');
  });
});

describe('TwoColumns', () => {
  it('puts the card beside what the screen is about', () => {
    render(
      <TwoColumns aside={<aside aria-label="Card">Card</aside>}>
        <p>Main</p>
      </TwoColumns>,
    );

    const grid = screen.getByRole('complementary', { name: 'Card' }).parentElement;
    expect(grid?.className).toMatch(/grid-cols-\[minmax\(0,1\.6fr\)_minmax\(0,1fr\)\]/u);
    expect(grid).toContainElement(screen.getByText('Main'));
  });

  it('gives what the screen is about the whole width when there is no card', () => {
    render(
      <TwoColumns className="space-y-5">
        <p>Main</p>
      </TwoColumns>,
    );

    const main = screen.getByText('Main').parentElement;
    expect(main).toHaveClass('min-w-0', 'space-y-5');
    expect(main?.className).not.toMatch(/grid/u);
  });
});
