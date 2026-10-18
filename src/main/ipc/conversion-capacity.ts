import {
  conversionCapacity,
  type MachineCapacity,
} from '@/application/workflows/conversion-concurrency';
import type { ConversionCapacity } from '@/domain/parallel-conversions';
import type { WorkflowResult } from '@/shared/workflow-contract';

import { handle, ignoredPayloadSchema } from './handle';
import { ok } from './result';

/**
 * What this computer can do as to how many books of a title are converted at once (ADR 0068): what
 * "automatic" comes to here and the most that can be asked for. The window asks when the Processing
 * tab is shown, to say the one and to offer no number above the other; the workflow lowers a number
 * that was kept on a bigger computer by the same rule, so what is offered is what is done.
 */
export function registerConversionCapacityHandlers(machine: () => MachineCapacity): void {
  handle(
    'app:get-conversion-capacity',
    ignoredPayloadSchema,
    (): WorkflowResult<ConversionCapacity> => ok(conversionCapacity(machine())),
  );
}
