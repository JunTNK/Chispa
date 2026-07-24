import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-[#ffb454] to-[#ff7a3d] text-[#241309] shadow-[0_8px_24px_rgba(255,122,61,0.28)] hover:shadow-[0_8px_32px_rgba(255,122,61,0.40)] hover:brightness-110',
        secondary: 'bg-[#151b2a] border border-white/[.07] text-[#f2f5fc] hover:bg-white/[.10]',
        ghost: 'bg-transparent border border-white/[.07] text-[#f2f5fc] hover:bg-white/[.06]',
        danger: 'bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] text-[#f87171] hover:bg-[rgba(248,113,113,0.18)]',
        minimal: 'bg-white/[.06] border border-white/[.07] text-[#94a0b8] hover:bg-white/[.10]',
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
