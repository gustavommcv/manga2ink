import { render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VersionGroup } from '@/domain/chapter-versions';
import { createMappingDraft } from '@/domain/mapping';
import { App } from '@/renderer/app';
import { useChapterPreviews } from '@/renderer/hooks/use-chapter-previews';
import { VersionsScreen } from '@/renderer/screens/versions-screen';
import type { Manga2InkBridge } from '@/shared/runtime-info';

import { addFolder, bridge, folder, installBridge, runButton } from './support/workflow';

afterEach(() => {
  Reflect.deleteProperty(window, 'manga2ink');
});

const six: VersionGroup = {
  token: '6',
  chapter: 6,
  candidates: [
    {
      id: 'six-a',
      name: 'Ch.0006 - Koala (en) [GroupA]',
      path: 'C:\\input\\a.cbz',
      kind: 'cbz',
      pageCount: 12,
      firstPage: '001.png',
    },
    {
      id: 'six-b',
      name: 'Ch.0006 - Koala (en) [GroupB]',
      path: 'C:\\input\\b',
      kind: 'folder',
      pageCount: 18,
    },
  ],
};

function open(
  groups: readonly VersionGroup[],
  overrides: Partial<React.ComponentProps<typeof VersionsScreen>> = {},
) {
  const onChoose = vi.fn();
  const onBack = vi.fn();
  const onDone = vi.fn();
  render(
    <VersionsScreen
      backLabel="Queue"
      groups={groups}
      name="Ubunchu"
      onBack={onBack}
      onChoose={onChoose}
      onDone={onDone}
      previews={new Map()}
      {...overrides}
    />,
  );
  return { onBack, onChoose, onDone };
}

