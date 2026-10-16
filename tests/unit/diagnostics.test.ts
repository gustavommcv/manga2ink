import { describe, expect, it } from 'vitest';

import { type DiagnosticsInput, diagnosticsText } from '@/main/diagnostics';
import type { ToolchainStatus } from '@/shared/toolchain-status';
import { message, raw } from '@/domain/message';

const tools: ToolchainStatus = {
  state: 'ready',
  target: 'linux-x64',
  message: message('toolchain.ready', {}),
  tools: [
    { name: 'mangabind', releaseTag: 'v0.7.2', state: 'ready', message: raw('Ready.') },
    { name: 'mangapress', releaseTag: 'v0.8.0', state: 'ready', message: raw('Ready.') },
  ],
};

const input: DiagnosticsInput = {
  version: '0.1.0-alpha.15',
  packaged: true,
  electron: '44.3.0',
  chrome: '152.0.7977.130',
  node: '24.11.0',
  platform: 'linux',
  arch: 'x64',
  system: '6.17.5-arch1-1',
  processors: 8,
  memoryBytes: 15.5 * 1024 ** 3,
  language: 'pt-BR',
  workingFolderChosen: false,
  tools,
};

describe('the diagnostics a person copies for a report', () => {
  it('say what is running, on what, and how the tools were checked, one thing to a line', () => {
    expect(diagnosticsText(input)).toBe(
      [
        'Mangabound 0.1.0-alpha.15 (packaged)',
        'Electron 44.3.0, Chrome 152.0.7977.130, Node 24.11.0',
        'System: linux x64, 6.17.5-arch1-1',
        'Machine: 8 processors, 15.5 GiB of memory',
        'Language of the window: pt-BR',
        'Working folder: the default',
        'Conversion tools: ready',
        '  mangabind v0.7.2: verified',
        '  mangapress v0.8.0: verified',
        '',
      ].join('\n'),
    );
  });

  it('say a development build for what is not packaged', () => {
    expect(diagnosticsText({ ...input, packaged: false })).toContain(
      'Mangabound 0.1.0-alpha.15 (development build)',
    );
  });

  it('say that a folder was chosen, and never which', () => {
    const text = diagnosticsText({ ...input, workingFolderChosen: true });

    expect(text).toContain('Working folder: chosen by the person');
    expect(text).not.toMatch(/\/(mnt|home|Users)|[A-Z]:\\/u);
  });

  it('write a tag with and without its v the same way', () => {
    const text = diagnosticsText({
      ...input,
      tools: {
        ...tools,
        tools: [{ name: 'mangabind', releaseTag: '0.7.2', state: 'ready', message: raw('Ready.') }],
      },
    });

    expect(text).toContain('  mangabind v0.7.2: verified');
    expect(text).not.toContain('vv0');
  });

  it('say that a tool failed the check, without what the check said about it', () => {
    const text = diagnosticsText({
      ...input,
      tools: {
        state: 'blocked',
        message: raw('No.'),
        tools: [
          {
            name: 'mangapress',
            releaseTag: 'v0.8.0',
            state: 'failed',
            message: raw('The hash of /opt/mangabound/toolchain/mangapress is wrong.'),
          },
        ],
      },
    });

    expect(text).toContain('Conversion tools: blocked');
    expect(text).toContain('  mangapress v0.8.0: failed the check');
    expect(text).not.toContain('/opt');
  });

  it('say the tools were not reported when the main process has nothing about them', () => {
    expect(diagnosticsText({ ...input, tools: undefined })).toContain(
      'Conversion tools: not reported',
    );
  });

  it('count memory in gibibytes with one decimal', () => {
    expect(diagnosticsText({ ...input, memoryBytes: 8 * 1024 ** 3 })).toContain('8.0 GiB');
    expect(diagnosticsText({ ...input, memoryBytes: 1536 * 1024 ** 2 })).toContain('1.5 GiB');
  });
});
