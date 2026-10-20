import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Page } from '@/renderer/components/shell/page';

describe('the page under the title bar', () => {
  it('is the area that scrolls, with what it holds in the main part of the document', () => {
    render(
      <Page>
        <p>The queue</p>
      </Page>,
    );

    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByText('The queue'));
    const area = main.parentElement;
    expect(area).toHaveAttribute('data-slot', 'page');
    expect(area).toHaveClass('overflow-y-auto', 'flex-1', 'min-h-0');
  });

  it('is as wide as the window gives up to 72 rem, and 32 px from the sides and from the bar', () => {
    render(<Page>Anything</Page>);

    expect(screen.getByRole('main')).toHaveClass('mx-auto', 'max-w-6xl', 'px-8', 'py-8');
  });
});
