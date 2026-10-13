import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createMappingDraft, type MappingDraft } from '@/domain/mapping';
import { MappingEditor } from '@/renderer/components/mapping/mapping-editor';

const chapters = [1, 2, 3, 4].map((number) => ({
  id: `chapter-${String(number)}`,
  name: `Chapter ${String(number)}`,
  path: `Chapter 00${String(number)}.cbz`,
  pageCount: 20 + number,
  chapter: number,
}));

/** Two volumes, the first holding chapters 1 and 2 and the second 3 and 4. */
const twoVolumes = (): MappingDraft =>
  createMappingDraft({
    mangaTitle: 'Volumes Work',
    chapters,
    volumes: [
      { id: 'volume-1', number: '1', chapterIds: ['chapter-1', 'chapter-2'] },
      { id: 'volume-2', number: '2', chapterIds: ['chapter-3', 'chapter-4'] },
    ],
  });

/** What a chapter row says about where it is: its name is followed by its volume. */
const placeOf = (name: string): string => {
  const row = screen.getByLabelText(`Select ${name}`).closest('div');
  if (row === null) throw new Error(`No row for ${name}`);
  return within(row).getByText(/^(Volume \d+|Unassigned)$/u).textContent;
};

/** A complete mapping opens as a summary; the editor is one click away. */
const openEditor = async (user: UserEvent): Promise<void> => {
  await user.click(screen.getByRole('button', { name: 'Edit chapter mapping' }));
};

