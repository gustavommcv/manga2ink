import { describe, expect, it, vi } from 'vitest';

import { KeepAwake } from '@/main/keep-awake';

function blocker(): {
  readonly start: ReturnType<typeof vi.fn<(type: 'prevent-app-suspension') => number>>;
  readonly stop: ReturnType<typeof vi.fn<(id: number) => void>>;
} {
  let id = 40;
  return {
    start: vi.fn<(type: 'prevent-app-suspension') => number>(() => ++id),
    stop: vi.fn<(id: number) => void>(),
  };
}

describe('keeping the computer awake', () => {
  it('blocks the suspension of the system, and lets the screen turn off', () => {
    const power = blocker();

    new KeepAwake(power).sync(true);

    expect(power.start).toHaveBeenCalledExactlyOnceWith('prevent-app-suspension');
  });

  it('holds one block however many times it is asked to', () => {
    const power = blocker();
    const awake = new KeepAwake(power);

    awake.sync(true);
    awake.sync(true);
    awake.sync(true);

    expect(power.start).toHaveBeenCalledOnce();
    expect(power.stop).not.toHaveBeenCalled();
  });

  it('takes the block it holds when it is no longer wanted, once', () => {
    const power = blocker();
    const awake = new KeepAwake(power);
    awake.sync(true);

    awake.sync(false);
    awake.sync(false);

    expect(power.stop).toHaveBeenCalledExactlyOnceWith(41);
  });

  it('does nothing when it is not wanted and nothing is held', () => {
    const power = blocker();

    new KeepAwake(power).sync(false);

    expect(power.start).not.toHaveBeenCalled();
    expect(power.stop).not.toHaveBeenCalled();
  });

  it('holds a new block when it is wanted again after one was taken', () => {
    const power = blocker();
    const awake = new KeepAwake(power);

    awake.sync(true);
    awake.sync(false);
    awake.sync(true);
    awake.sync(false);

    expect(power.start).toHaveBeenCalledTimes(2);
    expect(power.stop.mock.calls).toEqual([[41], [42]]);
  });
});
