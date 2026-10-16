import { describe, expect, it } from 'vitest';

import { message, raw } from '@/domain/message';

describe('message', () => {
  it('is a code and the values it is about, as plain data that can cross the bridge', () => {
    const one = message('queue.chip.volumes', { count: 2 });

    expect(one).toEqual({ id: 'queue.chip.volumes', values: { count: 2 } });
    expect(JSON.parse(JSON.stringify(one))).toEqual(one);
  });

  it('can be about nothing but being said', () => {
    expect(message('queue.chip.ready', {})).toEqual({ id: 'queue.chip.ready', values: {} });
  });
});

describe('raw', () => {
  it('is what someone else wrote, to be said as it is', () => {
    expect(raw('ENOSPC: no space left on device')).toEqual({
      id: 'text.raw',
      values: { text: 'ENOSPC: no space left on device' },
    });
  });
});
