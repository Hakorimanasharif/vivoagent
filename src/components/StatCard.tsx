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

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  gradient?: string;
  onClick?: () => void;
  className?: string;
  variant?: "outline" | "gradient";
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  gradient = "from-primary/20 to-primary/5",
  onClick,
  className = "",
  variant = "outline",
}: StatCardProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isGradient = variant === "gradient";
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
      onClick={(e) => {
        if (onClick) onClick();
      }}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border-0 transition-all duration-500 ease-out",
        "p-5 flex items-center gap-5 shadow-xl shadow-foreground/[0.02] hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 active:scale-98",
        "ring-1 ring-border/40 hover:ring-primary/30",
        onClick ? "cursor-pointer" : "",
        isGradient 
          ? `bg-gradient-to-br ${gradient} text-white backdrop-blur-xl` 
          : "bg-card/40 backdrop-blur-md text-card-foreground",
        className
      )}
    >
      {/* ── Internal Glow Layer (Quantum Soul) ── */}
      <div className={cn(
        "absolute -right-6 -top-6 h-32 w-32 rounded-full blur-[40px] opacity-20 transition-all duration-700 group-hover:opacity-40 group-hover:scale-125",
        isGradient ? "bg-white" : "bg-primary"
      )} />
      
      {/* ── Icon Container: The "Stellar" Float ── */}
      <div
        className={cn(
          "shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-700 relative z-10",
          "shadow-2xl shadow-black/10 group-hover:shadow-primary/20",
          "group-hover:-translate-y-1.5 group-hover:rotate-6 group-hover:scale-110",
          isGradient 
            ? "bg-white/10 backdrop-blur-xl border border-white/30 text-white" 
            : `bg-gradient-to-br ${gradient} border border-primary/10 text-primary`
        )}
      >
        <Icon className="h-7 w-7 transition-transform duration-500" strokeWidth={2.5} />
        {/* Glow behind icon */}
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* ── Content: High-Fidelity Typography ── */}
      <div className="flex-1 min-w-0 relative z-10 space-y-0.5">
        <p className={cn(
          "text-[10px] font-black uppercase tracking-[0.2em] mb-1 truncate opacity-60 transition-colors",
          isGradient ? "text-white/80 group-hover:text-white" : "text-muted-foreground group-hover:text-primary"
        )}>
          {title}
        </p>
        
        <div className="flex items-center gap-2 overflow-hidden">
          <h3 className="text-2xl font-black leading-none tracking-tighter truncate flex-1 drop-shadow-sm">
            {value}
          </h3>
          
          {isLong && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-white/20 bg-black/5"
                >
                  <Maximize2 className="h-4 w-4" />
                </div>
              </DialogTrigger>
              <DialogContent className="rounded-[32px] border-0 shadow-3xl p-8 max-w-sm bg-card/90 backdrop-blur-3xl ring-1 ring-border/50">
                <DialogHeader>
                  <DialogTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">
                    Nexus Metric Data
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Detailed telemetry and high-fidelity metric visualization for {title}.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center gap-8 py-2">
                  <div className={cn(
                    "p-12 rounded-[32px] w-full text-center border shadow-2xl relative overflow-hidden group/modal",
                    isGradient ? `bg-gradient-to-br ${gradient} text-white` : "bg-muted/30"
                  )}>
                    <div className="absolute top-0 right-0 w-full h-full bg-white/5 opacity-0 group-hover/modal:opacity-100 transition-opacity" />
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter break-all relative z-10">
                      {value}
                    </h2>
                  </div>
                  <Button 
                    variant="default" 
                    className="gap-3 rounded-2xl h-14 px-10 font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all"
                    onClick={handleCopy}
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    {copied ? "Telemetry Copied" : "Copy Telemetry"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {trend && (
            <div className={cn(
                "flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-wider transition-all",
                isGradient 
                    ? "text-white/95" 
                    : (trendUp ? "text-emerald-600" : "text-rose-500")
            )}>
                <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full shadow-sm ring-1 ring-inset",
                    isGradient ? "bg-white/10 ring-white/20" : (trendUp ? "bg-emerald-500/10 ring-emerald-500/20" : "bg-rose-500/10 ring-rose-500/20")
                )}>
                    {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trend}
                </div>
            </div>
        )}
      </div>

      {/* ── Sub-Glow (Quantum Trace) ── */}
      {!isGradient && (
        <div className="absolute -bottom-2 -left-2 h-16 w-16 bg-primary/5 rounded-full blur-[30px] transition-all group-hover:bg-primary/10 group-hover:blur-[40px]" />
      )}
    </div>
  );
};

export default StatCard;
