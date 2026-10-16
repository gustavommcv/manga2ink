import type { AnyMessage } from '@/domain/message';

export type ToolName = 'mangabind' | 'mangapress';
export type ToolchainTarget = 'win32-x64' | 'linux-x64' | 'darwin-x64' | 'darwin-arm64';

export interface ToolVerificationStatus {
  readonly name: ToolName;
  readonly releaseTag: string;
  readonly state: 'ready' | 'failed';
  /** What the app says of this tool, said by the window in its language. */
  readonly message: AnyMessage;
  /** Advertised by the verified executable's protocol handshake. */
  readonly capabilities?: readonly string[];
}

export interface ToolchainStatus {
  readonly state: 'ready' | 'blocked';
  readonly target?: ToolchainTarget;
  readonly tools: readonly ToolVerificationStatus[];
  /** What the app says of the tools as a whole, said by the window in its language. */
  readonly message: AnyMessage;
}
