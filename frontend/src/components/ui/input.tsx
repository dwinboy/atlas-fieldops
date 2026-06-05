import { Check, ChevronDown } from "lucide-react";
import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-panel/95 px-2.5 text-xs text-foreground shadow-line transition-all duration-150 ease-product placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

type SelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type SelectChangeEvent = {
  target: {
    value: string;
  };
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "onChange" | "value" | "defaultValue"> & {
  children: ReactNode;
  defaultValue?: string;
  onChange?: (event: SelectChangeEvent) => void;
  value?: string;
};

function extractOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode; disabled?: boolean; value?: string }>;
    if (element.type === "option") {
      const label = Children.toArray(element.props.children).join("");
      options.push({
        disabled: element.props.disabled,
        label,
        value: String(element.props.value ?? label)
      });
    }
  });
  return options;
}

export function Select({ children, className, defaultValue, disabled, onChange, value, ...props }: SelectProps) {
  const generatedId = useId();
  const menuId = `${props.id ?? generatedId}-menu`;
  const rootRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => extractOptions(children), [children]);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? options.find((option) => option.value)?.value ?? "");
  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue) ?? options.find((option) => !option.disabled) ?? options[0];

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (selectedValue || !options.length) return;
    const firstEnabled = options.find((option) => !option.disabled);
    if (firstEnabled) {
      setInternalValue(firstEnabled.value);
    }
  }, [options, selectedValue]);

  function choose(option: SelectOption): void {
    if (option.disabled) return;
    setInternalValue(option.value);
    onChange?.({ target: { value: option.value } });
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        className={cn(inputClass, "flex items-center justify-between gap-2 text-left", disabled && "cursor-not-allowed opacity-50")}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        type="button"
      >
        <span className={cn("min-w-0 truncate", !selected?.value && "text-muted-foreground")}>{selected?.label || "Choose an option"}</span>
        <ChevronDown aria-hidden="true" className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} size={16} />
      </button>
      {open ? (
        <div
          className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border bg-panel p-1 shadow-elevated product-scrollbar"
          id={menuId}
          role="listbox"
        >
          {options.map((option) => {
            const active = option.value === selectedValue;
            return (
              <button
                aria-selected={active}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-muted",
                  active && "bg-primary/10 text-primary",
                  option.disabled && "cursor-not-allowed opacity-45"
                )}
                disabled={option.disabled}
                key={`${option.value}-${option.label}`}
                onClick={() => choose(option)}
                role="option"
                type="button"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {active ? <Check aria-hidden="true" size={15} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <select aria-hidden="true" className="hidden" disabled={disabled} tabIndex={-1} value={selectedValue} {...props} onChange={() => undefined}>
        {children}
      </select>
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-lg border border-input bg-panel/95 px-2.5 py-2 text-xs shadow-line transition-all duration-150 ease-product placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/15",
        className
      )}
      {...props}
    />
  );
}
