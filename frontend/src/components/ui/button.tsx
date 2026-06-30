import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold tracking-normal transition-all duration-200 ease-product focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/18 hover:-translate-y-0.5 hover:bg-primary/92 hover:shadow-elevated",
        secondary:
          "border-border/90 bg-panel/95 text-foreground shadow-line hover:-translate-y-0.5 hover:border-primary/20 hover:bg-muted/55 hover:shadow-sm",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted/65 hover:text-foreground",
        danger:
          "border-danger bg-danger text-white shadow-sm shadow-danger/18 hover:-translate-y-0.5 hover:bg-danger/90",
      },
      size: {
        sm: "h-7 px-2 text-[11px]",
        md: "h-9 px-3",
        lg: "h-10 px-3.5 text-sm",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild, className, size, type = "button", variant, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  );
});

export { buttonVariants };
