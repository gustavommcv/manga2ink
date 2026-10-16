import type { Language } from '@/domain/app-settings';
import type { ToolchainStatus } from '@/shared/toolchain-status';

/** What the app knows about itself and the machine it runs on, and nothing about the person. */
export interface DiagnosticsInput {
  readonly version: string;
  readonly packaged: boolean;
  readonly electron: string;
  readonly chrome: string;
  readonly node: string;
  readonly platform: string;
  readonly arch: string;
  /** The version of the operating system, as the system itself gives it. */
  readonly system: string;
  readonly processors: number;
  readonly memoryBytes: number;
  /** The language the window is in. */
  readonly language: Language;
  /** Whether a person chose the folder the app works in; which one is theirs to say. */
  readonly workingFolderChosen: boolean;
  readonly tools: ToolchainStatus | undefined;
}

/** A size in gibibytes, with one decimal, as an English-speaking maintainer reads it. */
function gibibytes(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
}

/**
 * The text a person copies to put in a report of a problem (ADR 0057). It is always English, since
 * it is read by whoever answers, and it holds versions, the system and the state of the tools: no
 * path, no name of a book or a folder, and nothing from the log. What the person chose is said as
 * a yes or a no.
 */
export function diagnosticsText(input: DiagnosticsInput): string {
  const lines = [
    `Mangabound ${input.version} (${input.packaged ? 'packaged' : 'development build'})`,
    `Electron ${input.electron}, Chrome ${input.chrome}, Node ${input.node}`,
    `System: ${input.platform} ${input.arch}, ${input.system}`,
    `Machine: ${String(input.processors)} processors, ${gibibytes(input.memoryBytes)} of memory`,
    `Language of the window: ${input.language}`,
    `Working folder: ${input.workingFolderChosen ? 'chosen by the person' : 'the default'}`,
  ];
  if (input.tools === undefined) {
    lines.push('Conversion tools: not reported');
  } else {
    lines.push(`Conversion tools: ${input.tools.state}`);
    for (const tool of input.tools.tools) {
      lines.push(
        `  ${tool.name} ${tool.releaseTag.startsWith('v') ? '' : 'v'}${tool.releaseTag}: ${tool.state === 'ready' ? 'verified' : 'failed the check'}`,
      );
    }
  }
  return `${lines.join('\n')}\n`;
}
