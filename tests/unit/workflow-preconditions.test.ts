import { describe, expect, it, vi } from 'vitest';
import { ConversionWorkflow } from '@/application/workflows/conversion-workflow';
import type { ConversionRequest } from '@/domain/conversion';
import { defaultMangapressSettings } from '@/domain/output-profile';
import { message } from '@/domain/message';

import { dependencies, cbz, openLibrary } from './support/conversion-workflow';

describe('run precondition ordering', () => {
  const request: ConversionRequest = {
    sessionId: 'missing',
    libraryPath: '/output',
    settings: defaultMangapressSettings,
    format: 'epub',
  };

  it.each(['convert', 'plan'] as const)(
    '%s checks settings before a missing session and keeps its own message',
    async (action) => {
      const ports = dependencies();
      const workflow = new ConversionWorkflow(
        ports.binding,
        ports.conversion,
        () => 'session',
        ports.bookFiles,
      );
      await expect(
        workflow[action](
          { ...request, settings: { ...defaultMangapressSettings, jpegQuality: 101 } },
          { onProgress: vi.fn() },
        ),
      ).rejects.toMatchObject({
        code: 'invalid_settings',
        said: message('workflow.reviewSettings', {
          before: action === 'plan' ? 'validating' : 'converting',
        }),
      });
      expect(ports.bind).not.toHaveBeenCalled();
      expect(ports.bindingPlan).not.toHaveBeenCalled();
      expect(ports.convert).not.toHaveBeenCalled();
      expect(ports.conversionPlan).not.toHaveBeenCalled();
    },
  );

  it.each(['convert', 'plan'] as const)(
    '%s requires an available session before checking single-book requirements',
    async (action) => {
      const ports = dependencies();
      const workflow = new ConversionWorkflow(
        ports.binding,
        ports.conversion,
        () => 'session',
        ports.bookFiles,
      );
      await expect(
        workflow[action](
          { ...request, mode: 'bind-only', singleBook: true, format: 'pdf' },
          { onProgress: vi.fn() },
        ),
      ).rejects.toMatchObject({
        code: 'session_not_found',
        said: message('workflow.inputGone', {}),
      });
    },
  );

  it.each(['convert', 'plan'] as const)(
    '%s refuses a library as one input before checking single-book requirements',
    async (action) => {
      const ports = dependencies();
      const { workflow, sessionId } = await openLibrary(ports);
      await expect(
        workflow[action](
          { ...request, sessionId, mode: 'bind-only', singleBook: true, format: 'pdf' },
          { onProgress: vi.fn() },
        ),
      ).rejects.toMatchObject({
        code: 'unsupported_mode',
        said: message('workflow.libraryByTitle', {}),
      });
      expect(ports.bindBatch).not.toHaveBeenCalled();
    },
  );

  it.each(['convert', 'plan'] as const)(
    '%s ignores single-book requirements for a loose CBZ even with a non-EPUB format',
    async (action) => {
      const ports = dependencies();
      const workflow = new ConversionWorkflow(
        ports.binding,
        ports.conversion,
        () => 'session',
        ports.bookFiles,
      );
      const { sessionId } = await workflow.inspect(cbz);
      await workflow[action](
        { ...request, sessionId, mode: 'convert-only', singleBook: true, format: 'pdf' },
        { onProgress: vi.fn() },
      );
      const calledTool = action === 'convert' ? ports.convert : ports.conversionPlan;
      expect(calledTool).toHaveBeenCalledWith(
        expect.objectContaining({ inputPath: cbz.inputPath, format: 'pdf', nestedToc: false }),
        expect.any(Object),
      );
      expect(ports.bind).not.toHaveBeenCalled();
      expect(ports.bindingPlan).not.toHaveBeenCalled();
    },
  );

  it('a library checks settings and then single-book requirements before resolving its session', async () => {
    const ports = dependencies();
    const workflow = new ConversionWorkflow(
      ports.binding,
      ports.conversion,
      () => 'session',
      ports.bookFiles,
    );
    const libraryRequest = {
      ...request,
      mode: 'bind-and-convert',
      singleBook: true,
      format: 'pdf',
    } as const;
    await expect(
      workflow.convertLibrary(
        { ...libraryRequest, settings: { ...defaultMangapressSettings, jpegQuality: 101 } },
        { onProgress: vi.fn() },
      ),
    ).rejects.toMatchObject({
      code: 'invalid_settings',
      said: message('workflow.reviewSettings', { before: 'converting' }),
    });
    await expect(
      workflow.convertLibrary({ ...libraryRequest, mode: 'bind-only' }, { onProgress: vi.fn() }),
    ).rejects.toMatchObject({
      code: 'invalid_settings',
      said: message('workflow.singleBookNeedsBoth', {}),
    });
    expect(ports.bindBatch).not.toHaveBeenCalled();
  });
});
