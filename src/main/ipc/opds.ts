import type { OpdsServerHandle } from '@/application/ports/opds-server';
import { LibraryIndexError } from '@/library/manifest';
import {
  type NetworkInterfaceOption,
  type OpdsSharingStatus,
  startSharingCommandSchema,
} from '@/shared/opds-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';
import { message } from '@/domain/message';

import { opdsPort } from '../constants';
import type { MainContext } from '../context';
import { handle, ignoredPayloadSchema } from './handle';
import { failed, ok, toFailure } from './result';
import { sharingFailure } from './sharing-failure';
import { sharingTarget } from './sharing-target';

type OpdsContext = Pick<
  MainContext,
  | 'selectedLibraries'
  | 'activeSharing'
  | 'activeSharingTarget'
  | 'pendingRunActivity'
  | 'pendingCatalog'
  | 'opdsServer'
  | 'networkInterfaces'
  | 'pendingRuns'
  | 'processing'
>;
function toSharingStatus(handle: OpdsServerHandle | undefined): OpdsSharingStatus {
  if (handle === undefined) return { active: false };
  return {
    active: true,
    url: handle.url,
    interfaceAddress: handle.interfaceAddress,
    port: handle.port,
  };
}
export function registerOpdsHandlers(context: OpdsContext): void {
  handle(
    'opds:list-network-interfaces',
    ignoredPayloadSchema,
    (): WorkflowResult<readonly NetworkInterfaceOption[]> => ok(context.networkInterfaces.list()),
  );
  handle(
    'opds:start-sharing',
    startSharingCommandSchema,
    async (_event, command): Promise<WorkflowResult<OpdsSharingStatus>> => {
      const libraryPath = context.selectedLibraries.get(command.libraryId);
      if (libraryPath === undefined) {
        return failed({
          code: 'library_not_found',
          said: message('failure.chooseLibraryAgain', {}),
        });
      }
      // The address comes from the page, and only the page limits it to the list on screen: a
      // wildcard would put the books on every network this device is on.
      if (!context.networkInterfaces.canShareOn(command.interfaceAddress)) {
        return failed({
          code: 'sharing_address_unavailable',
          said: message('failure.sharingAddressUnavailable', {}),
        });
      }
      const target = sharingTarget(
        libraryPath,
        context.pendingRuns?.root,
        context.processing?.pendingRoots() ?? [],
      );
      // Every ready book is shared, so a deletion of any pending conversion is in the way.
      const deleting = target.readyBooks
        ? context.pendingRunActivity.isDeletingAny()
        : context.pendingRunActivity.isDeleting(command.libraryId);
      if (deleting) {
        return failed({
          code: 'pending_in_use',
          said: message('failure.sharingPendingBeingDeleted', {}),
        });
      }
      if (context.activeSharing !== undefined || context.activeSharingTarget !== undefined) {
        return failed({
          code: 'sharing_already_active',
          said: message('failure.sharingAlreadyRunning', {}),
        });
      }
      context.activeSharingTarget = target;
      // The listener never reads the catalog on start, so a corrupt one would otherwise only
      // surface as a broken feed on the reader. A missing catalog is fine (read() returns an
      // empty one); only unreadable content stops sharing here. Any read failure gets the same
      // message, and its cause goes to the log.
      try {
        await context.pendingCatalog.read(target.path);
      } catch (error) {
        console.error('The library catalog could not be read to start sharing.', error);
        context.activeSharingTarget = undefined;
        return failed({
          code: error instanceof LibraryIndexError ? error.code : 'library_unreadable',
          said: message('failure.catalogUnreadable', {}),
        });
      }
      try {
        context.activeSharing = await context.opdsServer.start({
          libraryPath: target.path,
          libraryTitle: target.title,
          interfaceAddress: command.interfaceAddress,
          port: opdsPort,
          auth: command.auth,
        });
      } catch (error) {
        // Only here do these system errors mean the network: the same codes from a file operation
        // do not, and go through toFailure().
        const failure = sharingFailure(error);
        if (failure === undefined) throw error;
        console.error('The sharing server could not be started.', error);
        context.activeSharingTarget = undefined;
        return failed(failure);
      }
      return ok(toSharingStatus(context.activeSharing));
    },
    (error: unknown) => {
      context.activeSharingTarget = undefined;
      return toFailure(error);
    },
  );
  handle(
    'opds:stop-sharing',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<undefined>> => {
      if (context.activeSharing === undefined) {
        return failed({
          code: 'sharing_not_active',
          said: message('failure.sharingNotRunning', {}),
        });
      }
      await context.activeSharing.stop();
      context.activeSharing = undefined;
      context.activeSharingTarget = undefined;
      return ok(undefined);
    },
  );
  handle('opds:get-status', ignoredPayloadSchema, (): WorkflowResult<OpdsSharingStatus> =>
    ok(toSharingStatus(context.activeSharing)),
  );
}
