import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/renderer/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-default aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        outline: 'border border-border bg-surface text-foreground hover:bg-muted',
        ghost:
          'text-muted-foreground hover:bg-muted hover:text-foreground aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
      },
      size: {
        default: 'h-9 px-4 py-2 [--inset:1rem]',
        sm: 'h-8 rounded-sm px-3 text-xs [--inset:0.75rem]',
        lg: 'h-10 px-6 [--inset:1.5rem]',
        icon: 'size-9 [--inset:0.625rem]',
      },
      // Lines the text or icon of a quiet button up with the edge it is at, by setting the button's own
      // padding outside it: what a person sees of it is the glyph, and the hover reaches past (ADR 0074).
      flush: {
        start: '-ml-(--inset)',
        end: '-mr-(--inset)',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  asChild = false,
  className,
  flush,
  size,
  variant,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }): React.JSX.Element {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(buttonVariants({ className, flush, size, variant }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