describe('the screen where the files of one chapter are chosen among', () => {
  it('shows each file by its name, what it is, how many pages it has, and nothing chosen for the person', () => {
    open([six]);

    expect(
      screen.getByRole('heading', { name: 'Versions of the same chapter in Ubunchu' }),
    ).toBeVisible();
    const group = screen.getByRole('group', { name: 'Chapter 6' });
    expect(within(group).getByText('2 versions')).toBeVisible();
    expect(within(group).getByText('CBZ file · 12 pages')).toBeVisible();
    expect(within(group).getByText('Folder · 18 pages')).toBeVisible();
    for (const radio of within(group).getAllByRole('radio')) expect(radio).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('0 of 1 chapter decided');
    expect(within(group).getByText('Not decided yet')).toBeVisible();
  });

  it('chooses one version, all of them as alternatives, or none', async () => {
    const user = userEvent.setup();
    const { onChoose } = open([six]);

    await user.click(screen.getByRole('radio', { name: /GroupB/u }));
    await user.click(screen.getByRole('radio', { name: /Keep all 2 versions/u }));
    await user.click(screen.getByRole('radio', { name: /Leave this chapter out/u }));

    expect(onChoose.mock.calls).toEqual([
      ['6', ['six-b']],
      ['6', ['six-a', 'six-b']],
      ['6', []],
    ]);
  });

  it('shows what is chosen, and says when every chapter is', () => {
    const decided = (use: readonly string[]): VersionGroup => ({ ...six, use });
    const { unmount } = render(
      <VersionsScreen
        backLabel="Queue"
        groups={[decided(['six-b'])]}
        name="Ubunchu"
        onBack={vi.fn()}
        onChoose={vi.fn()}
        onDone={vi.fn()}
        previews={new Map()}
      />,
    );
    expect(screen.getByRole('radio', { name: /GroupB/u })).toBeChecked();
    expect(screen.getByRole('radio', { name: /GroupA/u })).not.toBeChecked();
    expect(screen.getByText('Decided')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Every chapter is decided.');
    unmount();

    for (const [use, label] of [
      [['six-a', 'six-b'], /Keep all 2 versions/u],
      [[], /Leave this chapter out/u],
    ] as const) {
      const rendered = render(
        <VersionsScreen
          backLabel="Queue"
          groups={[decided(use)]}
          name="Ubunchu"
          onBack={vi.fn()}
          onChoose={vi.fn()}
          onDone={vi.fn()}
          previews={new Map()}
        />,
      );
      expect(screen.getByRole('radio', { name: label })).toBeChecked();
      rendered.unmount();
    }
  });

  it('shows the first page of a file when it has one, and says when it has none', () => {
    open([six], { previews: new Map([['six-a', 'data:image/png;base64,AAAA']]) });

    expect(
      screen.getByRole('img', { name: 'First page of Ch.0006 - Koala (en) [GroupA]' }),
    ).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    expect(screen.getAllByText('No preview')).toHaveLength(1);
  });

  it('tells a file that came after the choice, or changed since, and offers the earlier choice again', async () => {
    const user = userEvent.setup();
    const flagged: VersionGroup = {
      ...six,
      candidates: [six.candidates[0]!, { ...six.candidates[1]!, attention: 'new' }],
      remembered: ['six-a'],
    };
    const changed: VersionGroup = {
      ...six,
      token: '7',
      candidates: [{ ...six.candidates[0]!, attention: 'changed' }, six.candidates[1]!],
    };
    const { onChoose } = open([flagged, changed]);

    expect(screen.getByText('New since you chose')).toBeVisible();
    expect(screen.getByText('Changed since you chose')).toBeVisible();
    expect(screen.getByText('Earlier you chose Ch.0006 - Koala (en) [GroupA].')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Choose it again' }));
    expect(onChoose).toHaveBeenCalledWith('6', ['six-a']);
  });

  it('does not offer an earlier choice that names none of the files', () => {
    open([
      { ...six, remembered: [] },
      { ...six, token: '8', remembered: ['gone'] },
    ]);

    expect(screen.queryByRole('button', { name: 'Choose it again' })).not.toBeInTheDocument();
  });

  it('goes back from the header whatever is decided, and goes on from the button only when every chapter is', async () => {
    const user = userEvent.setup();
    const { onBack, onDone } = open([six]);

    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(onBack).toHaveBeenCalledOnce();
    // The grouping that follows waits for every chapter to be decided.
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('goes on to the grouping from the button once every chapter is decided', async () => {
    const user = userEvent.setup();
    const { onDone } = open([{ ...six, use: ['six-a'] }]);

    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(onDone).toHaveBeenCalledOnce();
  });
});

/** The bridge is one object for the life of the window; a test gives the hook the same one each time. */
const bridges = new WeakMap<object, Pick<Manga2InkBridge, 'previewChapters'>>();
function stable(
  previewChapters: Manga2InkBridge['previewChapters'],
): Pick<Manga2InkBridge, 'previewChapters'> {
  const known = bridges.get(previewChapters);
  if (known !== undefined) return known;
  const made = { previewChapters };
  bridges.set(previewChapters, made);
  return made;
}

describe('the first pages that the screen shows', () => {
  const png = new Uint8Array([137, 80, 78, 71]);

  it('are asked for in batches, and added as they come', async () => {
    const ids = Array.from({ length: 30 }, (_, index) => `f${String(index)}`);
    const previewChapters = vi.fn<Manga2InkBridge['previewChapters']>((command) =>
      Promise.resolve({
        ok: true,
        value: command.ids.slice(0, 1).map((id) => ({ id, mime: 'image/png', bytes: png })),
      }),
    );

    const { result } = renderHook(() =>
      useChapterPreviews(stable(previewChapters), 'session', ids),
    );

    await waitFor(() => {
      expect(result.current.size).toBe(2);
    });
    expect(previewChapters.mock.calls.map(([command]) => command.ids.length)).toEqual([24, 6]);
    expect(result.current.get('f0')).toBe('data:image/png;base64,iVBORw==');
    expect(result.current.get('f24')).toBe('data:image/png;base64,iVBORw==');
  });

  it('are skipped without a word when they cannot be had', async () => {
    const previewChapters = vi.fn<Manga2InkBridge['previewChapters']>(() =>
      Promise.resolve({
        ok: false,
        error: { code: 'x', said: { id: 'text.raw', values: { text: 'No.' } } as never },
      }),
    );

    const { result } = renderHook(() =>
      useChapterPreviews(stable(previewChapters), 'session', ['a']),
    );

    await waitFor(() => {
      expect(previewChapters).toHaveBeenCalled();
    });
    expect(result.current.size).toBe(0);
  });

  it('are not asked for when there is nothing to show them for, and not kept past the page', async () => {
    const previewChapters = vi.fn<Manga2InkBridge['previewChapters']>(() =>
      Promise.resolve({ ok: true, value: [] }),
    );

    renderHook(() => useChapterPreviews(stable(previewChapters), undefined, ['a']));
    renderHook(() => useChapterPreviews(stable(previewChapters), 'session', []));
    expect(previewChapters).not.toHaveBeenCalled();

    // Leaving before the answer comes: nothing is set after the page is gone.
    let answer: (value: Awaited<ReturnType<Manga2InkBridge['previewChapters']>>) => void = () =>
      undefined;
    previewChapters.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );
    const { unmount } = renderHook(() =>
      useChapterPreviews(stable(previewChapters), 'session', ['a']),
    );
    await waitFor(() => {
      expect(previewChapters).toHaveBeenCalledTimes(1);
    });
    unmount();
    answer({ ok: true, value: [{ id: 'a', mime: 'image/png', bytes: png }] });
  });
});

describe('a folder with a chapter that more than one file claims, in the window', () => {
  const chapters = [
    { id: 'c1', name: 'Chapter 1', path: 'C:\\input\\Chapter 1', pageCount: 2, chapter: 1 },
    { id: 'six-a', name: 'Ch.6 A', path: 'C:\\input\\a.cbz', pageCount: 12, chapter: 6 },
  ] as const;
  const draft = createMappingDraft({
    mangaTitle: 'Offline Work',
    chapters,
    volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'six-a'] }],
    versions: [six],
  });

  const withVersions = (overrides: Partial<Manga2InkBridge> = {}): Manga2InkBridge =>
    bridge({
      chooseInputs: () =>
        Promise.resolve({ ok: true, value: { inputs: [folder()], rejected: [] } }),
      inspectInput: () =>
        Promise.resolve({
          ok: true,
          value: {
            sessionId: 'session',
            displayName: 'Offline Work',
            kind: 'folder',
            mapping: draft,
            issues: [],
          },
        }),
      ...overrides,
    });

  it('waits for the choice, asks for it where the folder is grouped, and goes on to the grouping with it', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(bridge().convert);
    const previewChapters = vi.fn<Manga2InkBridge['previewChapters']>(() =>
      Promise.resolve({
        ok: true,
        value: [{ id: 'six-a', mime: 'image/png', bytes: new Uint8Array([137, 80, 78, 71]) }],
      }),
    );
    installBridge(withVersions({ convert, previewChapters }));
    render(<App />);
    await addFolder(user);

    // The row says what it waits for and nothing runs. It has no button of its own for the choice:
    // it is made where the folder is grouped.
    expect(await screen.findByText('Choose versions')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Process/u })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /versions of chapters in Offline Work/u }),
    ).not.toBeInTheDocument();

    // The button that groups opens with the choice, and the grouping cannot be reached before it.
    await user.click(
      screen.getByRole('button', { name: 'Edit books and volumes for Offline Work' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Versions of the same chapter in Offline Work' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: /Organize Offline Work into books/u }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: 'First page of Ch.0006 - Koala (en) [GroupA]' }),
    ).toHaveAttribute('src', 'data:image/png;base64,iVBORw==');
    expect(previewChapters).toHaveBeenCalledWith({ sessionId: 'session', ids: ['six-a', 'six-b'] });
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /GroupB/u }));
    expect(screen.getByRole('status')).toHaveTextContent('Every chapter is decided.');
    await user.click(screen.getByRole('button', { name: 'Done' }));

    // Decided, it is the grouping that opens, and it says there were chapters in more than one version.
    expect(
      await screen.findByRole('heading', { name: /Organize Offline Work into books/u }),
    ).toBeVisible();
    expect(
      screen.getByText(/1 chapter of this folder comes in more than one version/u),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    expect(screen.queryByText('Choose versions')).not.toBeInTheDocument();
    await user.click(await runButton(1));
    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    const sent = convert.mock.calls[0]![0].mapping!;
    expect(sent.versions?.[0]?.use).toEqual(['six-b']);
  });

  it('leaves the choice for later from the queue, and offers to review it from the grouping', async () => {
    const user = userEvent.setup();
    installBridge(withVersions());
    render(<App />);
    await addFolder(user);

    await user.click(
      screen.getByRole('button', { name: 'Edit books and volumes for Offline Work' }),
    );
    await screen.findByRole('heading', { name: 'Versions of the same chapter in Offline Work' });
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(await screen.findByText('Choose versions')).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: 'Edit books and volumes for Offline Work' }),
    );
    await user.click(await screen.findByRole('radio', { name: /GroupA/u }));
    await user.click(screen.getByRole('button', { name: 'Done' }));

    // From the grouping, the review comes back to the grouping and not to the queue.
    await user.click(await screen.findByRole('button', { name: 'Review the versions' }));
    expect(
      await screen.findByRole('heading', { name: 'Versions of the same chapter in Offline Work' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Offline Work' }));
    expect(
      await screen.findByRole('heading', { name: /Organize Offline Work into books/u }),
    ).toBeVisible();
  });

  it('does not offer to review the versions of a folder that has none', async () => {
    const user = userEvent.setup();
    installBridge(bridge());
    render(<App />);
    await addFolder(user);

    await user.click(
      screen.getByRole('button', { name: 'Edit books and volumes for Offline Work' }),
    );
    await screen.findByRole('heading', { name: /Organize Offline Work into books/u });

    expect(screen.queryByRole('button', { name: 'Review the versions' })).not.toBeInTheDocument();
  });
});
