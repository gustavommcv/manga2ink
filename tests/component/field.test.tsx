import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Field } from '@/renderer/components/shared/field';
import { Note } from '@/renderer/components/shared/note';

describe('a note', () => {
  it('is one size, one grey and one height of line, whatever it says', () => {
    render(<Note>What a step uses.</Note>);

    expect(screen.getByText('What a step uses.')).toHaveClass(
      'text-xs',
      'text-muted-foreground',
      'leading-normal',
    );
  });

  it('takes the attributes of a paragraph, and a class for its place', () => {
    render(
      <Note aria-live="polite" className="mt-1 text-center" id="why">
        Why it is so.
      </Note>,
    );

    const note = screen.getByText('Why it is so.');
    expect(note).toHaveAttribute('id', 'why');
    expect(note).toHaveAttribute('aria-live', 'polite');
    expect(note).toHaveClass('mt-1', 'text-center', 'text-xs');
  });

  it('is a div when it is several lines of its own', () => {
    render(
      <Note as="div">
        <p>First</p>
        <ul>
          <li>Second</li>
        </ul>
      </Note>,
    );

    expect(screen.getByText('First').parentElement?.tagName).toBe('DIV');
    expect(screen.getByText('First').parentElement).toHaveClass('text-xs', 'text-muted-foreground');
  });
});

describe('a field', () => {
  it('has its label for its control, and what it is for under the control', () => {
    render(
      <Field description="What it is for." id="device" label="Device">
        <select aria-describedby="device-message" id="device">
          <option>Kindle</option>
        </select>
      </Field>,
    );

    const control = screen.getByRole('combobox', { name: 'Device' });
    expect(control).toHaveAccessibleDescription('What it is for.');
  });

  it('says what is wrong with it, and not what it is for, when it has an error', () => {
    render(
      <Field description="What it is for." error="Too large." id="width" label="Width">
        <input aria-describedby="width-message" id="width" />
      </Field>,
    );

    expect(screen.getByText('Too large.')).toBeVisible();
    expect(screen.queryByText('What it is for.')).toBeNull();
  });

  it('has nothing under the control when it has nothing to say', () => {
    const { container } = render(
      <Field id="author" label="Author">
        <input id="author" />
      </Field>,
    );

    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('has the button that puts a changed choice back, only when it has changed', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const { rerender } = render(
      <Field changed={false} id="format" label="Format" onReset={onReset}>
        <input id="format" />
      </Field>,
    );
    expect(screen.queryByRole('button')).toBeNull();

    rerender(
      <Field changed id="format" label="Format" onReset={onReset}>
        <input id="format" />
      </Field>,
    );
    await user.click(screen.getByRole('button'));

    expect(onReset).toHaveBeenCalledOnce();
  });

  it('is a label, with no button, when it is not given a way to put the choice back', () => {
    render(
      <Field changed id="title" label="Series title">
        <input id="title" />
      </Field>,
    );

    expect(screen.getByLabelText('Series title')).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('can have its message read out as it changes', () => {
    render(
      <Field announces description="Kept." id="language" label="Language">
        <input id="language" />
      </Field>,
    );

    expect(screen.getByText('Kept.').parentElement).toHaveAttribute('aria-live', 'polite');
  });

  it('is not read out when it does not say so', () => {
    render(
      <Field description="Kept." id="language" label="Language">
        <input id="language" />
      </Field>,
    );

    expect(screen.getByText('Kept.').parentElement?.hasAttribute('aria-live')).toBe(false);
  });
});
