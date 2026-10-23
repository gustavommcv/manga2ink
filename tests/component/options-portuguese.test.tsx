import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BookFormat } from '@/domain/conversion';
import { message } from '@/domain/message';
import { defaultMangaprepSettings, type MangaprepSettings } from '@/domain/output-profile';
import { defaultPreferences } from '@/domain/preferences';
import { MangaprepSettingsEditor } from '@/renderer/components/settings/mangaprep-settings';
import { App } from '@/renderer/app';

import { inPortuguese } from './support/i18n';
import { bridge, installBridge } from './support/workflow';
import { defaultAppSettings } from '@/domain/app-settings';

const profiles = [
  {
    code: 'KPW6',
    name: 'Kindle Paperwhite 6',
    width: 1272,
    height: 1696,
    grayLevels: 16,
    family: 'kindle',
  },
  {
    code: 'KoAO',
    name: 'Kobo Aura One',
    width: 1404,
    height: 1872,
    grayLevels: 16,
    family: 'kobo',
  },
];

function editor(
  settings: Partial<MangaprepSettings> = {},
  format: BookFormat = 'epub',
  extra: { readonly singleBook?: boolean } = {},
): React.JSX.Element {
  return inPortuguese(
    <MangaprepSettingsEditor
      format={format}
      onFormat={vi.fn()}
      onNotify={vi.fn()}
      onSettings={vi.fn()}
      profiles={profiles}
      settings={{ ...defaultMangaprepSettings, ...settings }}
      {...extra}
    />,
  );
}

