import { Fragment } from 'react';
import type React from 'react';

import { IconTile } from './icon-tile';
import { Note } from '@/renderer/components/shared/note';

/**
 * A row of a list of things a person can act on (ADR 0078): the queue, the titles of a library, the
 * books that are ready. The kind of thing is the tile at its start, its name has what is known of it
 * under it, and at the end are its state (`status`) and the buttons it has.
 *
 * Every row of a list has the same places for its buttons, in the same order: `actions` has one entry
 * for each button any row of the list can have, and a button this row does not have is `undefined`,
 * which leaves its place empty, so the state and the buttons of every row are in the same columns. When
 * the row is too narrow for the name and all that, the state and the buttons drop under the name,
 * rather than leaving the name a few letters wide.
 */
export function ListRow({
  actions = [],
  detail,
  icon,
  notes,
  status,
  title,
  titleHint,
}: {
  readonly actions?: readonly (React.ReactElement | undefined)[];
  /** What is known of the thing, in a line under its name. */
  readonly detail: React.ReactNode;
  readonly icon: React.ReactNode;
  /** More that is worth saying, under the line of detail. */
  readonly notes?: React.ReactNode;
  readonly status?: React.ReactNode;
  readonly title: string;
  /** What the name is short for, shown when it is cut. */
  readonly titleHint?: string;
}): React.JSX.Element {
  return (
    <li className="hover:bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 transition-colors">
      <IconTile>{icon}</IconTile>
      <div className="min-w-48 flex-1">
        <p className="truncate text-sm font-medium" title={titleHint}>
          {title}
        </p>
        <Note className="truncate">{detail}</Note>
        {notes !== undefined && <Note className="mt-1">{notes}</Note>}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {status}
        {/* The places are fixed, so the entries are told apart by where they are. */}
        {actions.map((action, place) =>
          action === undefined ? (
            <span aria-hidden="true" className="size-9 shrink-0" key={place} />
          ) : (
            <Fragment key={place}>{action}</Fragment>
          ),
        )}
      </div>
    </li>
  );
}