describe('the volumes of the mapping editor', () => {
  it('lets a selection be taken back, and moves only the chapters still selected', async () => {
    const user = userEvent.setup();
    render(<MappingEditor initialDraft={twoVolumes()} />);
    await openEditor(user);

    await user.click(screen.getByLabelText('Select Chapter 1'));
    await user.click(screen.getByLabelText('Select Chapter 2'));
    expect(screen.getByText('2 of 4 selected')).toBeVisible();
    await user.click(screen.getByLabelText('Select Chapter 1'));
    expect(screen.getByText('1 of 4 selected')).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Move selected chapters to'), 'volume-2');
    await user.click(screen.getByRole('button', { name: 'Assign selected' }));

    expect(placeOf('Chapter 1')).toBe('Volume 1');
    expect(placeOf('Chapter 2')).toBe('Volume 2');
    // The selection was used up by the move.
    expect(screen.getByText('0 of 4 selected')).toBeVisible();
  });

  it('puts the chapters selected outside of every volume, and clears the selection', async () => {
    const user = userEvent.setup();
    render(<MappingEditor initialDraft={twoVolumes()} />);
    await openEditor(user);
    await user.click(screen.getByLabelText('Select Chapter 3'));
    await user.click(screen.getByLabelText('Select Chapter 4'));

    await user.click(screen.getByRole('button', { name: 'Unassign' }));

    expect(placeOf('Chapter 3')).toBe('Unassigned');
    expect(placeOf('Chapter 4')).toBe('Unassigned');
    expect(placeOf('Chapter 2')).toBe('Volume 1');
    expect(screen.getByText('0 of 4 selected')).toBeVisible();
    // Chapters with no volume are the editor's to flag, and the mapping cannot be confirmed.
    expect(screen.getByRole('button', { name: 'Confirm mapping' })).toBeDisabled();
  });

  it('leaves Unassign and Assign selected for when something is selected', async () => {
    const user = userEvent.setup();
    render(<MappingEditor initialDraft={twoVolumes()} />);
    await openEditor(user);

    expect(screen.getByRole('button', { name: 'Unassign' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Assign selected' })).toBeDisabled();
  });

  it('moves a range to the volume chosen beside it', async () => {
    const user = userEvent.setup();
    render(<MappingEditor initialDraft={twoVolumes()} />);
    await openEditor(user);

    await user.selectOptions(screen.getByLabelText('From'), 'chapter-1');
    await user.selectOptions(screen.getByLabelText('Through'), 'chapter-2');
    await user.selectOptions(screen.getByLabelText('Volume'), 'volume-2');
    await user.click(screen.getByRole('button', { name: 'Assign range' }));

    expect(placeOf('Chapter 1')).toBe('Volume 2');
    expect(placeOf('Chapter 2')).toBe('Volume 2');
    expect(placeOf('Chapter 3')).toBe('Volume 2');
  });

  it('removes a volume, and what it held has no volume until it is placed', async () => {
    const user = userEvent.setup();
    render(<MappingEditor initialDraft={twoVolumes()} />);
    await openEditor(user);

    await user.click(screen.getByRole('button', { name: 'Remove volume 2' }));

    expect(screen.getByText('1 created')).toBeVisible();
    expect(placeOf('Chapter 3')).toBe('Unassigned');
    expect(placeOf('Chapter 4')).toBe('Unassigned');
    expect(placeOf('Chapter 1')).toBe('Volume 1');
  });

  it('merges a volume into the one before it, and the one it was merged from is gone', async () => {
    const user = userEvent.setup();
    render(<MappingEditor initialDraft={twoVolumes()} />);
    await openEditor(user);
    expect(screen.queryByRole('button', { name: /^Merge into volume 0/u })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Merge into volume 1' }));

    expect(screen.getByText('1 created')).toBeVisible();
    for (const name of ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4']) {
      expect(placeOf(name)).toBe('Volume 1');
    }
  });

  it('splits a volume before the chapter chosen, and numbers the new volume after the last', async () => {
    const user = userEvent.setup();
    const draft = createMappingDraft({
      mangaTitle: 'Split Work',
      chapters,
      volumes: [{ id: 'volume-1', number: '1', chapterIds: chapters.map((chapter) => chapter.id) }],
    });
    render(<MappingEditor initialDraft={draft} />);
    await openEditor(user);

    await user.selectOptions(screen.getByLabelText('Split before'), 'chapter-3');
    await user.click(screen.getByRole('button', { name: 'Split volume 1' }));

    expect(screen.getByText('2 created')).toBeVisible();
    expect(placeOf('Chapter 2')).toBe('Volume 1');
    expect(placeOf('Chapter 3')).toBe('Volume 2');
    expect(placeOf('Chapter 4')).toBe('Volume 2');
    // The next volume a person adds comes after the one the split made.
    expect(screen.getByLabelText('New volume number')).toHaveValue('3');
  });

  it('adds a volume with the number typed, and goes on from the one after it', async () => {
    const user = userEvent.setup();
    render(<MappingEditor initialDraft={twoVolumes()} />);
    await openEditor(user);

    const number = screen.getByLabelText('New volume number');
    await user.clear(number);
    await user.type(number, '7');
    await user.click(screen.getByRole('button', { name: 'Add volume' }));

    expect(screen.getByText('3 created')).toBeVisible();
    expect(screen.getByLabelText('Volume number for volume 7')).toBeVisible();
    expect(number).toHaveValue('8');
  });

  it('puts every edit back with Reset all, and the selection with them', async () => {
    const user = userEvent.setup();
    render(<MappingEditor initialDraft={twoVolumes()} />);
    await openEditor(user);
    const reset = screen.getByRole('button', { name: 'Reset all mapping edits' });
    expect(reset).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Merge into volume 1' }));
    await user.click(screen.getByLabelText('Select Chapter 2'));
    expect(reset).toBeEnabled();

    await user.click(reset);

    expect(screen.getByText('2 created')).toBeVisible();
    expect(placeOf('Chapter 3')).toBe('Volume 2');
    expect(screen.getByText('0 of 4 selected')).toBeVisible();
    expect(reset).toBeDisabled();
  });
});

describe('confirming the mapping', () => {
  const confirmable = (onConfirm: () => void): React.JSX.Element => (
    <MappingEditor initialDraft={twoVolumes()} onConfirm={onConfirm} />
  );

  it('says it could not be saved with the reason, when the caller throws', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(() => {
      throw new Error('The folder is read-only.');
    });
    render(confirmable(onConfirm));

    await user.click(screen.getByRole('button', { name: 'Confirm mapping' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByText('The folder is read-only.')).toBeVisible();
    expect(screen.queryByText('Mapping confirmed.')).not.toBeInTheDocument();
  });

  it('says it could not be saved, without a reason, when what was thrown is not an error', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'nope';
    });
    render(confirmable(onConfirm));

    await user.click(screen.getByRole('button', { name: 'Confirm mapping' }));

    expect(screen.getByText('The mapping could not be saved.')).toBeVisible();
  });

  it('says it was confirmed when the caller took it', async () => {
    const user = userEvent.setup();
    render(confirmable(vi.fn()));

    await user.click(screen.getByRole('button', { name: 'Confirm mapping' }));

    expect(screen.getByText('Mapping confirmed.')).toBeVisible();
  });
});
