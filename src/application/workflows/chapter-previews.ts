import type { ChapterPreviewPort } from '@/application/ports/chapter-previews';
import type { InputSessions } from '@/application/workflows/input-sessions';
import { type ChapterPreview, versionGroups } from '@/domain/chapter-versions';

/**
 * The first pages of the files that claim a chapter, to show them by (ADR 0093). A page is asked for
 * by the id of a file the app read in that session, never by a path: the files, and where they are,
 * are the app's own.
 */
export class ChapterPreviews {
  constructor(
    private readonly sessions: InputSessions,
    private readonly pages: ChapterPreviewPort,
  ) {}

  async ofVersions(sessionId: string, ids: readonly string[]): Promise<readonly ChapterPreview[]> {
    const { trustedDraft } = this.sessions.requireSession(sessionId);
    const known = new Map(
      versionGroups(trustedDraft).flatMap((group) =>
        group.candidates.map((candidate) => [candidate.id, candidate] as const),
      ),
    );
    const asked = [...new Set(ids)].flatMap((id) => {
      const candidate = known.get(id);
      return candidate === undefined ? [] : [candidate];
    });
    const previews = await Promise.all(
      asked.map(async (candidate): Promise<readonly ChapterPreview[]> => {
        const page = await this.pages.firstPage(candidate);
        return page === undefined ? [] : [{ id: candidate.id, ...page }];
      }),
    );
    return previews.flat();
  }
}
