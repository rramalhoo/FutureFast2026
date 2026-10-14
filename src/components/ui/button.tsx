import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[0.875rem] font-medium transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98] [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_6px_16px_-6px_rgb(125_53_165/0.55)] hover:bg-primary-hover hover:shadow-glow",
        secondary: "bg-surface text-foreground-strong border border-border shadow-xs hover:border-border-strong hover:bg-surface-muted",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-[color-mix(in_oklab,var(--primary-soft)_80%,var(--primary)_20%)]",
        ghost: "text-foreground hover:bg-surface-sunken hover:text-foreground-strong",
        outline: "border border-primary/40 text-primary hover:bg-primary-soft",
        danger: "bg-danger text-white hover:brightness-95 shadow-[0_6px_16px_-8px_rgb(208_69_76/0.6)]",
        "danger-soft": "bg-danger-soft text-danger-foreground hover:brightness-[0.97]",
        success: "bg-success text-white hover:brightness-95",
        link: "h-auto rounded-sm p-0 text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-[0.9375rem]",
        lg: "h-13 px-7 text-base",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
      },
      block: { true: "w-full" },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({ className, variant, size, block, asChild, loading, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}
