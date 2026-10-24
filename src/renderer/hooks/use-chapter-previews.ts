import { useEffect, useState } from 'react';

import { dataUrlOf } from '@/renderer/lib/data-url';
import type { Manga2InkBridge } from '@/shared/runtime-info';

/** How many files are asked for at once; the main process refuses more. */
const batch = 24;

const none: ReadonlyMap<string, string> = new Map();

/**
 * The first pages of the files that claim a chapter, as images the window can show, read while the
 * page is open and added as they come. A page that cannot be had is not in the map, and the file is
 * shown without one: a preview is never worth an error.
 */
export function useChapterPreviews(
  bridge: Pick<Manga2InkBridge, 'previewChapters'>,
  sessionId: string | undefined,
  ids: readonly string[],
): ReadonlyMap<string, string> {
  const [previews, setPreviews] = useState<{
    readonly key: string;
    readonly images: ReadonlyMap<string, string>;
  }>();
  // The ids are a new list on every render: what names them is these two values.
  const wanted = ids.join('\n');
  const key = `${sessionId ?? ''}\n${wanted}`;

  useEffect(() => {
    if (sessionId === undefined || wanted === '') return;
    const stop = { now: false };
    const stopped = (): boolean => stop.now;
    const found = new Map<string, string>();
    const files = wanted.split('\n');
    void (async () => {
      for (let at = 0; at < files.length && !stopped(); at += batch) {
        const result = await bridge.previewChapters({
          sessionId,
          ids: files.slice(at, at + batch),
        });
        if (stopped()) return;
        if (!result.ok) continue;
        for (const page of result.value) found.set(page.id, dataUrlOf(page.mime, page.bytes));
        setPreviews({ key, images: new Map(found) });
      }
    })();
    return () => {
      stop.now = true;
    };
  }, [bridge, key, sessionId, wanted]);

  return previews?.key === key ? previews.images : none;
}
