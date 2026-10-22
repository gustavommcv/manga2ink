import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { WorkingSpace } from '@/domain/working-space';
import { useWorkingSpace } from '@/renderer/hooks/use-working-space';
import type { Manga2InkBridge } from '@/shared/runtime-info';
import { raw } from '@/domain/message';

const roomy: WorkingSpace = { scratchFreeBytes: 10, pendingFreeBytes: 20, sameDrive: false };
const tight: WorkingSpace = { scratchFreeBytes: 1, pendingFreeBytes: 2, sameDrive: true };

const answering =
  (...spaces: WorkingSpace[]): Manga2InkBridge['getWorkingSpace'] =>
  () =>
    Promise.resolve({ ok: true, value: spaces.shift() ?? roomy });

describe('useWorkingSpace', () => {
  it('knows nothing until the main process has answered, then what it said', async () => {
    const bridge = { getWorkingSpace: answering(roomy) };
    const { result } = renderHook(() => useWorkingSpace(bridge, true));

    expect(result.current).toBeNull();
    await waitFor(() => {
      expect(result.current).toEqual(roomy);
    });
  });

  it('does not ask while the queue is not what is shown', () => {
    const getWorkingSpace = vi.fn(answering(roomy));

    const bridge = { getWorkingSpace };
    const { result } = renderHook(() => useWorkingSpace(bridge, false));

    expect(getWorkingSpace).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('asks again when the window is looked at again, since room may have been made elsewhere', async () => {
    const bridge = { getWorkingSpace: answering(tight, roomy) };
    const { result } = renderHook(() => useWorkingSpace(bridge, true));
    await waitFor(() => {
      expect(result.current).toEqual(tight);
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(result.current).toEqual(roomy);
    });
  });

  it.each([
    [
      'an answer that is a failure',
      () => Promise.resolve({ ok: false as const, error: { code: 'x', said: raw('x') } }),
    ],
    ['a call that does not reach the main process', () => Promise.reject(new Error('gone'))],
  ])('forgets what it knew after %s, and warns of nothing', async (_what, fails) => {
    const getWorkingSpace = vi
      .fn<Manga2InkBridge['getWorkingSpace']>()
      .mockImplementationOnce(answering(tight))
      .mockImplementation(fails);
    const bridge = { getWorkingSpace };
    const { result } = renderHook(() => useWorkingSpace(bridge, true));
    await waitFor(() => {
      expect(result.current).toEqual(tight);
    });

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('uses no answer that comes after it is done with, and listens to the window no more', async () => {
    let answer: (value: { ok: true; value: WorkingSpace }) => void = () => undefined;
    const getWorkingSpace = vi.fn<Manga2InkBridge['getWorkingSpace']>(
      () => new Promise((resolve) => (answer = resolve)),
    );
    const bridge = { getWorkingSpace };
    const { result, unmount } = renderHook(() => useWorkingSpace(bridge, true));

    unmount();
    answer({ ok: true, value: tight });
    window.dispatchEvent(new Event('focus'));

    await act(() => Promise.resolve());
    expect(result.current).toBeNull();
    expect(getWorkingSpace).toHaveBeenCalledTimes(1);
  });
});
