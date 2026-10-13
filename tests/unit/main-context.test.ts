import { describe, expect, it } from 'vitest';

import { createMetadataProviders } from '@/adapters/metadata-providers/registry';
import { LibraryPublisher } from '@/application/workflows/library-publisher';
import { defaultPreferences } from '@/domain/preferences';
import { createMainContext, requireWorkflow } from '@/main/context';

describe('the context the handlers of the main process share', () => {
  it('starts with nothing selected, nothing running and nothing shared', () => {
    const context = createMainContext();

    for (const held of [
      context.selectedInputs,
      context.selectedLibraries,
      context.artifactPaths,
      context.pendingArtifacts,
      context.activeJobs,
    ]) {
      expect(held.size).toBe(0);
    }
    expect(context.activeSharing).toBeUndefined();
    expect(context.activeSharingTarget).toBeUndefined();
    expect(context.lastPickerFolder).toBeUndefined();
    expect(context.lastSaveFolder).toBeUndefined();
    expect(context.preferredNetworkInterface).toBeUndefined();
    expect(context.currentPreferences).toBe(defaultPreferences);
  });

  it('is waiting for what start-up builds: the workflow, the preferences, the stores of the pending books and covers', () => {
    const context = createMainContext();

    expect(context.workflow).toBeUndefined();
    expect(context.mangapressCli).toBeUndefined();
    expect(context.preferences).toBeUndefined();
    expect(context.pendingRuns).toBeUndefined();
    expect(context.coverStore).toBeUndefined();
  });

  it('knows every metadata provider by its id', () => {
    const context = createMainContext();

    const expected = createMetadataProviders().map((provider) => provider.descriptor.id);
    expect(expected.length).toBeGreaterThan(0);
    expect([...context.metadataProviders.keys()].sort()).toEqual([...expected].sort());
    for (const [id, provider] of context.metadataProviders) {
      expect(provider.descriptor.id).toBe(id);
    }
  });

  it('publishes through the library store it hands the share’s catalog as well', () => {
    const context = createMainContext();

    expect(context.libraryPublisher).toBeInstanceOf(LibraryPublisher);
    expect(context.pendingCatalog).toBeDefined();
    expect(context.opdsServer).toBeDefined();
    expect(context.networkInterfaces).toBeDefined();
    expect(context.pendingRunActivity).toBeDefined();
  });

  it('is a new one each time, with no state shared with another', () => {
    const first = createMainContext();
    const second = createMainContext();

    first.selectedInputs.set('selection', { kind: 'folder', path: '/manga' } as never);
    first.activeJobs.set('job', new AbortController());

    expect(second.selectedInputs.size).toBe(0);
    expect(second.activeJobs.size).toBe(0);
    expect(second.libraryStore).not.toBe(first.libraryStore);
    expect(second.pendingRunActivity).not.toBe(first.pendingRunActivity);
  });
});

describe('asking for the workflow', () => {
  it('says the tools are not ready when start-up could not build it', () => {
    expect(() => requireWorkflow({ workflow: undefined })).toThrow(
      'The bundled conversion tools are not ready.',
    );
  });

  it('gives the workflow that start-up built', () => {
    const workflow = { built: true } as never;

    expect(requireWorkflow({ workflow })).toBe(workflow);
  });
});
