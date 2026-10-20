import type React from 'react';

/**
 * What is under the title bar (ADR 0080): the area that scrolls, with the page in it, as wide as the
 * window gives up to 72 rem and 32 px from its sides and from the bar. The line under the bar is this
 * area's top edge: see Titlebar for why it is not the bar's.
 */
export function Page({ children }: { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="border-border min-h-0 flex-1 overflow-y-auto border-t" data-slot="page">
      <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
    </div>
  );
}
