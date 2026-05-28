import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-panel/95 px-3 text-sm text-foreground shadow-line transition-all duration-150 ease-product placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-input bg-panel/95 px-3 py-2 text-sm shadow-line transition-all duration-150 ease-product placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/15",
        className
      )}
      {...props}
    />
  );
}
