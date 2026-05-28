import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium tracking-normal transition-all duration-200 ease-product focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/10 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-elevated",
        secondary: "border-border/85 bg-panel/92 text-foreground shadow-line hover:-translate-y-0.5 hover:bg-muted/60 hover:shadow-sm",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        danger: "border-danger bg-danger text-white hover:bg-danger/90"
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3",
        lg: "h-10 px-4",
        icon: "h-9 w-9 px-0"
      }
    },
    defaultVariants: {
      variant: "secondary",
      size: "md"
    }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ asChild, className, size, type = "button", variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={asChild ? undefined : type} {...props} />;
}

export { buttonVariants };
