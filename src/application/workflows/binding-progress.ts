import type { BindingProgress } from '@/application/ports/conversion-tools';
import type { ConversionProgress } from '@/domain/conversion';
import { message } from '@/domain/message';

/** Keep the main message stable while the measured page count advances. */
export function presentBindingProgress(progress: BindingProgress): ConversionProgress {
  const title = progress.manga;
  if (progress.stage === 'inspect') {
    return {
      stage: 'binding',
      title,
      message:
        progress.state === 'started'
          ? message('progress.inspecting', { title })
          : message('progress.organizing', { title }),
    };
  }
  return {
    stage: 'binding',
    title,
    bindingState: progress.state,
    message: message('progress.buildingVolume', {
      volume: progress.volumeIndex,
      volumes: progress.volumeCount,
    }),
    completed: progress.completedPages,
    total: progress.totalPages,
  };
}
