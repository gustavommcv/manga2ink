import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '@/renderer/app';
import { InfoBanner } from '@/renderer/components/shared/info-banner';

import { inPortuguese } from './support/i18n';
import { bridge, installBridge } from './support/workflow';
import { defaultAppSettings } from '@/domain/app-settings';

afterEach(() => {
  Reflect.deleteProperty(window, 'mangabound');
});

// The rule against text written in a component (ADR 0052) found these two, which no test said in
// Portuguese before.
describe('the last words that were written in a component, in Portuguese', () => {
  it('names a banner that has no title by what it is', () => {
    render(inPortuguese(<InfoBanner message="Um aviso." />));

    expect(screen.getByRole('status', { name: 'Informação' })).toBeVisible();
  });

  it('goes back to the queue from the editor of the volumes with the name of the queue', async () => {
    const user = userEvent.setup();
    installBridge(
      bridge({
        loadAppSettings: () =>
          Promise.resolve({
            ok: true,
            value: {
              settings: { ...defaultAppSettings, language: 'pt-BR' },
              language: 'pt-BR',
              unreadable: false,
            },
          }),
      }),
    );
    render(<App />);

    const add = await screen.findByRole('button', { name: 'Pasta' });
    await waitFor(() => {
      expect(add).toBeEnabled();
    });
    await user.click(add);
    await user.click(
      await screen.findByRole('button', { name: 'Editar os volumes de Offline Work' }),
    );

    const back = await screen.findByRole('button', { name: 'Fila' });
    await user.click(back);

    expect(await screen.findByRole('heading', { name: 'Fila' })).toBeVisible();
  });
});
