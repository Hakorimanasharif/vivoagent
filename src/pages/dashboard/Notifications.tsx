import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Bell, BellOff, Loader2, CheckCheck, User, Landmark, ArrowDownCircle,
  UserCheck, TrendingUp, Settings, Shield, Globe, Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "https://nexorabackend-eb0p.onrender.com";

const typeConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  all: { icon: Bell, color: "text-slate-600", bg: "bg-slate-50", label: "All" },
  deposit: { icon: Landmark, color: "text-emerald-600", bg: "bg-emerald-50", label: "Deposits" },
  withdrawal: { icon: ArrowDownCircle, color: "text-amber-600", bg: "bg-amber-50", label: "Withdrawals" },
  user: { icon: User, color: "text-blue-600", bg: "bg-blue-50", label: "Users" },
  agent: { icon: UserCheck, color: "text-cyan-600", bg: "bg-cyan-50", label: "Agents" },
  investor: { icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50", label: "Investors" },
  system: { icon: Settings, color: "text-slate-600", bg: "bg-slate-50", label: "System" },
  security: { icon: Shield, color: "text-red-600", bg: "bg-red-50", label: "Security" },
  broadcast: { icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50", label: "Broadcasts" },
  gift: { icon: Gift, color: "text-pink-600", bg: "bg-pink-50", label: "Gifts" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const cleanNotifText = (s: string) =>
  String(s || "")
    .replace(/Node\s+[\w.+-]+@[\w.-]+\.\w+/gi, "Client:")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const Notifications = () => {
  const agentToken = localStorage.getItem("agentToken") || "";
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["agent-notifications", page, typeFilter],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/notifications`);
      url.searchParams.append("page", String(page));
      url.searchParams.append("limit", "20");
      if (typeFilter !== "all") url.searchParams.append("type", typeFilter);
      const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${agentToken}` } });
      if (!r.ok) throw new Error("Failed to fetch notifications");
      return r.json();
    },
    enabled: !!agentToken,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${agentToken}` },
      });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("All marked as read");
      queryClient.invalidateQueries({ queryKey: ["agent-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["agent-notifications-stats"] });
      queryClient.invalidateQueries({ queryKey: ["agent-notifications-dropdown"] });
      void refetch();
    },
    onError: () => toast.error("Failed to mark all read"),
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${agentToken}` },
      });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["agent-notifications-stats"] });
      queryClient.invalidateQueries({ queryKey: ["agent-notifications-dropdown"] });
    },
  });

  const notifications: any[] = data?.notifications || [];
  const totalPages = data?.pagination?.totalPages || 1;
  const tabs = ["all", "deposit", "withdrawal", "system", "security"];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Notifications" breadcrumb="Notifications" />
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => {
          const cfg = typeConfig[t];
          const active = typeFilter === t;
          return (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={cn(
                "h-10 px-4 rounded-xl text-sm font-extrabold border transition-all flex items-center gap-2",
                active ? "bg-[#01152d] text-white border-[#01152d]" : "bg-background border-border hover:border-[#01152d]/40",
              )}
            >
              <cfg.icon className="h-4 w-4" />
              {cfg.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="h-10 rounded-xl text-xs font-bold"
          disabled={markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          {markAllRead.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCheck className="h-4 w-4 mr-1" />}
          Mark all read
        </Button>
      </div>

      <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading notifications…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
              <BellOff className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Deposit & withdrawal signals will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {notifications.map((n: any) => {
              const cfg = typeConfig[n.type] || typeConfig.system;
              const Icon = cfg.icon;
              return (
                <button
                  key={n._id}
                  onClick={() => { if (!n.isRead) markOneRead.mutate(n._id); }}
                  className={cn("w-full text-left flex items-start gap-3 px-3 py-3.5 hover:bg-muted/30 transition-colors rounded-xl", !n.isRead && "bg-primary/[0.03]")}
                >
                  <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5", cfg.bg)}>
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-bold leading-snug", !n.isRead ? "text-foreground" : "text-foreground/70")}>
                        {cleanNotifText(n.title)}
                      </p>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{cleanNotifText(n.message)}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1.5">{timeAgo(n.createdAt)} • {cfg.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <span className="text-xs font-bold text-muted-foreground tabular-nums">Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
