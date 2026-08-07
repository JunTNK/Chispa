import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';
import { useSound } from '@/lib/awards/use-sound';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] text-[#241309] shadow-[0_8px_24px_rgba(255,122,61,0.28)] hover:shadow-[0_8px_32px_rgba(255,122,61,0.40)] hover:brightness-110',
        secondary: 'bg-[var(--card)] border border-[var(--line)] text-[var(--text)] hover:bg-[var(--card2)]',
        ghost: 'bg-transparent border border-[var(--line)] text-[var(--text)] hover:bg-[var(--card2)]',
        danger: 'bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] text-[var(--bad)] hover:bg-[rgba(248,113,113,0.18)]',
        minimal: 'bg-[var(--bg2)] border border-[var(--line)] text-[var(--muted)] hover:bg-[var(--card2)]',
      },
      size: {
        default: 'h-14 px-5',
        large: 'h-16 px-6 text-lg',
        sm: 'h-11 px-4 text-sm',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Disable hover/click sound effects */
  noSound?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, noSound = false, onMouseEnter, onClick, ...props }, ref) => {
    const { play } = useSound();
    const lastHoverRef = React.useRef(0);

    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
          onMouseEnter?.(e as any);
          if (noSound || e.defaultPrevented) return;
          const now = Date.now();
          if (now - lastHoverRef.current < 200) return;
          lastHoverRef.current = now;
          play('hover');
        }}
        onClick={(e: React.MouseEvent<HTMLElement>) => {
          onClick?.(e as any);
          if (noSound || e.defaultPrevented) return;
          play('click');
        }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
