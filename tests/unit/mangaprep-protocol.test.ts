import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  MangaprepEventDecoder,
  parseMangaprepEventLine,
  parseMangaprepEventStream,
} from '@/adapters/mangaprep/protocol';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixture = fs.readFileSync(
  path.join(repositoryRoot, 'tests', 'fixtures', 'protocol', 'mangaprep-v1-events.jsonl'),
  'utf8',
);

describe('mangaprep protocol v1', () => {
  it('parses the frozen event stream with contiguous order and contextual progress', () => {
    const events = parseMangaprepEventStream(fixture);

    expect(events).toHaveLength(19);
    expect(events.map((event) => event.sequence)).toEqual(
      Array.from({ length: 19 }, (_, index) => index + 1),
    );
    expect(events.filter((event) => event.type === 'page')).toMatchObject([
      { chapter: 'Mangá São José - Vol.01', page: 1, completed: 1, total: 2 },
      { chapter: 'Mangá São José - Vol.01', page: 2, completed: 2, total: 2 },
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'result',
      manga: 'Mangá São José - Vol.01',
      written: true,
    });
  });

  it('rejects the old converter identity even though both tools use protocol version 1', () => {
    const oldFixture = fs.readFileSync(
      path.join(repositoryRoot, 'tests', 'fixtures', 'protocol', 'mangapress-v1-events.jsonl'),
      'utf8',
    );
    expect(() => parseMangaprepEventStream(oldFixture)).toThrowError(
      expect.objectContaining({ code: 'invalid_payload' }),
    );
  });

  it('decodes arbitrarily chunked output and accepts a complete final line without a newline', () => {
    const expected = parseMangaprepEventStream(fixture);
    const decoder = new MangaprepEventDecoder();
    const actual = [
      ...decoder.push(fixture.slice(0, 17)),
      ...decoder.push(fixture.slice(17, 311)),
      ...decoder.push(fixture.slice(311).trimEnd()),
      ...decoder.finish(),
    ];

    expect(actual).toEqual(expected);
  });

  it('allows a valid partial stream so a subprocess failure can retain prior progress', () => {
    const firstTwoLines = `${fixture.split('\n').slice(0, 2).join('\n')}\n`;
    const events = parseMangaprepEventStream(firstTwoLines);

    expect(events).toHaveLength(2);
    expect(events.at(-1)).toMatchObject({
      sequence: 2,
      stage: 'metadata',
      state: 'started',
    });
  });

  it('accepts additive fields and unknown future event types', () => {
    const event = parseMangaprepEventLine(
      JSON.stringify({
        protocol_version: 1,
        tool: 'mangaprep',
        tool_version: 'future',
        sequence: 1,
        type: 'future_event',
        new_context: { useful: true },
      }),
    );

    expect(event.type).toBe('future_event');
    expect(event.new_context).toEqual({ useful: true });
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
    'treats %j as an unknown event type, not as one it has a schema for',
    (type) => {
      const line = `{"protocol_version":1,"tool":"mangaprep","tool_version":"future","sequence":1,"type":${JSON.stringify(type)}}`;

      expect(parseMangaprepEventLine(line).type).toBe(type);
    },
  );

  it.each([
    {
      name: 'an empty stream',
      run: () => parseMangaprepEventStream('  \r\n'),
      code: 'empty_stream',
    },
    {
      name: 'an empty event line',
      run: () => parseMangaprepEventStream(`${fixture.split('\n')[0]}\n\n`),
      code: 'invalid_payload',
    },
    {
      name: 'malformed complete JSON',
      run: () => parseMangaprepEventStream('{]\n'),
      code: 'malformed_json',
    },
    {
      name: 'an incomplete final line',
      run: () => {
        const decoder = new MangaprepEventDecoder();
        decoder.push('{"protocol_version":');
        decoder.finish();
      },
      code: 'incomplete_line',
    },
    {
      name: 'an unsupported version',
      run: () =>
        parseMangaprepEventLine(
          '{"protocol_version":2,"tool":"mangaprep","tool_version":"x","sequence":1,"type":"future"}',
        ),
      code: 'unsupported_protocol',
    },
    {
      name: 'a malformed known event',
      run: () =>
        parseMangaprepEventLine(
          '{"protocol_version":1,"tool":"mangaprep","tool_version":"x","sequence":1,"type":"page"}',
        ),
      code: 'invalid_payload',
    },
    {
      name: 'an event missing its base fields',
      run: () => parseMangaprepEventLine('{"protocol_version":1,"type":"future","sequence":1}'),
      code: 'invalid_payload',
    },
    {
      name: 'a non-object event',
      run: () => parseMangaprepEventLine('[]'),
      code: 'invalid_payload',
    },
    {
      name: 'an event missing its protocol version',
      run: () =>
        parseMangaprepEventLine(
          '{"tool":"mangaprep","tool_version":"x","sequence":1,"type":"future"}',
        ),
      code: 'invalid_payload',
    },
    {
      name: 'an invalid final event without a newline',
      run: () => {
        const decoder = new MangaprepEventDecoder();
        decoder.push(
          '{"protocol_version":1,"tool":"mangaprep","tool_version":"x","sequence":1,"type":"page"}',
        );
        decoder.finish();
      },
      code: 'invalid_payload',
    },
    {
      name: 'a sequence gap',
      run: () => {
        const lines = fixture.split('\n');
        const second = JSON.parse(lines[1] ?? '{}') as Record<string, unknown>;
        second.sequence = 3;
        parseMangaprepEventStream(`${lines[0]}\n${JSON.stringify(second)}\n`);
      },
      code: 'sequence_gap',
    },
  ])('rejects $name', ({ run, code }) => {
    expect(run).toThrowError(expect.objectContaining({ code }));
  });
});
