import { render, screen } from '@testing-library/react';
import { Folder } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { Badge } from '@/renderer/components/shared/badge';
import { IconTile } from '@/renderer/components/shared/icon-tile';
import { ListRow } from '@/renderer/components/shared/list-row';

const list = (children: React.ReactNode) => render(<ul>{children}</ul>);

describe('a row of a list', () => {
  it('has its name, what is known of it, and what more is worth saying', () => {
    list(
      <ListRow
        detail="Folder · 3 chapters"
        icon={<Folder />}
        notes="No volumes yet."
        title="Random scans"
        titleHint="/books/Random scans"
      />,
    );

    const row = screen.getByRole('listitem');
    expect(row).toHaveTextContent('Random scans');
    expect(row).toHaveTextContent('Folder · 3 chapters');
    expect(row).toHaveTextContent('No volumes yet.');
    expect(screen.getByText('Random scans')).toHaveAttribute('title', '/books/Random scans');
  });

  it('has no line of notes when it has none', () => {
    const { container } = list(<ListRow detail="CBZ" icon={<Folder />} title="Vagabond" />);

    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('has its state before its buttons, in the places they are given', () => {
    list(
      <ListRow
        actions={[
          <button key="a" type="button">
            Edit
          </button>,
          <button key="b" type="button">
            Remove
          </button>,
        ]}
        detail="CBZ"
        icon={<Folder />}
        status={<Badge tone="accent">2 volumes</Badge>}
        title="Chainsaw Man"
      />,
    );

    const group = screen.getByText('2 volumes').parentElement;
    expect([...(group?.children ?? [])].map((child) => child.textContent)).toEqual([
      '2 volumes',
      'Edit',
      'Remove',
    ]);
  });

  it('keeps the place of a button it has not, so that the state is in the same column as its neighbors', () => {
    list(
      <ListRow
        actions={[
          undefined,
          undefined,
          <button key="c" type="button">
            Remove
          </button>,
        ]}
        detail="Folder"
        icon={<Folder />}
        status={<Badge>Checking…</Badge>}
        title="New download"
      />,
    );

    const group = screen.getByText('Checking…').parentElement;
    const places = [...(group?.children ?? [])];
    // The state, two empty places and the button: the same four as a row that has them all.
    expect(places).toHaveLength(4);
    for (const place of places.slice(1, 3)) {
      expect(place).toHaveAttribute('aria-hidden', 'true');
      expect(place).toHaveClass('size-9');
    }
  });
});

describe('a badge', () => {
  it.each([
    ['neutral', 'bg-muted'],
    ['accent', 'bg-accent/15'],
    ['warning', 'bg-status-warning/15'],
    ['danger', 'bg-status-failed/15'],
  ] as const)('is tinted as a %s one', (tone, tint) => {
    render(<Badge tone={tone}>State</Badge>);

    expect(screen.getByText('State')).toHaveClass(tint, 'rounded-full');
  });

  it('is neutral when it is not told', () => {
    render(<Badge>5</Badge>);

    expect(screen.getByText('5')).toHaveClass('bg-muted');
  });
});

describe('the tile of a row', () => {
  it('is hidden from a screen reader and holds an icon or a letter', () => {
    render(<IconTile>A</IconTile>);

    expect(screen.getByText('A')).toHaveAttribute('aria-hidden', 'true');
  });
});
