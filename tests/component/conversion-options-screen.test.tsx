import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { defaultMangapressSettings } from '@/domain/output-profile';
import { defaultFormat } from '@/domain/preferences';
import {
  ConversionOptionsScreen,
  type ConversionOptionsScreenProps,
} from '@/renderer/screens/conversion-options-screen';

const profiles = [
  {
    code: 'KPW6',
    name: 'Kindle Paperwhite 6',
    width: 1272,
    height: 1696,
    grayLevels: 16,
    family: 'kindle',
  },
];

const props = (
  overrides: Partial<ConversionOptionsScreenProps> = {},
): ConversionOptionsScreenProps => ({
  format: defaultFormat,
  itemsWithOptions: 0,
  onBack: vi.fn(),
  onClearItemOptions: vi.fn(),
  onFormat: vi.fn(),
  onNotify: vi.fn(),
  onReset: vi.fn(),
  onSettings: vi.fn(),
  profiles,
  settings: defaultMangapressSettings,
  singleBook: false,
  ...overrides,
});

describe('the conversion options screen', () => {
  it('focuses its heading on entry, explains its scope and offers a keyboard back action', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<ConversionOptionsScreen {...props({ onBack })} />);

    expect(screen.getByRole('region', { name: 'Conversion options' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Conversion options' })).toHaveFocus();
    expect(screen.getByText(/Your choices are saved for next time/u)).toBeVisible();
    const back = screen.getByRole('button', { name: 'Back' });
    back.focus();
    await user.keyboard('{Enter}');
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('says nothing of items when none has options of its own', () => {
    render(<ConversionOptionsScreen {...props()} />);

    expect(screen.queryByRole('group', { name: 'Items with options of their own' })).toBeNull();
    expect(screen.queryByRole('button', { name: /for all/u })).toBeNull();
  });

  it.each([
    [1, '1 item in the queue is converted with options of their own.'],
    [3, '3 items in the queue are converted with options of their own.'],
  ])(
    'says how many items have options of their own (%i), and puts them all back on request',
    async (count, sentence) => {
      const user = userEvent.setup();
      const onClearItemOptions = vi.fn();
      const { rerender } = render(
        <ConversionOptionsScreen {...props({ itemsWithOptions: count, onClearItemOptions })} />,
      );
      const notice = screen.getByRole('group', { name: 'Items with options of their own' });
      expect(within(notice).getByText(sentence)).toBeVisible();
      expect(within(notice).getByText(/They keep what they set/u)).toBeVisible();

      await user.click(
        within(notice).getByRole('button', { name: 'Use the queue’s options for all' }),
      );
      expect(onClearItemOptions).toHaveBeenCalledOnce();
      // The workflow clears them; the answer takes the place of the notice and holds the focus.
      rerender(<ConversionOptionsScreen {...props({ itemsWithOptions: 0, onClearItemOptions })} />);

      const answer = screen.getByText(/now follows? the queue’s options\./u);
      expect(answer).toHaveTextContent(
        `${String(count)} ${count === 1 ? 'item now follows' : 'items now follow'} the queue’s options.`,
      );
      expect(answer).toHaveFocus();
      expect(screen.queryByRole('group', { name: 'Items with options of their own' })).toBeNull();
    },
  );

  it('does not ask to reset when every option is already at its default', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<ConversionOptionsScreen {...props({ onReset })} />);

    const reset = screen.getByRole('button', { name: 'Reset to defaults' });
    expect(reset).toHaveAttribute('aria-disabled', 'true');
    expect(reset).toHaveAccessibleDescription('Every option is already at its default.');
    await user.click(reset);
    expect(screen.queryByRole('group', { name: 'Confirm reset' })).not.toBeInTheDocument();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('forwards format and setting changes and follows parent updates without stealing field focus', async () => {
    const user = userEvent.setup();
    const onFormat = vi.fn();
    const onSettings = vi.fn();
    const initial = props({ onFormat, onSettings });
    const { rerender } = render(<ConversionOptionsScreen {...initial} />);

    await user.selectOptions(screen.getByLabelText('Book format'), 'cbz');
    expect(onFormat).toHaveBeenCalledExactlyOnceWith('cbz');
    const quality = screen.getByLabelText(/^JPEG quality/u);
    await user.type(quality, '8');
    expect(onSettings).toHaveBeenLastCalledWith({ ...defaultMangapressSettings, jpegQuality: 8 });
    rerender(
      <ConversionOptionsScreen
        {...initial}
        format="cbz"
        settings={{ ...defaultMangapressSettings, jpegQuality: 8 }}
      />,
    );
    expect(quality).toHaveFocus();
    await user.type(quality, '0');
    expect(onSettings).toHaveBeenLastCalledWith({ ...defaultMangapressSettings, jpegQuality: 80 });

    rerender(
      <ConversionOptionsScreen
        {...initial}
        format="cbz"
        settings={{ ...defaultMangapressSettings, jpegQuality: 80 }}
      />,
    );
    expect(quality).toHaveValue(80);
    expect(quality).toHaveFocus();
    expect(screen.getByLabelText('Book format')).toHaveValue('cbz');
    expect(screen.getByRole('button', { name: 'Reset to defaults' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it('confirms the existing reset scope, cancels without changes and invokes reset only on confirmation', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<ConversionOptionsScreen {...props({ format: 'pdf', onReset })} />);

    const trigger = screen.getByRole('button', { name: 'Reset to defaults' });
    await user.click(trigger);
    const confirmation = screen.getByRole('group', { name: 'Confirm reset' });
    expect(confirmation).toHaveTextContent(
      'Put the device, format and every mangapress option back to their defaults?',
    );
    expect(onReset).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(onReset).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    expect(screen.getByLabelText('Book format')).toHaveValue('pdf');

    await user.click(trigger);
    await user.click(
      within(screen.getByRole('group', { name: 'Confirm reset' })).getByRole('button', {
        name: 'Reset',
      }),
    );
    expect(onReset).toHaveBeenCalledExactlyOnceWith();
    expect(screen.queryByRole('group', { name: 'Confirm reset' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps the single-book notice and format lock while other conversion choices remain editable', async () => {
    const user = userEvent.setup();
    const onSettings = vi.fn();
    const onFormat = vi.fn();
    render(
      <ConversionOptionsScreen
        {...props({ singleBook: true, format: 'epub', onFormat, onSettings })}
      />,
    );

    expect(screen.getByRole('status', { name: 'Single book for the series' })).toHaveTextContent(
      'Book format and process steps are locked.',
    );
    expect(screen.getByLabelText('Book format')).toBeDisabled();
    expect(screen.getByLabelText('Book format')).toHaveValue('epub');
    await user.selectOptions(screen.getByLabelText('Book format'), 'pdf');
    expect(onFormat).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText('Page format'), 'png');
    expect(onSettings).toHaveBeenCalledExactlyOnceWith({
      ...defaultMangapressSettings,
      forcePng: true,
    });
  });

  it('shows unavailable profiles and existing validation errors without inventing a fallback', () => {
    const initial = props({ profiles: [] });
    const { rerender } = render(<ConversionOptionsScreen {...initial} />);
    expect(screen.getByLabelText('Device profile')).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Profiles unavailable' })).toBeInTheDocument();

    rerender(
      <ConversionOptionsScreen
        {...initial}
        profiles={profiles}
        settings={{ ...defaultMangapressSettings, jpegQuality: 500 }}
      />,
    );
    expect(screen.getByLabelText('Device profile')).toBeEnabled();
    const quality = screen.getByLabelText(/^JPEG quality/u);
    expect(quality).toBeInvalid();
    expect(quality).toHaveAccessibleDescription(/JPEG quality/u);
  });
});
