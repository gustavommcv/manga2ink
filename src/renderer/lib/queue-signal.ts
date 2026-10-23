import type { QueueRunSummary } from '@/domain/queue-run';
import type { Manga2InkBridge } from '@/shared/runtime-info';

type QueueBridge = Pick<Manga2InkBridge, 'beginQueue' | 'endQueue'>;

/**
 * Tells the main process that a queue has begun, from the click on Process, and gives back what ends
 * it (ADR 0065). Not being able to tell it is never a reason not to convert: the queue is then one
 * the main process does not know of until its first conversion, which it does.
 */
export async function beginQueue(bridge: QueueBridge): Promise<string | undefined> {
  try {
    const result = await bridge.beginQueue();
    return result.ok ? result.value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Tells it the queue has ended and how it went. A queue that was never told about, or whose end
 * cannot be told, is one the main process lets go of when its window goes away.
 */
export async function endQueue(
  bridge: QueueBridge,
  token: string | undefined,
  summary: QueueRunSummary,
): Promise<void> {
  if (token === undefined) return;
  try {
    await bridge.endQueue({ token, summary });
  } catch {
    // Nothing is left to tell it to: the window is going away, and the main process lets go of it.
  }
}
