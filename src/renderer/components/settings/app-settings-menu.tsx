import { Settings, X } from 'lucide-react';
import { useState } from 'react';

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
import { panelId, TabList, tabId } from '@/renderer/components/ui/tabs';
import { useMessages } from '@/renderer/hooks/use-messages';

type Tabs = readonly [AppSettingsTab, ...AppSettingsTab[]];

const group = 'app-settings';

/** What is inside the dialog while it is open, so that it starts from the first tab each time. */
function AppSettingsContent({ tabs }: { readonly tabs: Tabs }): React.JSX.Element {
  const messages = useMessages();
  const words = messages.appSettings;
  const [selected, setSelected] = useState(tabs[0].id);
  // A row of tabs for one tab would only be in the way: it appears when there is a choice to make.
  const several = tabs.length > 1;

  return (
    <>
      <div className="border-border flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <DialogTitle>{words.title}</DialogTitle>
        <DialogClose asChild>
          <Button aria-label={words.close} size="icon" variant="ghost">
            <X />
          </Button>
        </DialogClose>
      </div>
      <DialogDescription className="sr-only">{words.description}</DialogDescription>
      <div className="space-y-5 p-5">
        {several && (
          <TabList
            group={group}
            label={words.sections}
            onChange={setSelected}
            tabs={tabs.map((tab) => ({ id: tab.id, label: tab.label(messages) }))}
            value={selected}
          />
        )}
        {tabs.map(
          (tab) =>
            tab.id === selected && (
              <div
                key={tab.id}
                {...(several
                  ? {
                      'aria-labelledby': tabId(group, tab.id),
                      id: panelId(group, tab.id),
                      role: 'tabpanel',
                    }
                  : {})}
              >
                <tab.Panel />
              </div>
            ),
        )}
      </div>
    </>
  );
}

/**
 * The gear on the title bar, and the dialog it opens (ADR 0052): what a person decides about the
 * app itself, a tab for each thing. It is a dialog and not a screen, so it adds nothing to where the
 * window is and can be opened from anywhere.
 */
export function AppSettingsMenu({
  tabs = appSettingsTabs,
}: {
  readonly tabs?: Tabs;
}): React.JSX.Element {
  const { appSettings: words } = useMessages();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button aria-label={words.open} className="size-8" size="icon" variant="outline">
          <Settings />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <AppSettingsContent tabs={tabs} />
      </DialogContent>
    </Dialog>
  );
}
