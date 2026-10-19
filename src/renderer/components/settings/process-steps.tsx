import {
  blockedModeReason,
  defaultProcessMode,
  type ModeInput,
  modeFromSteps,
  type ProcessMode,
  type ProcessSteps as Steps,
  resolveMode,
  singleBookLockReason,
  stepsFromMode,
} from '@/domain/process-mode';
import { SettingFieldHeader } from '@/renderer/components/settings/setting-field-header';
import { CheckRow } from '@/renderer/components/shared/check-row';
import { useMessages, useSay } from '@/renderer/hooks/use-messages';

interface ProcessStepsProps {
  /** What is being run, since a CBZ and a whole library allow different processes. */
  readonly input: ModeInput;
  readonly mode: ProcessMode;
  readonly onMode: (mode: ProcessMode) => void;
  readonly disabled?: boolean;
  readonly singleBook?: boolean;
}

/** Which of the two tools a run uses: join chapters into volumes, convert for a device, or both. */
export function ProcessSteps({
  disabled = false,
  input,
  mode,
  onMode,
  singleBook = false,
}: ProcessStepsProps): React.JSX.Element {
  const words = useMessages().queue.steps;
  const { say } = useSay();
  const resolvedMode = resolveMode(input, mode);
  const steps = stepsFromMode(resolvedMode);
  // A CBZ or library can force a different effective mode. That is not a user change to the
  // checkbox shown here, so only offer an individual reset when the saved mode is visible.
  const canRestoreStep = !singleBook && input !== 'cbz' && resolvedMode === mode;
  // A step is off-limits when turning it off would leave nothing to run, or would ask this kind of
  // input for a process it cannot have, or when single-book mode is active.
  const reasonFor = (toggled: Steps): string | undefined => {
    if (singleBook) return say(singleBookLockReason);
    if (!toggled.group && !toggled.convert) return words.keepOne;
    const blocked = blockedModeReason(input, modeFromSteps(toggled));
    return blocked === undefined ? undefined : say(blocked);
  };
  const groupReason = reasonFor({ group: !steps.group, convert: steps.convert });
  const convertReason = reasonFor({ group: steps.group, convert: !steps.convert });

  return (
    <fieldset className="mx-0 min-w-0 space-y-3 border-0 p-0" disabled={disabled}>
      <legend className="text-muted-foreground mb-2 text-xs font-medium">{words.legend}</legend>
      <Step
        changed={canRestoreStep && !steps.group}
        checked={steps.group}
        id="step-group"
        label={words.group}
        onChange={() => {
          onMode(modeFromSteps({ group: !steps.group, convert: steps.convert }));
        }}
        onReset={() => {
          onMode(defaultProcessMode);
        }}
        reason={groupReason}
        tool="mangabind"
      />
      <Step
        changed={canRestoreStep && !steps.convert}
        checked={steps.convert}
        id="step-convert"
        label={words.convert}
        onChange={() => {
          onMode(modeFromSteps({ group: steps.group, convert: !steps.convert }));
        }}
        onReset={() => {
          onMode(defaultProcessMode);
        }}
        reason={convertReason}
        tool="mangapress"
      />
    </fieldset>
  );
}

function Step({
  changed,
  checked,
  id,
  label,
  onChange,
  onReset,
  reason,
  tool,
}: {
  readonly changed: boolean;
  readonly checked: boolean;
  readonly id: string;
  readonly label: string;
  readonly onChange: () => void;
  readonly onReset: () => void;
  readonly reason: string | undefined;
  readonly tool: string;
}): React.JSX.Element {
  return (
    <CheckRow
      checked={checked}
      describedBy={reason === undefined ? `${id}-tool` : `${id}-tool ${id}-reason`}
      disabled={reason !== undefined}
      id={id}
      note={
        <div className="space-y-0.5">
          <p className="text-subtle-foreground text-xs" id={`${id}-tool`}>
            {tool}
          </p>
          {reason !== undefined && (
            <p className="text-muted-foreground text-xs" id={`${id}-reason`}>
              {reason}
            </p>
          )}
        </div>
      }
      onChange={onChange}
      title={
        <SettingFieldHeader
          changed={changed}
          disabled={reason !== undefined}
          id={id}
          label={label}
          onReset={onReset}
        />
      }
    />
  );
}
