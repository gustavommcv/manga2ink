import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CheckRow } from '@/renderer/components/settings/check-row';

const row = (container: HTMLElement): HTMLElement => {
  const found = container.querySelector<HTMLElement>('[data-slot="check-row"]');
  if (found === null) throw new Error('No check row was drawn.');
  return found;
};

describe('a checkbox with its words', () => {
  it('has the box, the title, what belongs to the title and the note under, in that order', () => {
    const { container } = render(
      <CheckRow
        box={<input aria-label="The box" type="checkbox" />}
        note={<p>Why it is so.</p>}
        pair={<p>What it uses</p>}
        title={<span>What it is</span>}
      />,
    );

    expect(row(container).textContent).toBe('What it isWhat it usesWhy it is so.');
    expect(screen.getByRole('checkbox', { name: 'The box' })).toBeVisible();
  });

  it('has nothing but the box and the title when it is given no more', () => {
    const { container } = render(
      <CheckRow box={<input type="checkbox" />} title={<span>Only</span>} />,
    );

    expect(row(container).children).toHaveLength(1);
    expect(row(container).textContent).toBe('Only');
  });

  it('puts the note in line with the title: the width of the box and the gap after it', () => {
    const { container } = render(
      <CheckRow box={<input type="checkbox" />} note={<p>Note</p>} title={<span>Title</span>} />,
    );

    expect(screen.getByText('Note').parentElement).toHaveClass('pl-7');
    // The box is 16px (4) and the gap 12px (3): 28px is `pl-7`.
    expect(container.querySelector('.gap-3')).not.toBeNull();
  });

  it('leaves a slot for a label above, only in two columns, when it is beside a field with one', () => {
    const { container } = render(
      <CheckRow
        besideField
        box={<input type="checkbox" />}
        note={<p>Note</p>}
        title={<span>T</span>}
      />,
    );

    const lead = container.querySelector('[data-slot="check-row-lead"]');
    expect(lead).toHaveAttribute('aria-hidden', 'true');
    // Hidden in one column, where there is nothing beside it.
    expect(lead).toHaveClass('hidden', 'sm:block');
    expect(row(container)).toHaveAttribute('data-beside-field');
  });

  it('is as high as the control of that field, in two columns, with its note a little lower', () => {
    const { container } = render(
      <CheckRow
        besideField
        box={<input type="checkbox" />}
        note={<p>Note</p>}
        title={<span>T</span>}
      />,
    );

    expect(container.querySelector('.flex')).toHaveClass('sm:min-h-9');
    expect(screen.getByText('Note').parentElement).toHaveClass('mt-1', 'sm:mt-2');
  });

  it('has no slot, no height of its own and no mark when it is not beside a field', () => {
    const { container } = render(
      <CheckRow box={<input type="checkbox" />} note={<p>Note</p>} title={<span>T</span>} />,
    );

    expect(container.querySelector('[data-slot="check-row-lead"]')).toBeNull();
    expect(row(container)).not.toHaveAttribute('data-beside-field');
    expect(container.querySelector('.flex')).not.toHaveClass('sm:min-h-9');
    expect(screen.getByText('Note').parentElement).not.toHaveClass('sm:mt-2');
  });
});
