import type { ReactNode } from "react";

import { Button as PrimitiveButton, type ButtonProps as PrimitiveButtonProps } from "@/components/ui/button";

type ButtonProps = PrimitiveButtonProps & {
  icon?: ReactNode;
};

export function Button({ children, icon, ...props }: ButtonProps) {
  return (
    <PrimitiveButton {...props}>
      {icon}
      <span>{children}</span>
    </PrimitiveButton>
  );
}

