import { z } from 'zod';

/**
 * The folders of the app that the window can ask to have opened in the file manager (ADR 0057). The
 * window names one; the path is the main process's, so the page never gives one of its own.
 */
export const appFolders = ['data', 'logs'] as const;

export type AppFolder = (typeof appFolders)[number];

export const openAppFolderCommandSchema = z.object({ folder: z.enum(appFolders) });

export type OpenAppFolderCommand = z.infer<typeof openAppFolderCommandSchema>;
