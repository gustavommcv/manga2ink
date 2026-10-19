import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/renderer/components/ui/button';

describe('Button', () => {
  it('has its text where its padding puts it, unless it is told to be flush', () => {
    render(<Button variant="ghost">Back</Button>);

    const button = screen.getByRole('button', { name: 'Back' });
    expect(button.className).not.toMatch(/-m[lr]-\(--inset\)/u);
  });

  it.each([
    ['start', '-ml-(--inset)'],
    ['end', '-mr-(--inset)'],
  ] as const)('sets its padding outside the edge it is flush at: %s', (flush, margin) => {
    render(
      <Button flush={flush} variant="ghost">
        Back
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass(margin);
  });

  it.each([
    ['default', '[--inset:1rem]'],
    ['sm', '[--inset:0.75rem]'],
    ['lg', '[--inset:1.5rem]'],
    ['icon', '[--inset:0.625rem]'],
  ] as const)('says how far in the text of a %s button is', (size, inset) => {
    render(
      <Button flush="start" size={size} variant="ghost">
        Back
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass(inset);
  });

  it('is dimmed and not pressed when it is aria-disabled, and can still be found', () => {
    render(
      <Button aria-disabled variant="ghost">
        Reset
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Reset' });
    expect(button).not.toBeDisabled();
    expect(button).toHaveClass('aria-disabled:opacity-50', 'aria-disabled:cursor-default');
  });
});
