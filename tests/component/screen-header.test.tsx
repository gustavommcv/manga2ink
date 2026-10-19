import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ScreenHeader } from '@/renderer/components/shared/screen-header';

describe('ScreenHeader', () => {
  it('puts focus on its title when the screen opens, and leaves it out of the Tab order', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ScreenHeader id="title" title="Chainsaw Man" />
        <button type="button">After</button>
      </>,
    );

    const title = screen.getByRole('heading', { level: 1, name: 'Chainsaw Man' });
    expect(title).toHaveFocus();
    expect(title).toHaveAttribute('id', 'title');
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('draws no ring on the title, which cannot be reached by Tab', () => {
    render(<ScreenHeader id="title" title="Queue" />);

    expect(screen.getByRole('heading', { name: 'Queue' }).className).not.toMatch(/ring/u);
  });

  it('says the way back, the line above, what it says and what comes at the end', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ScreenHeader
        actions={<button type="button">Convert more</button>}
        back={{ label: 'Queue', onBack }}
        badge={<span>5</span>}
        description="Every field is optional."
        eyebrow={<p>Book details</p>}
        id="title"
        title="Chainsaw Man"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(onBack).toHaveBeenCalledOnce();
    for (const text of ['Book details', '5', 'Every field is optional.']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Convert more' })).toBeInTheDocument();
  });

  it('has no back button, line above or description when it is given none', () => {
    render(<ScreenHeader id="title" title="Queue" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('gives the title back to a screen that asks for it again', async () => {
    const user = userEvent.setup();
    function Screen() {
      const titleRef = useRef<HTMLHeadingElement>(null);
      return (
        <>
          <ScreenHeader id="title" size="section" title="Queue" titleRef={titleRef} />
          <button
            onClick={() => {
              titleRef.current?.focus();
            }}
            type="button"
          >
            Delete
          </button>
        </>
      );
    }
    render(<Screen />);
    const button = screen.getByRole('button', { name: 'Delete' });
    button.focus();
    expect(button).toHaveFocus();

    await user.click(button);

    expect(screen.getByRole('heading', { name: 'Queue' })).toHaveFocus();
  });
});
