import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { CliProtocolError } from '@/adapters/cli-protocol-error';
import {
  MangabindProgressDecoder,
  parseMangabindProgressLine,
  parseMangabindProtocolInfo,
  parseMangabindReport,
} from '@/adapters/mangabind/protocol';

const fixture = JSON.parse(
  readFileSync(
    path.join(import.meta.dirname, '..', 'fixtures', 'protocol', 'mangabind-v1-plan.json'),
    'utf8',
  ),
) as Record<string, unknown>;

/** A copy of the report with the value at a dotted path removed, or replaced when one is given. */
function changed(pathToValue: string, replacement?: { readonly value: unknown }): string {
  const copy = structuredClone(fixture);
  const keys = pathToValue.split('.');
  const last = keys.pop()!;
  let node: unknown = copy;
  for (const key of keys) node = (node as Record<string, unknown>)[key];
  if (replacement === undefined) Reflect.deleteProperty(node as object, last);
  else (node as Record<string, unknown>)[last] = replacement.value;
  return JSON.stringify(copy);
}
const refused = (text: string): unknown => {
  try {
    parseMangabindReport(text);
  } catch (error) {
    return error;
  }
  return undefined;
};

describe('a report of mangabind that is missing something it must say', () => {
  const required = [
    'protocol_version',
    'tool',
    'tool_version',
    'kind',
    'mode',
    'status',
    'batch',
    'manga',
    'issues',
    'summary',
    'summary.manga',
    'summary.volumes',
    'summary.pages',
    'summary.errors',
    'summary.warnings',
    'manga.0.name',
    'manga.0.input_path',
    'manga.0.status',
    'manga.0.units',
    'manga.0.volumes',
    'manga.0.issues',
    'manga.0.summary',
    'manga.0.summary.units',
    'manga.0.summary.volumes',
    'manga.0.summary.pages',
    'manga.0.summary.warnings',
    'manga.0.summary.errors',
    'manga.0.units.0.name',
    'manga.0.units.0.path',
    'manga.0.units.0.kind',
    'manga.0.units.0.page_count',
    'manga.0.units.0.parser',
    'manga.0.units.0.parser.matched',
    'manga.0.units.0.metadata_assignment',
    'manga.0.units.0.metadata_assignment.status',
    'manga.0.units.0.disposition',
    'manga.0.volumes.0.number',
    'manga.0.volumes.0.output_path',
    'manga.0.volumes.0.page_count',
    'manga.0.volumes.0.chapters',
    'manga.0.volumes.0.written',
    'manga.0.issues.0.tool',
    'manga.0.issues.0.severity',
    'manga.0.issues.0.code',
    'manga.0.issues.0.stage',
    'manga.0.issues.0.recoverable',
    'manga.0.issues.0.message',
  ];

  it.each(required)('is not accepted without %s', (field) => {
    expect(refused(changed(field))).toMatchObject({ code: 'invalid_payload' });
    expect(refused(changed(field))).toBeInstanceOf(CliProtocolError);
  });

  it.each([
    ['mode', 'dream'],
    ['status', 'mostly'],
    ['manga.0.status', 'done'],
    ['manga.0.units.0.kind', 'archive'],
    ['manga.0.units.0.disposition', 'lost'],
    ['manga.0.units.0.metadata_assignment.status', 'maybe'],
    ['manga.0.units.0.page_count', -1],
    ['manga.0.volumes.0.page_count', 1.5],
    ['manga.0.summary.units', -2],
    ['summary.pages', -1],
    ['manga.0.issues.0.severity', 'fatal'],
    ['manga.0.issues.0.code', ''],
    ['manga.0.issues.0.message', ''],
    ['tool', 'mangapress'],
    ['tool_version', ''],
  ])('is not accepted with %s as %j', (field, value) => {
    expect(refused(changed(field, { value }))).toMatchObject({ code: 'invalid_payload' });
  });

  it('is accepted without what it may leave out, and keeps what a later version adds', () => {
    for (const optional of [
      'input_path',
      'output_path',
      'manga.0.metadata_file',
      'manga.0.units.0.effective_volume',
      'manga.0.issues.0.manga',
    ]) {
      expect(() => parseMangabindReport(changed(optional))).not.toThrow();
    }
    const future = parseMangabindReport(changed('later_field', { value: { kept: true } }));
    expect((future as Record<string, unknown>)['later_field']).toEqual({ kept: true });
  });
});

describe('what mangabind says about itself and about its progress', () => {
  const info = {
    protocol_version: 1,
    tool: 'mangabind',
    tool_version: '0.7.1',
    capabilities: ['report', 'progress-json'],
  };
  const inspecting = {
    protocol_version: 1,
    tool: 'mangabind',
    tool_version: '0.7.1',
    kind: 'progress',
    stage: 'inspect',
    state: 'started',
    manga: 'Work',
  };
  const writing = {
    ...inspecting,
    stage: 'write',
    state: 'advanced',
    volume_index: 1,
    volume_count: 2,
    volume_number: 1,
    completed_pages: 3,
    total_pages: 9,
  };
  const without = (source: Record<string, unknown>, key: string): string => {
    const copy = { ...source };
    Reflect.deleteProperty(copy, key);
    return JSON.stringify(copy);
  };

  it.each(['protocol_version', 'tool', 'tool_version', 'capabilities'])(
    'is not a handshake without %s',
    (field) => {
      expect(() => parseMangabindProtocolInfo(without(info, field))).toThrow(CliProtocolError);
    },
  );

  it('is a handshake with what it can do, and with what it adds later', () => {
    const parsed = parseMangabindProtocolInfo(JSON.stringify({ ...info, extra: 1 }));

    expect(parsed.capabilities).toEqual(['report', 'progress-json']);
    expect(parsed).toHaveProperty('extra', 1);
  });

  it.each(['protocol_version', 'tool', 'tool_version', 'kind', 'stage', 'state', 'manga'])(
    'is not progress without %s',
    (field) => {
      expect(() => parseMangabindProgressLine(without(inspecting, field))).toThrow(
        CliProtocolError,
      );
    },
  );

  it.each(['volume_index', 'volume_count', 'volume_number', 'completed_pages', 'total_pages'])(
    'is not progress of writing without %s, which inspecting does not need',
    (field) => {
      expect(() => parseMangabindProgressLine(without(writing, field))).toThrow(CliProtocolError);
      expect(() => parseMangabindProgressLine(JSON.stringify(inspecting))).not.toThrow();
    },
  );

  it.each([
    ['inspect', 'advanced'],
    ['write', 'unknown'],
    ['pack', 'started'],
  ])('is not progress for a %s that is %s', (stage, state) => {
    expect(() => parseMangabindProgressLine(JSON.stringify({ ...writing, stage, state }))).toThrow(
      CliProtocolError,
    );
  });

  it.each([
    ['volume_index', 0],
    ['volume_count', 0],
    ['total_pages', 0],
    ['completed_pages', -1],
    ['manga', ''],
  ])('is not progress with %s as %j', (field, value) => {
    expect(() =>
      parseMangabindProgressLine(JSON.stringify({ ...writing, [field]: value })),
    ).toThrow(CliProtocolError);
  });

  it('reads the progress that arrives in pieces, the last without its end of line', () => {
    const decoder = new MangabindProgressDecoder();
    const line = JSON.stringify(writing);

    expect(decoder.push(line.slice(0, 20))).toEqual([]);
    expect(decoder.push(`${line.slice(20)}\r\n${JSON.stringify(inspecting)}`)).toHaveLength(1);
    expect(decoder.finish()).toHaveLength(1);
    expect(decoder.finish()).toEqual([]);
  });
});
