import type { NoValues } from './values';

/**
 * What the app says of its bundled tools (mangabind and mangapress) once it has checked them, in
 * the words of a code (ADR 0053). The window shows one only when something is wrong; the others are
 * kept with the status so that a report of a problem can carry them.
 */
export interface ToolchainMessageValues {
  /** Every tool passed its check. */
  readonly 'toolchain.ready': NoValues;
  /** At least one did not, so nothing can be converted. */
  readonly 'toolchain.unavailable': NoValues;
  /** The app has no tools for this system. */
  readonly 'toolchain.noTarget': { readonly platform: string; readonly arch: string };
  /** The list of tools that came with the app could not be read or is not what the app expects. */
  readonly 'toolchain.manifestUnverified': NoValues;
  /** The window could not even ask. */
  readonly 'toolchain.checkFailed': NoValues;
  readonly 'toolchain.toolReady': { readonly tool: string; readonly release: string };
  readonly 'toolchain.toolFailed': { readonly tool: string };
}
