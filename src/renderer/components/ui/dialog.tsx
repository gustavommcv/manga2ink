import * as DialogPrimitive from '@radix-ui/react-dialog';
import type * as React from 'react';

import { cn } from '@/renderer/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

/**
 * A modal dialog in the middle of the window: the focus stays in it, Escape and a click outside put
 * it away, and the focus goes back to what opened it. The title bar is left as it is, so the window
 * can still be moved by it and the dialog's own button stays in sight.
 */
function DialogContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="bg-background/70 fixed inset-x-0 top-[env(titlebar-area-height,3rem)] bottom-0 z-40"
        data-slot="dialog-overlay"
      />
      <DialogPrimitive.Content
        className={cn(
          'border-border bg-surface text-foreground fixed top-[calc(50%+env(titlebar-area-height,3rem)/2)] left-1/2 z-50 max-h-[calc(100vh-env(titlebar-area-height,3rem)-2rem)] w-[30rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border outline-none',
          className,
        )}
        data-slot="dialog-content"
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>): React.JSX.Element {
  return (
    <DialogPrimitive.Title
      className={cn('text-base font-semibold', className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>): React.JSX.Element {
  return (
    <DialogPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger };
