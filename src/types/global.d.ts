import type { Manga2InkBridge } from '../shared/runtime-info';

declare global {
  interface Window {
    readonly manga2ink?: Manga2InkBridge;
  }
}

export {};
