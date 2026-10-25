import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { QueueRow } from '@/domain/input-queue';
import { createMappingDraft } from '@/domain/mapping';
import { defaultMangaprepSettings } from '@/domain/output-profile';
import type { WorkingSpace } from '@/domain/working-space';
import { QueueScreen, type QueueScreenProps } from '@/renderer/screens/queue-screen';

import { inLanguage } from './support/i18n';

const GiB = 1024 ** 3;
const warned = /free where Manga2Ink works/u;

/** 3000 pages in one volume: about 2.9 GB for each of the two places. */
const bigFolder: QueueRow = {
  id: 'a',
  kind: 'folder',
  displayName: 'Berserk',
  displayPath: 'D:\\Manga\\Berserk',
  state: 'inspected',
  sessionId: 'session-a',
  mapping: createMappingDraft({
    mangaTitle: 'Berserk',
    chapters: [{ id: 'c1', name: 'Chapter 1', path: '/m/1', pageCount: 3000, chapter: 1 }],
    volumes: [{ id: 'v1', number: '1', chapterIds: ['c1'] }],
  }),
  confirmed: false,
};

const room = (overrides: Partial<WorkingSpace> = {}): WorkingSpace => ({
  scratchFreeBytes: 50 * GiB,
  pendingFreeBytes: 50 * GiB,
  sameDrive: false,
  ...overrides,
});

function props(overrides: Partial<QueueScreenProps> = {}): QueueScreenProps {
  return {
    disabled: false,
    format: 'cbz',
    mode: 'bind-and-convert',
    onAddFiles: vi.fn(),
    onAddFolders: vi.fn(),
    onClear: vi.fn(),
    onConvert: vi.fn(),
    onDeviceProfile: vi.fn(),
    onDismissRejected: vi.fn(),
    onDropFiles: vi.fn(),
    onEdit: vi.fn(),
    onEditDetails: vi.fn(),
    onEditOptions: vi.fn(),
    onFormat: vi.fn(),
    onMode: vi.fn(),
    onOpenOptions: vi.fn(),
    onRemove: vi.fn(),
    onReset: vi.fn(),
    onValidate: vi.fn(),
    profiles: [],
    rejected: [],
    rows: [bigFolder],
    settings: defaultMangaprepSettings,
    space: room(),
    validating: false,
    ...overrides,
  };
}

describe('the warning of too little room, before the queue is processed', () => {
  it('says how much is free where the app works and how much the queue may take', () => {
    render(
      inLanguage(
        'en',
        <QueueScreen {...props({ space: room({ pendingFreeBytes: 1.5 * GiB }) })} />,
      ),
    );

    const warning = screen.getByText(warned);
    expect(warning).toHaveTextContent(
      'Only 1.5 GB are free where Manga2Ink works, and this queue may take about 2.9 GB.',
    );
    expect(warning).toHaveTextContent('App settings, under Processing');
  });

  it('is in the language of the window, with the numbers written as it writes them', () => {
    render(
      inLanguage(
        'pt-BR',
        <QueueScreen {...props({ space: room({ pendingFreeBytes: 1.5 * GiB }) })} />,
      ),
    );

    expect(screen.getByText(/livres onde o Manga2Ink trabalha/u)).toHaveTextContent(
      'Só há 1,5 GB livres onde o Manga2Ink trabalha, e esta fila pode ocupar cerca de 2,9 GB.',
    );
  });

  it('leaves the button as it was: the warning does not stop anyone', () => {
    render(
      inLanguage('en', <QueueScreen {...props({ space: room({ pendingFreeBytes: GiB }) })} />),
    );

    expect(screen.getByRole('button', { name: 'Process 1 item' })).toBeEnabled();
  });

  it('says nothing when there is room', () => {
    render(inLanguage('en', <QueueScreen {...props()} />));

    expect(screen.queryByText(warned)).not.toBeInTheDocument();
  });

  it('says nothing while it is not known what is free', () => {
    render(inLanguage('en', <QueueScreen {...props({ space: null })} />));

    expect(screen.queryByText(warned)).not.toBeInTheDocument();
  });

  it('says nothing for an empty queue, however little is free', () => {
    render(
      inLanguage(
        'en',
        <QueueScreen {...props({ rows: [], space: room({ pendingFreeBytes: 100 }) })} />,
      ),
    );

    expect(screen.queryByText(warned)).not.toBeInTheDocument();
  });
});
