import { buildMangaprepArguments, type MangaprepRunArguments } from './arguments';
import {
  isMangaprepErrorEvent,
  isMangaprepProfileEvent,
  isMangaprepResultEvent,
  isMangaprepWarningEvent,
  type MangaprepErrorEvent,
  type MangaprepEvent,
  MangaprepEventDecoder,
  type MangaprepProfileEvent,
  type MangaprepResultEvent,
  type MangaprepWarningEvent,
} from './protocol';

import { CliProtocolError } from '@/adapters/cli-protocol-error';
import type { ProcessRunner } from '@/application/ports/process-runner';

export interface MangaprepRunResult {
  readonly events: readonly MangaprepEvent[];
  readonly errors: readonly MangaprepErrorEvent[];
  /** What the tool noticed and went on from; a run that succeeds can still have some. */
  readonly warnings: readonly MangaprepWarningEvent[];
  readonly result?: MangaprepResultEvent;
  readonly exitCode: number | null;
  readonly stderr: string;
}

export interface MangaprepProfileList {
  readonly profiles: readonly MangaprepProfileEvent[];
  readonly result: MangaprepResultEvent;
}

export class MangaprepCliAdapter {
  constructor(
    private readonly executablePath: string,
    private readonly processRunner: ProcessRunner,
  ) {}

  async run(
    request: MangaprepRunArguments,
    {
      onEvent,
      signal,
    }: {
      readonly onEvent?: (event: MangaprepEvent) => void;
      readonly signal?: AbortSignal;
    } = {},
  ): Promise<MangaprepRunResult> {
    return this.runEvents(buildMangaprepArguments(request), { onEvent, signal });
  }

  async listProfiles(signal?: AbortSignal): Promise<MangaprepProfileList> {
    const run = await this.runEvents(['--list-profiles', '--json-events'], { signal });
    if (run.exitCode !== 0 || run.result!.operation !== 'list_profiles') {
      throw new CliProtocolError(
        'invalid_payload',
        'mangaprep could not return its device profiles.',
      );
    }
    return {
      profiles: run.events.filter(isMangaprepProfileEvent),
      result: run.result!,
    };
  }

  private async runEvents(
    arguments_: readonly string[],
    {
      onEvent,
      signal,
    }: {
      readonly onEvent?: (event: MangaprepEvent) => void;
      readonly signal?: AbortSignal;
    },
  ): Promise<MangaprepRunResult> {
    const decoder = new MangaprepEventDecoder();
    const events: MangaprepEvent[] = [];
    const emit = (decoded: readonly MangaprepEvent[]): void => {
      for (const event of decoded) {
        events.push(event);
        onEvent?.(event);
      }
    };
    const processResult = await this.processRunner.run(
      {
        executablePath: this.executablePath,
        arguments: arguments_,
      },
      {
        ...(signal === undefined ? {} : { signal }),
        onChunk: (chunk) => {
          if (chunk.stream === 'stdout') emit(decoder.push(chunk.text));
        },
      },
    );
    emit(decoder.finish());

    if (events.length === 0) {
      throw new CliProtocolError('empty_stream', 'mangaprep returned no machine-readable events.');
    }
    const resultEvent = events.at(-1);
    const result =
      resultEvent !== undefined && isMangaprepResultEvent(resultEvent) ? resultEvent : undefined;
    if (processResult.exitCode === 0 && result === undefined) {
      throw new CliProtocolError(
        'invalid_payload',
        'mangaprep completed without a final result event.',
      );
    }

    return {
      events,
      errors: events.filter(isMangaprepErrorEvent),
      warnings: events.filter(isMangaprepWarningEvent),
      ...(result === undefined ? {} : { result }),
      exitCode: processResult.exitCode,
      stderr: processResult.stderr,
    };
  }
}
