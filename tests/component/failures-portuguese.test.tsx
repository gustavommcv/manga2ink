import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { message } from '@/domain/message';
import { defaultPreferences } from '@/domain/preferences';
import { App } from '@/renderer/app';
import type { MangaboundBridge } from '@/shared/runtime-info';

import { bridge, installBridge } from './support/workflow';

afterEach(() => {
  Reflect.deleteProperty(window, 'mangabound');
});

const inPortugueseWith = (overrides: Partial<MangaboundBridge>): void => {
  installBridge(
    bridge({
      loadAppSettings: () =>
        Promise.resolve({
          ok: true,
          value: { settings: { language: 'pt-BR' }, language: 'pt-BR', unreadable: false },
        }),
      ...overrides,
    }),
  );
};

describe('what the window says when something could not be done, in Portuguese', () => {
  it('says the failure of a step in a box of its own, with the words of the box', async () => {
    const user = userEvent.setup();
    inPortugueseWith({
      chooseInputs: () =>
        Promise.resolve({
          ok: false,
          error: { code: 'file_access_denied', said: message('failure.fileAccessDenied', {}) },
        }),
    });
    render(<App />);

    const files = await screen.findByRole('button', { name: 'Arquivos' });
    await waitFor(() => {
      expect(files).toBeEnabled();
    });
    await user.click(files);

    const box = await screen.findByRole('alert', { name: 'Erro no fluxo' });
    expect(box).toHaveTextContent('Não foi possível concluir esta etapa');
    expect(box).toHaveTextContent(
      'O Mangabound não teve permissão para usar um arquivo ou pasta de que precisa.',
    );
  });

  it('says what could not be restored at the start, in the notices', async () => {
    inPortugueseWith({
      loadSettings: () =>
        Promise.resolve({
          ok: true,
          value: {
            preferences: defaultPreferences,
            notices: [
              message('notice.settingsUnreadable', {}),
              message('notice.optionsReset', { options: ['gamma'] }),
            ],
          },
        }),
    });
    render(<App />);

    const notices = await screen.findByRole('status', { name: 'Avisos' });
    expect(notices).toHaveTextContent(
      'Não foi possível ler as configurações salvas, então os padrões estão em uso.',
    );
    expect(notices).toHaveTextContent(
      'Algumas opções salvas não puderam ser usadas e voltaram aos padrões: gama.',
    );
  });

  it('says why something was not added, and what was past the limit on its own', async () => {
    const user = userEvent.setup();
    inPortugueseWith({
      chooseInputs: () =>
        Promise.resolve({
          ok: true,
          value: {
            inputs: [],
            rejected: [
              { name: 'notes.txt', reason: message('input.onlyFoldersAndCbz', {}) },
              { reason: message('input.overLimit', { left: 2, limit: 100 }) },
            ],
          },
        }),
    });
    render(<App />);

    const files = await screen.findByRole('button', { name: 'Arquivos' });
    await waitFor(() => {
      expect(files).toBeEnabled();
    });
    await user.click(files);

    expect(
      await screen.findByText(
        (_, element) =>
          element?.tagName === 'LI' &&
          element.textContent ===
            'notes.txt não foi adicionado. Só é possível adicionar pastas e arquivos .cbz.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText('Só os primeiros 100 itens são adicionados de uma vez; 2 ficaram de fora.'),
    ).toBeVisible();
  });
});