describe('the fields of the conversion options, in Portuguese', () => {
  it('names each section, with what it is for', () => {
    render(editor());

    for (const [title, description] of [
      [
        'Dispositivo e saída',
        'Escolha o leitor de destino, o formato do livro e, se quiser, uma resolução própria.',
      ],
      ['Leitura', 'O que são as imagens e em que sentido são lidas.'],
      ['Páginas duplas', 'O que acontece com uma página que tem a largura de duas.'],
      ['Tamanho e bordas', 'Como uma página preenche a tela e o que a cerca.'],
      ['Corte', 'Remove as margens ao redor de uma página e o espaço vazio entre os quadros.'],
      ['Visão de duas páginas', 'Para leitores que mostram duas páginas lado a lado'],
      ['Cor e tom', 'Se a cor é mantida e como os tons de uma página são corrigidos.'],
      ['Imagens das páginas', 'O tipo de arquivo em que cada página é salva.'],
      ['Capa', 'A capa que o leitor mostra na sua biblioteca'],
      ['Metadados do livro', 'Como os metadados de origem são aplicados'],
      ['Comportamento das ferramentas', 'Controles para diagnóstico de problemas'],
    ] as const) {
      const section = screen.getByRole('heading', { name: title }).closest('section')!;
      expect(section).toHaveTextContent(description);
    }
    expect(screen.getAllByText('Básico')).toHaveLength(2);
    expect(screen.getByText('Diagnóstico')).toBeVisible();
  });

  it('says the device, its size and its format, and the custom size that overrides them', () => {
    render(editor());

    expect(screen.getByLabelText('Perfil do dispositivo')).toHaveAccessibleDescription(
      '1272 × 1696 · 16 níveis de cinza',
    );
    expect(screen.getByLabelText('Formato do livro')).toBeVisible();
    expect(screen.getByLabelText('Largura personalizada (opcional)')).toHaveAccessibleDescription(
      'Substitui a largura do perfil. Obrigatória, junto com a altura, no perfil OTHER.',
    );
    expect(screen.getByLabelText('Largura personalizada (opcional)')).toHaveAttribute(
      'placeholder',
      '1272',
    );
    expect(screen.getByLabelText('Usar as imagens como estão')).toHaveAccessibleDescription(
      'Empacota as páginas sem tocar nelas: sem corte, redimensionamento, tons de cinza nem recodificação.',
    );
  });

  it('says what each choice of a field is called and what it does', () => {
    render(editor());

    const wide = screen.getByLabelText('Páginas largas');
    expect(
      within(wide)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Dividir em duas páginas',
      'Manter inteira, como uma página',
      'As duas: as metades e depois a inteira',
    ]);
    expect(wide).toHaveAccessibleDescription(
      'As duas metades e, depois, a página dupla inteira de novo.',
    );
    expect(
      within(screen.getByLabelText('Tamanho da página'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Ajustar, sem ampliar',
      'Ajustar, ampliando páginas pequenas',
      'Esticar até a tela',
      'Cortar para preencher a tela',
    ]);
    expect(screen.getByLabelText('Bordas')).toHaveAccessibleDescription(
      'Cada página recebe o fundo que as suas próprias bordas têm.',
    );
    expect(screen.getByLabelText('Contraste automático')).toHaveAccessibleDescription(
      'Os tons são esticados até o preto e o branco totais; as páginas coloridas não são mexidas.',
    );
    expect(screen.getByLabelText('Formato da página')).toHaveAccessibleDescription(
      'Tons suaves em arquivos pequenos. A escolha habitual.',
    );
  });

  it('says why a control has no effect, by the code that the domain gave it', () => {
    render(editor({ webtoon: true }));

    expect(screen.getByLabelText('Ordem de leitura de mangá')).toBeDisabled();
    expect(screen.getByLabelText('Ordem de leitura de mangá')).toHaveAccessibleDescription(
      'Não é usado em tiras de webtoon.',
    );
    expect(screen.getByLabelText('Bordas')).toHaveAccessibleDescription(
      'Sempre brancas em tiras de webtoon.',
    );
    expect(screen.getByLabelText('Conteúdo')).toHaveAccessibleDescription(
      'Cada capítulo é unido em uma tira só e cortado em páginas entre os quadros.',
    );
  });

  it('says what depends on the format, and what only an EPUB or a CBZ has', () => {
    const { rerender } = render(editor({}, 'cbz'));

    expect(screen.getByLabelText('Começar do outro lado')).toHaveAccessibleDescription(
      'Só um EPUB leva estas opções.',
    );
    expect(screen.getByLabelText('Manter o ComicInfo.xml')).toHaveAccessibleDescription(
      'Copia o ComicInfo.xml original para o CBZ convertido.',
    );
    expect(screen.getByLabelText('Idioma do EPUB')).toHaveAccessibleDescription(
      'Guardado neste perfil e aplicado quando o EPUB é escolhido.',
    );

    rerender(editor({}, 'pdf'));
    expect(
      screen.getByLabelText('Recortar a capa frontal de uma imagem larga'),
    ).toHaveAccessibleDescription('Um PDF não tem capa.');
    expect(screen.getByLabelText('Manter o ComicInfo.xml')).toHaveAccessibleDescription(
      'Disponível só para saída em CBZ.',
    );
  });

  it('says the JPEG quality and what it is for, with the default of the device', () => {
    render(editor({ forcePng: true, forceColor: true }));

    expect(screen.getByLabelText('Qualidade do JPEG (opcional)')).toHaveAccessibleDescription(
      'Para as páginas coloridas, que continuam em JPEG. Deixe vazio para o padrão do perfil do dispositivo (85%).',
    );
    expect(screen.getByLabelText('Formato da página')).toHaveAccessibleDescription(
      'Com pontilhado para os cinzas que a tela mostra, salvos sem perdas.',
    );
  });

  it('says a value that is refused, with the name of the option in the language', () => {
    render(editor({ gamma: 18, croppingPower: 50, jpegQuality: 0 }));

    expect(screen.getByLabelText('Gama (opcional)')).toHaveAccessibleDescription(
      'Gama precisa ser um número de 0.1 a 4.',
    );
    expect(screen.getByLabelText('Intensidade do corte')).toHaveAccessibleDescription(
      'Intensidade do corte precisa ser um número de 0 a 10.',
    );
    expect(screen.getByLabelText('Qualidade do JPEG (opcional)')).toHaveAccessibleDescription(
      'Qualidade do JPEG precisa ser um número inteiro de 1 a 100.',
    );
  });

  it('says that cropping has to be on for its numbers, and the single book that locks the steps', () => {
    render(editor({ cropping: 'disabled' }, 'epub', { singleBook: true }));

    expect(screen.getByLabelText('Intensidade do corte')).toHaveAccessibleDescription(
      'Ative o corte das páginas para ajustar isto.',
    );
    expect(screen.getByRole('status', { name: 'Um livro para a série' })).toHaveTextContent(
      'Ativo na fila: a série será gerada como um único livro',
    );
    expect(screen.getByLabelText('Formato do livro')).toBeEnabled();
  });

  it('says it is unavailable when the tools list no device', () => {
    render(
      inPortuguese(
        <MangaprepSettingsEditor
          format="epub"
          onFormat={vi.fn()}
          onNotify={vi.fn()}
          onSettings={vi.fn()}
          profiles={[]}
          settings={defaultMangaprepSettings}
        />,
      ),
    );

    expect(
      within(screen.getByLabelText('Perfil do dispositivo')).getByRole('option'),
    ).toHaveTextContent('Perfis indisponíveis');
  });
});

describe('the notice of a device that is no longer offered, in Portuguese', () => {
  it('says which device was chosen instead', async () => {
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
        loadSettings: () =>
          Promise.resolve({
            ok: true,
            value: {
              preferences: {
                ...defaultPreferences,
                settings: { ...defaultMangaprepSettings, deviceProfile: 'GONE' },
              },
              notices: [message('notice.settingsUnreadable', {})],
            },
          }),
        getDeviceProfiles: () =>
          Promise.resolve({
            ok: true,
            value: profiles,
          }),
      }),
    );
    render(<App />);

    const notices = await screen.findByRole('status', { name: 'Avisos' });
    expect(notices).toHaveTextContent(
      'O perfil de dispositivo GONE não está disponível, então Kindle Paperwhite 6 foi selecionado.',
    );
  });
});
