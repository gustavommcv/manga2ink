import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CheckRow } from '@/renderer/components/shared/check-row';

const row = (container: HTMLElement): HTMLElement => {
  const found = container.querySelector<HTMLElement>('[data-slot="check-row"]');
  if (found === null) throw new Error('No check row was drawn.');
  return found;
};

const line = (container: HTMLElement): HTMLElement => {
  const found = container.querySelector<HTMLElement>('[data-slot="check-row-line"]');
  if (found === null) throw new Error('No line was drawn.');
  return found;
};

describe('a checkbox with its words', () => {
  it('has the box, the title and the note under, in that order', () => {
    const { container } = render(
      <CheckRow
        checked={false}
        id="box"
        note={<p>Why it is so.</p>}
        onChange={vi.fn()}
        title="What it is"
      />,
    );

    expect(row(container).textContent).toBe('What it isWhy it is so.');
    expect(screen.getByRole('checkbox', { name: 'What it is' })).toBeVisible();
  });

  it('makes a title that is a text the label of the box, and says what the box is when it is checked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CheckRow checked={false} id="box" onChange={onChange} title="Keep awake" />);

    await user.click(screen.getByText('Keep awake'));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('says the opposite when it is checked and is pressed again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CheckRow checked id="box" onChange={onChange} title="Keep awake" />);

    await user.click(screen.getByRole('checkbox', { name: 'Keep awake' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('leaves a title that is more than a text as it is, for the screen to make the label of', () => {
    render(
      <CheckRow
        aria-label="Select chapter"
        checked={false}
        id="box"
        onChange={vi.fn()}
        title={<span>A name and its reset</span>}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Select chapter' })).toBeVisible();
    expect(screen.getByText('A name and its reset').tagName).toBe('SPAN');
  });

  it('tells what describes the box, and cannot be changed when it is disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CheckRow
        checked={false}
        describedBy="why"
        disabled
        id="box"
        note={<p id="why">Not yet.</p>}
        onChange={onChange}
        title="Automatic"
      />,
    );

    const box = screen.getByRole('checkbox', { name: 'Automatic' });
    expect(box).toHaveAccessibleDescription('Not yet.');
    expect(box).toBeDisabled();
    await user.click(box);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has the box on the line of the title only: the note is outside the row the box is centered in', () => {
    const { container } = render(
      <CheckRow
        checked={false}
        id="box"
        note={<p>A long note, which may take any number of lines.</p>}
        onChange={vi.fn()}
        title="The title"
      />,
    );

    expect(line(container)).toContainElement(screen.getByRole('checkbox', { name: 'The title' }));
    expect(line(container)).toHaveTextContent('The title');
    expect(line(container)).not.toHaveTextContent('A long note');
  });

  it('has nothing but the box and the title when it is given no more', () => {
    const { container } = render(
      <CheckRow checked={false} id="box" onChange={vi.fn()} title="Only" />,
    );

    expect(row(container).children).toHaveLength(1);
    expect(row(container).textContent).toBe('Only');
  });

  it('puts the note in line with the title: the width of the box and the gap after it', () => {
    const { container } = render(
      <CheckRow checked={false} id="box" note={<p>Note</p>} onChange={vi.fn()} title="Title" />,
    );

    expect(screen.getByText('Note').parentElement).toHaveClass('pl-7');
    // The box is 16px (4) and the gap 12px (3): 28px is `pl-7`.
    expect(line(container)).toHaveClass('gap-3');
  });

  it('leaves a slot for a label above, only in two columns, when it is beside a field with one', () => {
    const { container } = render(
      <CheckRow
        besideField
        checked={false}
        id="box"
        note={<p>Note</p>}
        onChange={vi.fn()}
        title="T"
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
        checked={false}
        id="box"
        note={<p>Note</p>}
        onChange={vi.fn()}
        title="T"
      />,
    );

    expect(line(container)).toHaveClass('sm:min-h-9');
    expect(screen.getByText('Note').parentElement).toHaveClass('mt-1', 'sm:mt-2');
  });

  it('has no slot, no height of its own and no mark when it is not beside a field', () => {
    const { container } = render(
      <CheckRow checked={false} id="box" note={<p>Note</p>} onChange={vi.fn()} title="T" />,
    );

    expect(container.querySelector('[data-slot="check-row-lead"]')).toBeNull();
    expect(row(container)).not.toHaveAttribute('data-beside-field');
    expect(line(container)).not.toHaveClass('sm:min-h-9');
    expect(screen.getByText('Note').parentElement).not.toHaveClass('sm:mt-2');
  });
});
