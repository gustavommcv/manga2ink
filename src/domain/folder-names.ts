/** The last part of a path, whichever separator it uses; empty when the path names nothing. */
export function lastPathPart(path: string): string {
  return (
    path
      .split(/[\\/]/u)
      .filter((part) => part !== '')
      .at(-1) ?? ''
  );
}
