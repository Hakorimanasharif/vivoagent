import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  items: { value: string; label: string }[];
  registerItem: (item: { value: string; label: string }) => () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used inside <Select>");
  return ctx;
}

const Select = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
  }
>(({ value: controlledValue, onValueChange, defaultValue, className, children, ...props }, ref) => {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<{ value: string; label: string }[]>([]);
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const registerItem = React.useCallback((item: { value: string; label: string }) => {
    setItems(prev => {
      const existing = prev.findIndex(i => i.value === item.value);
      if (existing !== -1) {
        const copy = [...prev];
        copy[existing] = item;
        return copy;
      }
      return [...prev, item];
    });
    return () => setItems(prev => prev.filter(i => i.value !== item.value));
  }, []);

  const ctx = React.useMemo<SelectContextValue>(
    () => ({
      value,
      onValueChange,
      items,
      registerItem,
      open,
      setOpen,
    }),
    [value, onValueChange, items, registerItem, open],
  );

  return (
    <SelectContext.Provider value={ctx}>
      <div ref={ref} className={cn("relative", className)} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
});
Select.displayName = "Select";

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const ctx = useSelectContext();
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="listbox"
      aria-expanded={ctx.open}
      onClick={e => {
        e.preventDefault();
        ctx.setOpen(!ctx.open);
      }}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ placeholder, ...props }, ref) => {
  const ctx = useSelectContext();
  const selected = ctx.items.find(i => i.value === ctx.value);
  return (
    <span ref={ref} className={cn("truncate", !selected && "text-muted-foreground", props.className)} {...props}>
      {selected ? selected.label : placeholder}
    </span>
  );
});
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = useSelectContext();
    if (!ctx.open) return null;
    return (
      <div
        ref={ref}
        role="listbox"
        className={cn(
          "absolute left-0 right-0 top-full z-50 mt-1 max-h-72 min-w-[8rem] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, children, value, ...props }, ref) => {
  const ctx = useSelectContext();
  const label = typeof children === "string" ? children : value;

  React.useEffect(() => {
    return ctx.registerItem({ value, label });
  }, [value, label, ctx.registerItem]);

  const selected = ctx.value === value;

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        ctx.onValueChange?.(value);
        ctx.setOpen(false);
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent",
        selected && "font-semibold",
        className,
      )}
      {...props}
    >
      {children}
      {selected && <Check className="absolute right-2 h-4 w-4" />}
    </button>
  );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };