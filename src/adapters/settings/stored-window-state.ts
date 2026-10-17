import type { WindowState } from '@/domain/window-state';

export const windowStateFileVersion = 1;

/** Nothing a desktop has comes near this: a bigger number is a file that was edited by hand, or damaged. */
const farthest = 100_000;

const isSize = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= farthest;

const isPlace = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= farthest;

/**
 * What the file of the window holds, or undefined when it cannot be used: not JSON, not an object,
 * another version, or a size that is not one. A place that is not a number is left out, since the
 * size is still of use without it, and a size and place are whole pixels.
 */
export function parseStoredWindowState(raw: string): WindowState | undefined {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return undefined;
  const file = json as Record<string, unknown>;
  if (file.version !== windowStateFileVersion) return undefined;
  if (!isSize(file.width) || !isSize(file.height)) return undefined;
  const { x, y } = file;
  return {
    width: Math.round(file.width),
    height: Math.round(file.height),
    ...(isPlace(x) && isPlace(y) ? { x: Math.round(x), y: Math.round(y) } : {}),
    maximized: file.maximized === true,
  };
}

export function serializeStoredWindowState(state: WindowState): string {
  return `${JSON.stringify(
    {
      version: windowStateFileVersion,
      width: state.width,
      height: state.height,
      ...(state.x === undefined || state.y === undefined ? {} : { x: state.x, y: state.y }),
      maximized: state.maximized,
    },
    null,
    2,
  )}\n`;
}
