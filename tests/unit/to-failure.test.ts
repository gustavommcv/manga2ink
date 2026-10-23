import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { z } from 'zod';

import { CliProtocolError } from '@/adapters/cli-protocol-error';
import { ProcessingFolderError } from '@/adapters/library/processing-folders';
import { MetadataProviderError } from '@/adapters/metadata-providers/errors';
import { ProcessCancelledError } from '@/application/ports/process-runner';
import { SettingsSaveError } from '@/application/ports/settings-store';
import { ConversionWorkflowError, ToolExecutionError } from '@/domain/conversion';
import { message, raw } from '@/domain/message';
import { LibraryIndexError } from '@/library/manifest';
import { opdsPort } from '@/main/constants';
import { toFailure } from '@/main/ipc/result';
import { sharingFailure } from '@/main/ipc/sharing-failure';

import { english } from './support/say';

const systemError = (code: string): Error =>
  Object.assign(new Error(`${code}: the system said no`), { code });

let logged: MockInstance<typeof console.error>;

beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

describe('toFailure', () => {
  it('says what the tool said, as it said it, with its issue, and logs nothing', () => {
    const issue = {
      tool: 'mangaprep',
      severity: 'error',
      code: 'conversion_failed',
      stage: 'convert',
      recoverable: false,
      message: 'mangaprep could not read the page.',
      diagnostic: 'page 3 is not an image',
    } as const;

    expect(toFailure(new ToolExecutionError(issue, 2))).toEqual({
      code: 'conversion_failed',
      said: raw('mangaprep could not read the page.'),
      issue,
    });
    expect(logged).not.toHaveBeenCalled();
  });

  it('says what the app says of a tool failure when the tool’s own words are not what to tell', () => {
    const issue = {
      tool: 'mangaprep',
      severity: 'error',
      code: 'cover_read_failed',
      stage: 'convert',
      recoverable: false,
      message: 'The cover chosen for Work could not be used.',
    } as const;
    const said = message('failure.coverUnusable', { book: 'Work' });

    expect(toFailure(new ToolExecutionError(issue, 2, { said }))).toEqual({
      code: 'cover_read_failed',
      said,
      issue,
    });
  });

  it('reports a cancellation as one, however it was raised, and logs nothing', () => {
    const aborted = Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });

    expect(toFailure(new ProcessCancelledError())).toEqual({
      code: 'cancelled',
      said: message('failure.conversionCancelled', {}),
    });
    expect(toFailure(aborted)).toEqual({
      code: 'cancelled',
      said: message('failure.cancelled', {}),
    });
    expect(logged).not.toHaveBeenCalled();
  });

  it('keeps what a workflow error says, and logs it only when it carries a cause', () => {
    const noVolumes = message('workflow.noVolumes', {});

    expect(toFailure(new ConversionWorkflowError('no_volumes', noVolumes))).toEqual({
      code: 'no_volumes',
      said: noVolumes,
    });
    expect(logged).not.toHaveBeenCalled();

    const publishFailed = message('workflow.publishFailed', {});
    const withCause = new ConversionWorkflowError('publish_failed', publishFailed, {
      cause: systemError('ENOSPC'),
    });

    expect(toFailure(withCause)).toEqual({ code: 'publish_failed', said: publishFailed });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('publish_failed'), withCause);
  });

  it('keeps what a provider error says, and logs it only when it carries a cause', () => {
    const timeout = message('provider.timeout', { service: 'MangaDex' });

    expect(toFailure(new MetadataProviderError('timeout', timeout, true))).toEqual({
      code: 'timeout',
      said: timeout,
    });
    expect(logged).not.toHaveBeenCalled();

    const unreachable = message('provider.unreachable', { service: 'MangaDex' });
    const withCause = new MetadataProviderError('network_error', unreachable, true, {
      cause: new TypeError('fetch failed'),
    });

    expect(toFailure(withCause)).toEqual({ code: 'network_error', said: unreachable });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('network_error'), withCause);
  });

  it.each([
    {
      name: 'an unreadable catalog',
      error: new LibraryIndexError('invalid_manifest', 'The catalog names a path outside.'),
      failure: {
        code: 'invalid_manifest',
        said: message('failure.catalogUnreadable', {}),
      },
      english: 'The output library catalog could not be read.',
    },
    {
      name: 'a folder the app works in that is not there',
      error: new ProcessingFolderError('unavailable', '/mnt/books'),
      failure: {
        code: 'processing_folder_unavailable',
        said: message('failure.processingFolderUnavailable', { folder: '/mnt/books' }),
      },
      english:
        'The processing folder /mnt/books is not available. Connect its drive again, or choose another folder in the app settings.',
    },
    {
      name: 'a folder that cannot be worked in',
      error: new ProcessingFolderError('unusable', '/mnt/books'),
      failure: {
        code: 'processing_folder_unusable',
        said: message('failure.processingFolderUnusable', { folder: '/mnt/books' }),
      },
      english: 'Manga2Ink cannot work in /mnt/books. Choose a folder it can write in.',
    },
    {
      name: 'settings that could not be saved',
      error: new SettingsSaveError({ cause: systemError('EBUSY') }),
      failure: { code: 'settings_save_failed', said: message('failure.settingsNotSaved', {}) },
      english: 'Your settings could not be saved.',
    },
    {
      name: 'data a tool should not have sent',
      error: new CliProtocolError('invalid_payload', 'Expected a number at volumes[2].'),
      failure: { code: 'invalid_payload', said: message('failure.toolIncompatible', {}) },
      english:
        'A bundled conversion tool returned incompatible data. Reinstall Manga2Ink or open Diagnostics.',
    },
    {
      name: 'a request the page should not have sent',
      error: z.object({ jobId: z.string() }).safeParse({}).error!,
      failure: { code: 'invalid_request', said: message('failure.invalidRequest', {}) },
      english: 'Manga2Ink rejected an invalid workflow request.',
    },
  ])(
    'tells the person something short about $name and logs the real error',
    ({ error, failure, english: sentence }) => {
      expect(toFailure(error)).toEqual(failure);
      expect(english(failure.said)).toBe(sentence);
      expect(logged).toHaveBeenCalledOnce();
      expect(logged).toHaveBeenCalledWith(expect.stringContaining(failure.code), error);
    },
  );

  it.each(['EACCES', 'EPERM', 'EROFS'])(
    'says a file or folder could not be used for %s, not that the network failed',
    (code) => {
      const error = systemError(code);

      const failure = toFailure(error);

      expect(failure.code).toBe('file_access_denied');
      expect(failure.said).toEqual(message('failure.fileAccessDenied', {}));
      expect(english(failure.said)).toContain('permissions');
      expect(english(failure.said)).not.toMatch(/sharing|network/iu);
      expect(logged).toHaveBeenCalledWith(expect.stringContaining('file_access_denied'), error);
    },
  );

  it('says the drive is full for ENOSPC', () => {
    const error = systemError('ENOSPC');

    expect(toFailure(error)).toEqual({
      code: 'disk_full',
      said: message('failure.diskFull', {}),
    });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('disk_full'), error);
  });

  it('does not treat the errors of a listening socket as anything it knows', () => {
    expect(toFailure(systemError('EADDRINUSE')).code).toBe('internal_error');
    expect(toFailure(systemError('EADDRNOTAVAIL')).code).toBe('internal_error');
  });

  it('logs an error nobody expected, with its stack, and tells the person only that it failed', () => {
    const bug = new TypeError("Cannot read properties of undefined (reading 'path')");

    expect(toFailure(bug)).toEqual({
      code: 'internal_error',
      said: message('failure.internal', {}),
    });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('internal_error'), bug);
  });

  it('handles something that is not an Error at all', () => {
    expect(toFailure('boom')).toEqual({
      code: 'internal_error',
      said: message('failure.internal', {}),
    });
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('internal_error'), 'boom');
  });
});

describe('sharingFailure', () => {
  it('names the port when it is already in use', () => {
    const failure = sharingFailure(systemError('EADDRINUSE'));

    expect(failure?.code).toBe('sharing_failed');
    expect(failure?.said).toEqual(message('failure.sharingPortInUse', { port: opdsPort }));
  });

  it.each(['EADDRNOTAVAIL', 'EACCES'])('says the address was not usable for %s', (code) => {
    expect(sharingFailure(systemError(code))).toEqual({
      code: 'sharing_failed',
      said: message('failure.sharingAddressRefused', {}),
    });
  });

  it.each([
    ['another system error', systemError('ENOENT')],
    ['an error with no code', new Error('boom')],
    ['something that is not an error', 'EADDRINUSE'],
  ])('leaves %s to the general mapping', (_name, error) => {
    expect(sharingFailure(error)).toBeUndefined();
  });
});
