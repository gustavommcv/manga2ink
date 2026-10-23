import { z } from 'zod';

import { CliProtocolError } from '@/adapters/cli-protocol-error';

const protocolVersion = 1 as const;

const baseEventSchema = z
  .object({
    protocol_version: z.literal(protocolVersion),
    tool: z.literal('mangaprep'),
    tool_version: z.string().min(1),
    sequence: z.number().int().positive(),
    type: z.string().min(1),
  })
  .passthrough();

const issueContextSchema = {
  manga: z.string().optional(),
  volume: z.union([z.string(), z.number()]).optional(),
  chapter: z.union([z.string(), z.number()]).optional(),
  page: z.number().int().positive().optional(),
  path: z.string().optional(),
} as const;

const knownEventSchemas = {
  protocol: baseEventSchema.extend({ capabilities: z.array(z.string()) }),
  profile: baseEventSchema.extend({
    code: z.string().min(1),
    name: z.string().min(1),
    width: z.number().int().nonnegative(),
    height: z.number().int().nonnegative(),
    gray_levels: z.number().int().positive(),
    family: z.string().min(1),
  }),
  stage: baseEventSchema.extend({
    stage: z.string().min(1),
    state: z.enum(['started', 'completed']),
  }),
  chapter: baseEventSchema.extend({
    stage: z.literal('process'),
    state: z.enum(['started', 'completed']),
    chapter: z.string(),
    chapter_index: z.number().int().positive(),
    chapter_count: z.number().int().positive(),
  }),
  page: baseEventSchema.extend({
    stage: z.literal('process'),
    state: z.literal('completed'),
    chapter: z.string(),
    chapter_index: z.number().int().positive(),
    page: z.number().int().positive(),
    completed: z.number().int().positive(),
    total: z.number().int().positive(),
  }),
  warning: baseEventSchema.extend({
    severity: z.literal('warning'),
    code: z.string().min(1),
    stage: z.string().min(1),
    recoverable: z.boolean(),
    message: z.string().min(1),
    ...issueContextSchema,
  }),
  error: baseEventSchema.extend({
    severity: z.literal('error'),
    code: z.string().min(1),
    stage: z.string().min(1),
    recoverable: z.boolean(),
    message: z.string().min(1),
    diagnostic: z.string(),
    ...issueContextSchema,
  }),
  result: baseEventSchema.extend({
    status: z.literal('completed'),
    operation: z.enum(['convert', 'list_profiles']),
    dry_run: z.boolean().optional(),
    manga: z.string().optional(),
    author: z.string().optional(),
    format: z.enum(['epub', 'cbz', 'pdf']).optional(),
    profile: z.string().optional(),
    width: z.number().int().nonnegative().optional(),
    height: z.number().int().nonnegative().optional(),
    chapters: z.number().int().nonnegative().optional(),
    source_pages: z.number().int().nonnegative().optional(),
    output_pages: z.number().int().nonnegative().optional(),
    output_path: z.string().optional(),
    bytes: z.number().int().nonnegative().optional(),
    written: z.boolean().optional(),
  }),
} as const;

export type MangaprepEvent = z.infer<typeof baseEventSchema>;
export type MangaprepErrorEvent = z.infer<(typeof knownEventSchemas)['error']>;
export type MangaprepPageEvent = z.infer<(typeof knownEventSchemas)['page']>;
export type MangaprepProfileEvent = z.infer<(typeof knownEventSchemas)['profile']>;
export type MangaprepResultEvent = z.infer<(typeof knownEventSchemas)['result']>;
export type MangaprepWarningEvent = z.infer<(typeof knownEventSchemas)['warning']>;

export function isMangaprepErrorEvent(event: MangaprepEvent): event is MangaprepErrorEvent {
  return knownEventSchemas.error.safeParse(event).success;
}

export function isMangaprepWarningEvent(event: MangaprepEvent): event is MangaprepWarningEvent {
  return knownEventSchemas.warning.safeParse(event).success;
}

export function isMangaprepPageEvent(event: MangaprepEvent): event is MangaprepPageEvent {
  return knownEventSchemas.page.safeParse(event).success;
}

export function isMangaprepProfileEvent(event: MangaprepEvent): event is MangaprepProfileEvent {
  return knownEventSchemas.profile.safeParse(event).success;
}

export function isMangaprepResultEvent(event: MangaprepEvent): event is MangaprepResultEvent {
  return knownEventSchemas.result.safeParse(event).success;
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new CliProtocolError(
      'malformed_json',
      'mangaprep returned a malformed JSON event.',
      error,
    );
  }
}

export function parseMangaprepEventLine(line: string): MangaprepEvent {
  if (line.trim() === '') {
    throw new CliProtocolError('invalid_payload', 'mangaprep returned an empty event line.');
  }

  const payload = parseJson(line);
  const version = z
    .object({ protocol_version: z.number().optional() })
    .passthrough()
    .safeParse(payload);
  if (
    version.success &&
    version.data.protocol_version !== undefined &&
    version.data.protocol_version !== protocolVersion
  ) {
    throw new CliProtocolError(
      'unsupported_protocol',
      `mangaprep protocol ${String(version.data.protocol_version)} is not supported.`,
    );
  }

  const baseResult = baseEventSchema.safeParse(payload);
  if (!baseResult.success) {
    throw new CliProtocolError(
      'invalid_payload',
      'mangaprep returned an event that does not match protocol version 1.',
      baseResult.error,
    );
  }

  // An own property only: a type such as "constructor" would otherwise find a method of every object.
  const schema = Object.hasOwn(knownEventSchemas, baseResult.data.type)
    ? knownEventSchemas[baseResult.data.type as keyof typeof knownEventSchemas]
    : undefined;
  if (schema === undefined) {
    return baseResult.data;
  }

  const knownResult = schema.safeParse(payload);
  if (!knownResult.success) {
    throw new CliProtocolError(
      'invalid_payload',
      `mangaprep returned an invalid ${baseResult.data.type} event.`,
      knownResult.error,
    );
  }
  return knownResult.data;
}

export class MangaprepEventDecoder {
  private buffer = '';
  private expectedSequence = 1;

  push(chunk: string): MangaprepEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop()!;
    return lines.map((line) => this.parseSequenced(line.replace(/\r$/, '')));
  }

  finish(): MangaprepEvent[] {
    if (this.buffer === '') {
      return [];
    }

    const finalLine = this.buffer.replace(/\r$/, '');
    this.buffer = '';
    try {
      return [this.parseSequenced(finalLine)];
    } catch (error) {
      if (error instanceof CliProtocolError && error.code === 'malformed_json') {
        throw new CliProtocolError(
          'incomplete_line',
          'mangaprep ended with an incomplete JSON event.',
          error,
        );
      }
      throw error;
    }
  }

  private parseSequenced(line: string): MangaprepEvent {
    const event = parseMangaprepEventLine(line);
    if (event.sequence !== this.expectedSequence) {
      throw new CliProtocolError(
        'sequence_gap',
        `Expected mangaprep event ${this.expectedSequence}, received ${event.sequence}.`,
      );
    }
    this.expectedSequence++;
    return event;
  }
}

export function parseMangaprepEventStream(input: string): MangaprepEvent[] {
  if (input.trim() === '') {
    throw new CliProtocolError('empty_stream', 'mangaprep returned no machine-readable events.');
  }

  const decoder = new MangaprepEventDecoder();
  return [...decoder.push(input), ...decoder.finish()];
}
