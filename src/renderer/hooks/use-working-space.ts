import { useEffect, useState } from 'react';

import type { WorkingSpace } from '@/domain/working-space';
import type { MangaboundBridge } from '@/shared/runtime-info';

/**
 * What is left on the drives the app works on (ADR 0060), asked each time `active` becomes true and
 * whenever the window is looked at again, since a person who makes room in another window comes
 * back to this one. A question that fails says nothing: the screen then has no warning to give,
 * which is what it would have had before the question was asked.
 */
export function useWorkingSpace(
  bridge: Pick<MangaboundBridge, 'getWorkingSpace'>,
  active: boolean,
): WorkingSpace | null {
  const [space, setSpace] = useState<WorkingSpace | null>(null);

  useEffect(() => {
    if (!active) return;
    let current = true;
    const ask = (): void => {
      void bridge
        .getWorkingSpace()
        .then((result) => {
          if (current) setSpace(result.ok ? result.value : null);
        })
        .catch(() => {
          if (current) setSpace(null);
        });
    };
    ask();
    window.addEventListener('focus', ask);
    return () => {
      current = false;
      window.removeEventListener('focus', ask);
    };
  }, [bridge, active]);

  return space;
}
