import { Copy, RadioTower } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/renderer/components/ui/button';
import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { NativeSelect } from '@/renderer/components/ui/native-select';
import { useMessages } from '@/renderer/hooks/use-messages';
import { catalogAddress } from '@/renderer/lib/sharing';
import type {
  NetworkInterfaceOption,
  OpdsAuthConfig,
  OpdsSharingStatus,
} from '@/shared/opds-contract';
import type { SelectedLibrary } from '@/shared/workflow-contract';
import { Note } from '@/renderer/components/shared/note';

export interface SharePanelProps {
  readonly library?: SelectedLibrary;
  readonly interfaces: readonly NetworkInterfaceOption[];
  readonly selectedInterface?: NetworkInterfaceOption;
  readonly status: OpdsSharingStatus;
  readonly onChooseLibrary: () => void;
  readonly onSelectInterface?: (selected: NetworkInterfaceOption) => void;
  readonly onStart: (interfaceAddress: string, auth: OpdsAuthConfig) => void;
  readonly onStop: () => void;
}

/**
 * The one place sharing is set up, started and stopped (ADR 0016). It opens from the title bar
 * whenever it is wanted, and from the results screen with the books just saved already chosen.
 */
export function SharePanel({
  library,
  interfaces,
  selectedInterface,
  status,
  onChooseLibrary,
  onSelectInterface,
  onStart,
  onStop,
}: SharePanelProps): React.JSX.Element {
  const words = useMessages().sharing.panel;
  const [localInterfaceAddress, setLocalInterfaceAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const shareUrlRef = useRef<HTMLInputElement>(null);
  // Always present and never disabled in the "not active" branch, unlike "Start sharing" (which
  // is disabled when no library or network interface is available) - the one safe universal
  // target for the stop transition, whatever its label ("Choose a library" / "Change shared
  // library") happens to say.
  const libraryButtonRef = useRef<HTMLButtonElement>(null);
  const previousActive = useRef(status.active);

  const selectedInterfaceAddress =
    selectedInterface?.address ??
    interfaces.find((option) => option.address === localInterfaceAddress)?.address ??
    interfaces[0]?.address ??
    '';
  const canStart = library !== undefined && selectedInterfaceAddress !== '';
  const address = catalogAddress(status) ?? '';

  // Moves focus only on a genuine start/stop, never on mount - reopening the panel while sharing
  // is already active must not steal focus (share-menu.tsx already focuses the panel itself then).
  useEffect(() => {
    if (previousActive.current !== status.active) {
      if (status.active) shareUrlRef.current?.focus();
      else libraryButtonRef.current?.focus();
    }
    previousActive.current = status.active;
  }, [status.active]);

  return (
    <section
      aria-labelledby="share-title"
      className="border-border bg-surface rounded-xl border p-5"
    >
      <div className="flex items-center gap-2 pr-10">
        <RadioTower aria-hidden="true" className="text-accent size-4 shrink-0" />
        <h2 className="text-sm font-semibold" id="share-title">
          {words.title}
        </h2>
      </div>
      <Note className="mt-1">{words.intro}</Note>

      {status.active ? (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="share-url">{words.addressLabel}</Label>
            <div className="mt-1.5 flex gap-2">
              <Input id="share-url" readOnly ref={shareUrlRef} value={address} />
              <Button
                aria-label={words.copyAddress}
                onClick={() => {
                  void navigator.clipboard.writeText(address).then(
                    () => {
                      setCopied(true);
                    },
                    () => {
                      setCopied(false);
                    },
                  );
                }}
                size="sm"
                variant="outline"
              >
                <Copy /> {copied ? words.copied : words.copy}
              </Button>
            </div>
          </div>
          <Note>{words.inKoreader}</Note>
          <Button onClick={onStop} size="sm" variant="outline">
            {words.stop}
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button onClick={onChooseLibrary} ref={libraryButtonRef} size="sm" variant="outline">
              {library === undefined ? words.chooseLibrary : words.changeLibrary}
            </Button>
            {library !== undefined && (
              <span className="text-muted-foreground truncate text-xs">{library.displayPath}</span>
            )}
          </div>

          {interfaces.length === 0 ? (
            <Note>{words.noInterfaces}</Note>
          ) : (
            <div>
              <Label htmlFor="share-interface">{words.networkInterface}</Label>
              <NativeSelect
                id="share-interface"
                onChange={(event) => {
                  const selected = interfaces.find(
                    (option) => option.address === event.target.value,
                  );
                  if (selected !== undefined) {
                    setLocalInterfaceAddress(selected.address);
                    onSelectInterface?.(selected);
                  }
                }}
                value={selectedInterfaceAddress}
              >
                {interfaces.map((option) => (
                  <option key={option.address} value={option.address}>
                    {option.name} ({option.address})
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="share-username">{words.username}</Label>
              <Input
                id="share-username"
                onChange={(event) => {
                  setUsername(event.target.value);
                }}
                placeholder={words.noUsername}
                value={username}
              />
            </div>
            <div>
              <Label htmlFor="share-password">{words.password}</Label>
              <Input
                id="share-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                placeholder={words.noPassword}
                type="password"
                value={password}
              />
            </div>
          </div>
          <Note>{words.blankHint}</Note>

          <Button
            disabled={!canStart}
            onClick={() => {
              onStart(selectedInterfaceAddress, { username, password });
            }}
            size="sm"
          >
            {words.start}
          </Button>
        </div>
      )}
    </section>
  );
}
