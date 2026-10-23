import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { app } from 'electron';

import { FsBookFileStore } from '@/adapters/library/fs-book-file-store';
import { MangabindBindingAdapter } from '@/adapters/mangabind/binding-port';
import { MangabindCliAdapter } from '@/adapters/mangabind/cli';
import { MangaprepCliAdapter } from '@/adapters/mangaprep/cli';
import { MangaprepConversionAdapter } from '@/adapters/mangaprep/conversion-port';
import { createNodeProcessRunner } from '@/adapters/process/node-process-runner';
import { verifyBundledToolchain } from '@/adapters/toolchain/verification';
import { ConversionWorkflow } from '@/application/workflows/conversion-workflow';
import { message } from '@/domain/message';
import { defaultParallelChoice } from '@/domain/parallel-conversions';
import type { ToolchainStatus, ToolchainTarget } from '@/shared/toolchain-status';

import type { MainContext } from './context';
import { conversionLimit } from './conversion-limit';
import { machineCapacity } from './machine';

function executablePath(
  toolchainRoot: string,
  target: ToolchainTarget,
  tool: 'mangabind' | 'mangaprep',
): string {
  const extension = target.startsWith('win32-') ? '.exe' : '';
  return path.join(toolchainRoot, target, `${tool}${extension}`);
}

/**
 * Verifies the bundled mangabind/mangaprep binaries and, if they check out, constructs the
 * workflow onto the context so every IPC handler can reach it. Runs once, during app.whenReady().
 */
export async function bootstrapToolchain(
  context: Pick<
    MainContext,
    'workflow' | 'mangaprepCli' | 'coverStore' | 'processing' | 'queueRuns' | 'appSettings'
  >,
): Promise<ToolchainStatus> {
  const toolchainRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'toolchain')
    : path.join(app.getAppPath(), 'vendor', 'toolchain');
  let toolchainStatus: ToolchainStatus;
  try {
    toolchainStatus = await verifyBundledToolchain({
      arch: process.arch,
      platform: process.platform,
      toolchainRoot,
    });
  } catch {
    toolchainStatus = {
      state: 'blocked',
      tools: [],
      message: message('toolchain.manifestUnverified', {}),
    };
  }
  if (toolchainStatus.state === 'ready' && toolchainStatus.target !== undefined) {
    const runner = createNodeProcessRunner();
    const mangabindCli = new MangabindCliAdapter(
      executablePath(toolchainRoot, toolchainStatus.target, 'mangabind'),
      runner,
      toolchainStatus.tools
        .find((tool) => tool.name === 'mangabind')
        ?.capabilities?.includes('progress-json') === true,
    );
    context.mangaprepCli = new MangaprepCliAdapter(
      executablePath(toolchainRoot, toolchainStatus.target, 'mangaprep'),
      runner,
    );
    context.workflow = new ConversionWorkflow(
      // The volumes are built where the app works now, asked each time (ADR 0056).
      new MangabindBindingAdapter(
        mangabindCli,
        undefined,
        context.processing === undefined
          ? undefined
          : async () => (await context.processing!.prepare()).scratch,
      ),
      new MangaprepConversionAdapter(context.mangaprepCli),
      randomUUID,
      new FsBookFileStore(),
      // Asked each time a title starts, from what the queue that runs began with (ADR 0068).
      conversionLimit({
        running: () => context.queueRuns.parallelChoices,
        chosen: () => context.appSettings?.parallelConversions() ?? defaultParallelChoice,
        machine: machineCapacity,
      }),
      context.coverStore,
    );
  }
  return toolchainStatus;
}
