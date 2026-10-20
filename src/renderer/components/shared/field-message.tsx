import { Note } from '@/renderer/components/shared/note';

/** The line under a form field: its error when it has one, otherwise what it is for. */
export function FieldMessage({
  description,
  error,
  id,
}: {
  readonly description?: string;
  readonly error?: string;
  readonly id?: string;
}): React.JSX.Element | null {
  if (error !== undefined) {
    return (
      <Note className="text-status-failed" id={id}>
        {error}
      </Note>
    );
  }
  return description === undefined ? null : <Note id={id}>{description}</Note>;
}
