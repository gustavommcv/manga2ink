import { cn } from '@/renderer/lib/utils';
import { panelId, tabId, type TabItem } from '@/renderer/components/ui/tabs';

/**
 * The list of the tabs of a dialog with a fixed size: a column on the left of the panel in a wide
 * window, a row above it in a narrow one. It is the ARIA tabs pattern (one tab in the tab order,
 * the arrow keys moving between them, Home and End jumping to the ends); both pairs of arrows work,
 * since the same list is drawn either way.
 */
export function SettingsNav<T extends string>({
  group,
  label,
  onChange,
  tabs,
  value,
}: {
  readonly group: string;
  readonly label: string;
  readonly onChange: (value: T) => void;
  readonly tabs: readonly TabItem<T>[];
  readonly value: T;
}): React.JSX.Element {
  const go = (index: number): void => {
    const target = tabs[(index + tabs.length) % tabs.length];
    if (target === undefined) return;
    onChange(target.id);
    document.getElementById(tabId(group, target.id))?.focus();
  };
  return (
    <div
      aria-label={label}
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-x-visible"
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            aria-controls={panelId(group, tab.id)}
            aria-selected={selected}
            className={cn(
              'focus-visible:ring-ring rounded-md px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2',
              selected
                ? 'bg-accent/15 text-accent'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            id={tabId(group, tab.id)}
            key={tab.id}
            onClick={() => {
              onChange(tab.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowRight') go(index + 1);
              else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') go(index - 1);
              else if (event.key === 'Home') go(0);
              else if (event.key === 'End') go(tabs.length - 1);
              else return;
              event.preventDefault();
            }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
