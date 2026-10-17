/** A rectangle on the desktop, in pixels: a window, or the part of a display a window may use. */
export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** The size the window opens at until it has been used, and the least it can be made (ADR 0062). */
export const defaultWindowSize: Size = { width: 1180, height: 760 };
export const minimumWindowSize: Size = { width: 480, height: 400 };

/**
 * What is kept of the window between sessions: its size when it is neither maximized nor full
 * screen, where it was, and whether it was maximized. Where it was is left out when the system does
 * not let a program place its window (a Wayland session).
 */
export interface WindowState {
  readonly width: number;
  readonly height: number;
  readonly x?: number;
  readonly y?: number;
  readonly maximized: boolean;
}

/** What the window is made with: the size, where it goes (or nothing, for the system to choose), maximized or not. */
export interface WindowPlacement {
  readonly width: number;
  readonly height: number;
  readonly x?: number;
  readonly y?: number;
  readonly maximized: boolean;
}

/**
 * How much of the top of a window must be on a display for its place to be kept: enough to grab
 * the title bar (the strip is as high as the bar, 48px, and this wide), so that a window left on a
 * display that is not there any more is not put where it cannot be reached.
 */
const reachableStrip: Size = { width: 120, height: 48 };

/** How much of one rectangle is inside another, as a width and a height; zero when they do not meet. */
function overlap(window: Rectangle, area: Rectangle): Size {
  return {
    width: Math.max(
      0,
      Math.min(window.x + window.width, area.x + area.width) - Math.max(window.x, area.x),
    ),
    height: Math.max(
      0,
      Math.min(window.y + window.height, area.y + area.height) - Math.max(window.y, area.y),
    ),
  };
}

const between = (value: number, least: number, most: number): number =>
  Math.min(Math.max(value, least), Math.max(least, most));

/**
 * Where and how big to open the window (ADR 0062), from what was kept and from the displays there
 * are now (`areas`, the part of each that a window may use, the main one first). Nothing kept, or no
 * display, is the size it opens at. A size is never under the least a window can be made, nor more
 * than the display it is on. A place is kept only if enough of the title bar is on a display, and
 * is moved the least that puts the window wholly on it; otherwise the system chooses the place.
 */
export function placeWindow(
  saved: WindowState | undefined,
  areas: readonly Rectangle[],
  defaults: Size,
  minimum: Size,
): WindowPlacement {
  const main = areas[0];
  if (saved === undefined || main === undefined) return { ...defaults, maximized: false };

  const { x, y } = saved;
  const kept =
    x === undefined || y === undefined
      ? undefined
      : areas.find((area) => {
          const meeting = overlap({ x, y, width: saved.width, height: saved.height }, area);
          return meeting.width >= reachableStrip.width && meeting.height >= reachableStrip.height;
        });
  const area = kept ?? main;
  const width = between(saved.width, minimum.width, area.width);
  const height = between(saved.height, minimum.height, area.height);
  if (kept === undefined || x === undefined || y === undefined) {
    return { width, height, maximized: saved.maximized };
  }
  return {
    width,
    height,
    x: between(x, area.x, area.x + area.width - width),
    y: between(y, area.y, area.y + area.height - height),
    maximized: saved.maximized,
  };
}
