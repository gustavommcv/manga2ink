import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Info } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Callout } from '@/renderer/components/shared/callout';
import { IconLine } from '@/renderer/components/shared/icon-line';

describe('a callout', () => {
  it('has the title as a heading, and what it says under it', () => {
    render(
      <Callout role="status" title="Pages smaller than the screen">
        In all 3 books.
      </Callout>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Pages smaller than the screen' }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('In all 3 books.');
  });

  it('has a title of the first level when it is all a page says', () => {
    render(<Callout level={1} title="Manga2Ink could not start correctly." tone="failed" />);

    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
  });

  it('has no heading and no text when it is given none, and is named by its label', () => {
    render(<Callout aria-label="Notice" icon={Info} />);

    const notice = screen.getByRole('region', { name: 'Notice' });
    expect(screen.queryByRole('heading')).toBeNull();
    expect(notice.querySelectorAll('div')).toHaveLength(2);
  });

  it.each([
    ['warning', 'border-status-warning/40', 'text-status-warning'],
    ['failed', 'border-status-failed/50', 'text-status-failed'],
    ['override', 'border-override/40', 'text-override'],
    ['neutral', 'border-border', 'text-status-warning'],
  ] as const)('has the edge and the icon of a %s one', (tone, edge, icon) => {
    render(<Callout aria-label="Notice" icon={Info} tone={tone} />);

    const notice = screen.getByRole('region', { name: 'Notice' });
    expect(notice).toHaveClass(edge);
    expect(notice.querySelector('svg')).toHaveClass(icon);
  });

  it('is a warning when it is not told what it is', () => {
    render(<Callout aria-label="Notice" />);

    expect(screen.getByRole('region', { name: 'Notice' })).toHaveClass('border-status-warning/40');
  });

  it('puts what can be done about it at its end', async () => {
    const user = userEvent.setup();
    const fix = vi.fn();
    render(
      <Callout
        action={
          <button onClick={fix} type="button">
            Fix
          </button>
        }
        title="Could not be made"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Fix' }));

    expect(fix).toHaveBeenCalledOnce();
  });

  it('can be put away, and says so to a screen reader', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <Callout dismiss={{ label: 'Dismiss the notice', onDismiss }} role="status">
        A saved setting could not be used.
      </Callout>,
    );

    await user.click(screen.getByRole('button', { name: 'Dismiss the notice' }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('an icon on the first line of a text', () => {
  it('has the icon hidden from a screen reader and the text beside it', () => {
    const { container } = render(
      <IconLine icon={<Info data-testid="icon" />}>
        <p>Not enough room.</p>
      </IconLine>,
    );

    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(container).toHaveTextContent('Not enough room.');
  });

  it('is only the text when it has no icon', () => {
    const { container } = render(
      <IconLine>
        <p>Only the text.</p>
      </IconLine>,
    );

    expect(container.querySelector('[aria-hidden]')).toBeNull();
    expect(container).toHaveTextContent('Only the text.');
  });
});
