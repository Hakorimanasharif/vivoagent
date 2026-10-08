import { useState } from "react";
import { LucideIcon, TrendingUp, TrendingDown, Maximize2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type StatTone = "navy" | "green" | "gold" | "red";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  tone?: StatTone;
  onClick?: () => void;
  className?: string;
  /** @deprecated kept for backward compat — mapped to a tone, system theme is used instead */
  gradient?: string;
  /** @deprecated kept for backward compat — ignored */
  variant?: "outline" | "gradient";
}

const toneStyles: Record<StatTone, string> = {
  navy: "bg-[#0A2E1F] text-white",
  green: "bg-[#0B4D33] text-white",
  gold: "bg-[#C9A84C] text-[#04170f]",
  red: "bg-red-500 text-white",
};

// Legacy gradient strings (blue/indigo/emerald/amber/rose/…) map onto tones
// so older call sites keep their color meaning with zero edits.
const toneFromLegacyGradient = (gradient?: string): StatTone | null => {
  const g = String(gradient || "").toLowerCase();
  if (!g) return null;
  if (/(rose|red|pink)/.test(g)) return "red";
  if (/(amber|yellow|gold|orange)/.test(g)) return "gold";
  if (/(emerald|green|teal)/.test(g)) return "green";
  return "navy";
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  tone,
  gradient,
  onClick,
  className = "",
}: StatCardProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const resolvedTone: StatTone = tone || toneFromLegacyGradient(gradient) || "navy";
  const valueStr = value?.toString() || "";
  const isLong = valueStr.length > 12;

  const handleCopy = () => {
    navigator.clipboard.writeText(valueStr);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => {
        if (onClick) onClick();
      }}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-white bg-white/85",
        "p-4 sm:p-5 grid gap-1.5 sm:gap-2 content-start min-w-0 shadow-sm transition-all",
        "hover:border-[#BFD9C7] hover:shadow-lg hover:shadow-emerald-900/10 active:scale-[0.99]",
        onClick ? "cursor-pointer" : "",
        className
      )}
    >
      {/* Top row: icon + title — Nexora system style */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <span className={cn(
          "w-10 h-10 sm:w-[38px] sm:h-[38px] inline-grid place-items-center rounded-2xl shrink-0",
          toneStyles[resolvedTone]
        )}>
          <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.5} />
        </span>
        <span className="text-xs sm:text-[13px] font-bold text-[#3E6B57] whitespace-nowrap overflow-hidden text-ellipsis">
          {title}
        </span>
      </div>

      {/* Value */}
      <div className="flex items-center gap-2 overflow-hidden">
        <h3 className="text-lg sm:text-[26px] font-extrabold tracking-tight leading-none text-slate-900 truncate flex-1">
          {value}
        </h3>

        {isLong && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <div
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all w-9 h-9 grid place-items-center rounded-full hover:bg-[#F4F8F5]"
              >
                <Maximize2 className="h-4 w-4" />
              </div>
            </DialogTrigger>
            <DialogContent className="rounded-3xl border border-white shadow-2xl p-6 max-w-sm bg-white">
              <DialogHeader>
                <DialogTitle className="text-xs font-bold uppercase tracking-widest text-[#3E6B57] mb-4">
                  {title}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Full value for {title}.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center gap-6 py-2">
                <div className="p-8 rounded-2xl w-full text-center border border-[#D7E8DC] bg-[#F4F8F5]">
                  <h2 className="text-4xl font-extrabold tracking-tight break-all">
                    {value}
                  </h2>
                </div>
                <Button
                  variant="default"
                  className="gap-2 rounded-2xl h-12 px-8 font-extrabold text-xs uppercase tracking-widest"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy value"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Trend / sub */}
      {trend && (
        <small className={cn(
          "text-xs sm:text-[13px] font-semibold truncate",
          trendUp ? "text-emerald-700" : "text-muted-foreground"
        )}>
          <span className="inline-flex items-center gap-1">
            {trendUp !== undefined && (
              trendUp
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />
            )}
            {trend}
          </span>
        </small>
      )}
    </div>
  );
};

export default StatCard;
