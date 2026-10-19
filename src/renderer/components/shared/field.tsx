import type React from 'react';

import { Label } from '@/renderer/components/ui/label';

import { FieldMessage } from './field-message';
import { SettingFieldHeader } from './setting-field-header';

/**
 * A field of a form (ADR 0079): its label above its control, and under it what it is for or what is
 * wrong with it. With `onReset` the label has the button that puts the choice back (see
 * `SettingFieldHeader`); without it the label is a label. The line under the control is
 * `${id}-message`, which the control names in `aria-describedby` when it has one. Every field of the
 * app is the same 8 px between the three.
 */
export function Field({
  announces = false,
  changed = false,
  children,
  description,
  disabled,
  error,
  id,
  label,
  onReset,
  optional,
  resetsTo,
}: {
  /** Whether what is said under the control is read out when it changes, as a failure to keep is. */
  readonly announces?: boolean;
  readonly changed?: boolean;
  /** The control: an input, a select, a group of buttons. */
  readonly children: React.ReactNode;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly error?: string;
  /** The id of the control, which the label is for; a group of buttons has none. */
  readonly id?: string;
  readonly label: string;
  readonly onReset?: () => void;
  readonly optional?: boolean;
  readonly resetsTo?: 'default' | 'queue';
}): React.JSX.Element {
  const message = (
    <FieldMessage
      {...(description === undefined ? {} : { description })}
      {...(error === undefined ? {} : { error })}
      {...(id === undefined ? {} : { id: `${id}-message` })}
    />
  );
  return (
    <div className="space-y-2">
      {onReset === undefined ? (
        <div className="text-sm">
          <Label htmlFor={id}>{label}</Label>
        </div>
      ) : (
        <SettingFieldHeader
          changed={changed}
          {...(disabled === undefined ? {} : { disabled })}
          {...(id === undefined ? {} : { id })}
          label={label}
          onReset={onReset}
          {...(optional === undefined ? {} : { optional })}
          {...(resetsTo === undefined ? {} : { resetsTo })}
        />
      )}
      {children}
      {announces ? <div aria-live="polite">{message}</div> : message}
    </div>
  );
}
