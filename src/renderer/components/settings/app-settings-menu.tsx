import { Settings, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  type AppSettingsTab,
  appSettingsTabs,
} from '@/renderer/components/settings/app-settings-tabs';
import { Button } from '@/renderer/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/renderer/components/ui/dialog';
import { SettingsNav } from '@/renderer/components/settings/app-settings-nav';
import { panelId, tabId } from '@/renderer/components/ui/tabs';
import { useAppInfo } from '@/renderer/hooks/use-app-info';
import { useMessages } from '@/renderer/hooks/use-messages';
import { settingsShortcut } from '@/renderer/lib/shortcuts';

type Tabs = readonly [AppSettingsTab, ...AppSettingsTab[]];

const group = 'app-settings';

/** What is inside the dialog while it is open, so that it starts from the first tab each time. */
function AppSettingsContent({ tabs }: { readonly tabs: Tabs }): React.JSX.Element {
  const messages = useMessages();
  const words = messages.appSettings;
  const [selected, setSelected] = useState(tabs[0].id);
  // A list of tabs for one tab would only be in the way: it appears when there is a choice to make.
  const several = tabs.length > 1;
  const current = tabs.find((tab) => tab.id === selected) ?? tabs[0];

  return (
    <>
      {several && (
        <div className="border-border bg-background/40 shrink-0 space-y-3 border-b p-3 md:w-56 md:border-r md:border-b-0 md:p-4">
          <DialogTitle className="text-muted-foreground px-3 text-xs font-semibold tracking-wide">
            {words.title}
          </DialogTitle>
          <SettingsNav
            group={group}
            label={words.sections}
            onChange={setSelected}
            tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label(messages) }))}
            value={selected}
          />
        </div>
      )}
      <DialogDescription className="sr-only">{words.description}</DialogDescription>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="border-border flex shrink-0 items-center justify-between gap-4 border-b px-6 py-3.5">
          {several ? (
            <h3 className="text-base font-semibold">{current.label(messages)}</h3>
          ) : (
            <DialogTitle>{words.title}</DialogTitle>
          )}
          <DialogClose asChild>
            <Button aria-label={words.close} size="icon" variant="ghost">
              <X />
            </Button>
          </DialogClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div
            key={current.id}
            {...(several
              ? {
                  'aria-labelledby': tabId(group, current.id),
                  id: panelId(group, current.id),
                  role: 'tabpanel',
                }
              : {})}
          >
            <current.Panel />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * The gear on the title bar, and the dialog it opens (ADR 0052): what a person decides about the
 * app itself, a tab for each thing, in a list beside the panel (ADR 0055). It is a dialog and not a
 * screen, so it adds nothing to where the window is and can be opened from anywhere. The keys that
 * open it (Ctrl+, or Cmd+,, ADR 0064) work wherever the focus is in the window, and are announced.
 */
export function AppSettingsMenu({
  onClose,
  tabs = appSettingsTabs,
}: {
  /** Told when the dialog is closed, so that what it may have changed is read again. */
  readonly onClose?: () => void;
  readonly tabs?: Tabs;
}): React.JSX.Element {
  const { appSettings: words } = useMessages();
  const { platform } = useAppInfo();
  const shortcut = useMemo(() => settingsShortcut(platform), [platform]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const listen = (event: KeyboardEvent): void => {
      if (!shortcut.matches(event)) return;
      event.preventDefault();
      // Pressed again while it is open, it stays open: it is a way in, not a switch.
      setOpen(true);
    };
    window.addEventListener('keydown', listen);
    return () => {
      window.removeEventListener('keydown', listen);
    };
  }, [shortcut]);

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClose?.();
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button
          aria-keyshortcuts={shortcut.announced}
          aria-label={words.open}
          className="size-8"
          size="icon"
          title={words.openTip(shortcut.label)}
          variant="outline"
        >
          <Settings />
        </Button>
      </DialogTrigger>
      {/*
        A size of its own (ADR 0055), so the dialog does not change with the tab. It is smaller only
        when the window is, and the list of tabs goes from a column beside the panel to a row above it.
      */}
      <DialogContent className="flex h-[38rem] w-[56rem] flex-col overflow-hidden md:flex-row">
        <AppSettingsContent tabs={tabs} />
      </DialogContent>
    </Dialog>
  );
}
