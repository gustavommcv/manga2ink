import type { Language } from '@/domain/app-settings';

/** The words of the About tab of the app settings (ADR 0054). */
export interface AboutMessages {
  /** What the app is, in a line, under its name. */
  readonly tagline: string;
  /** Said before the number of the version: "Version 0.1.0". */
  readonly version: string;
  readonly learnMore: {
    readonly title: string;
    readonly guide: string;
    readonly repository: string;
    readonly issues: string;
    /** The notes of the release that is running. */
    readonly releaseNotes: string;
  };
  readonly tools: {
    readonly title: string;
    /** Said after the version of a tool that passed the check made at launch. */
    readonly verified: string;
    /** Said after the version of a tool that did not. */
    readonly failed: string;
    /** Said when none of the tools could be checked. */
    readonly blocked: string;
    readonly reading: string;
    /** Said when the main process does not say what the tools are. */
    readonly unknown: string;
  };
  readonly troubleshooting: {
    readonly title: string;
    /** What to do with the diagnostics, and what is in them. */
    readonly text: string;
    readonly copy: string;
    /** Said once the diagnostics are on the clipboard. */
    readonly copied: string;
    readonly openData: string;
  };
  readonly support: {
    readonly title: string;
    readonly text: string;
    readonly button: string;
  };
  readonly credits: {
    readonly title: string;
    /** What the app's icon is, said before the name of whoever drew it. */
    readonly icon: string;
    /** What MangaDex gives, said before its name. */
    readonly online: string;
  };
  readonly license: {
    readonly title: string;
    readonly text: string;
    readonly mit: string;
    readonly notices: string;
  };
  /** Said when the system could not open a page. */
  readonly openFailed: string;
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const aboutMessages: Readonly<Record<Language, AboutMessages>> = {
  en: {
    tagline:
      'Organizes manga chapters into volumes and converts them into books for your e-reader.',
    version: 'Version',
    learnMore: {
      title: 'Learn more',
      guide: 'User guide',
      repository: 'GitHub',
      issues: 'Report a problem',
      releaseNotes: 'Release notes',
    },
    tools: {
      title: 'Conversion tools',
      verified: 'verified',
      failed: 'did not pass the check',
      blocked: 'The bundled tools could not be checked.',
      reading: 'Reading…',
      unknown: 'The tools were not reported.',
    },
    troubleshooting: {
      title: 'Troubleshooting',
      text: 'When you report a problem, include the diagnostics: the versions and the system, with no paths and no names.',
      copy: 'Copy diagnostics',
      copied: 'Copied. Paste it into your report.',
      openData: 'Open the data folder',
    },
    support: {
      title: 'Support',
      text: 'Mangabound is free and has no ads. If it helped you, you can support its development.',
      button: 'Support the project',
    },
    credits: {
      title: 'Credits',
      icon: 'App icon',
      online: 'Volumes and authors found online',
    },
    license: {
      title: 'License',
      text: 'Mangabound is released under the MIT License. mangapress and mangabind bring their own notices with the app.',
      mit: 'MIT License',
      notices: 'Third-party notices',
    },
    openFailed: 'That page could not be opened. Try again.',
  },
  'pt-BR': {
    tagline: 'Organiza capítulos de mangá em volumes e os converte em livros para o seu e-reader.',
    version: 'Versão',
    learnMore: {
      title: 'Saiba mais',
      guide: 'Guia do usuário',
      repository: 'GitHub',
      issues: 'Relatar um problema',
      releaseNotes: 'Notas da versão',
    },
    tools: {
      title: 'Ferramentas de conversão',
      verified: 'verificada',
      failed: 'não passou na verificação',
      blocked: 'Não foi possível verificar as ferramentas incluídas.',
      reading: 'Lendo…',
      unknown: 'As ferramentas não foram informadas.',
    },
    troubleshooting: {
      title: 'Solução de problemas',
      text: 'Ao relatar um problema, inclua o diagnóstico: as versões e o sistema, sem caminhos nem nomes.',
      copy: 'Copiar diagnóstico',
      copied: 'Copiado. Cole no seu relato.',
      openData: 'Abrir a pasta de dados',
    },
    support: {
      title: 'Apoio',
      text: 'O Mangabound é gratuito e não tem anúncios. Se ele te ajudou, você pode apoiar o desenvolvimento.',
      button: 'Apoiar o projeto',
    },
    credits: {
      title: 'Créditos',
      icon: 'Ícone do app',
      online: 'Volumes e autores buscados online',
    },
    license: {
      title: 'Licença',
      text: 'O Mangabound é distribuído sob a Licença MIT. mangapress e mangabind levam seus próprios avisos junto com o app.',
      mit: 'Licença MIT',
      notices: 'Avisos de terceiros',
    },
    openFailed: 'Não foi possível abrir essa página. Tente de novo.',
  },
};
