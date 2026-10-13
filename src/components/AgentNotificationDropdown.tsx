import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, BellOff, Loader2, CheckCheck, Check, User, Landmark,
  ArrowDownCircle, UserCheck, TrendingUp, Settings, Shield, Globe, Gift,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "https://nexorabackend-eb0p.onrender.com";

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  user: { icon: User, color: "text-blue-600", bg: "bg-blue-50" },
  deposit: { icon: Landmark, color: "text-emerald-600", bg: "bg-emerald-50" },
  withdrawal: { icon: ArrowDownCircle, color: "text-amber-600", bg: "bg-amber-50" },
  agent: { icon: UserCheck, color: "text-cyan-600", bg: "bg-cyan-50" },
  investor: { icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
  system: { icon: Settings, color: "text-slate-600", bg: "bg-slate-50" },
  security: { icon: Shield, color: "text-red-600", bg: "bg-red-50" },
  broadcast: { icon: Globe, color: "text-indigo-600", bg: "bg-indigo-50" },
  gift: { icon: Gift, color: "text-pink-600", bg: "bg-pink-50" },
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

const AgentNotificationDropdown = ({ token }: { token?: string }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["agent-notifications-stats"],
    queryFn: async () => {
      if (!token) return { unread: 0 };
      const r = await fetch(`${API_BASE}/api/notifications/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return { unread: 0 };
      return r.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: notifData, isLoading } = useQuery({
    queryKey: ["agent-notifications-dropdown"],
    queryFn: async () => {
      if (!token) return { notifications: [] };
      const r = await fetch(`${API_BASE}/api/notifications?page=1&limit=8&isRead=false`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return { notifications: [] };
      return r.json();
    },
    enabled: !!token && open,
    staleTime: 10000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-notifications-stats"] });
      queryClient.invalidateQueries({ queryKey: ["agent-notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["agent-notifications"] });
    },
  });

  const unreadCount = stats?.unread || 0;
  const notifications = notifData?.notifications || [];

  // Phone-push status (agent endpoints under /api/agents/*)
  const [pushState, setPushState] = useState<"on" | "off-permission" | "off-backend" | "off-sub" | "unknown">("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const checkPush = async () => {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("off-permission");
        return;
      }
      if (Notification.permission !== "granted") {
        setPushState("off-permission");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setPushState("off-sub");
        return;
      }
      const kr = await fetch(`${API_BASE}/api/agents/push-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPushState(kr.ok ? "on" : "off-backend");
    } catch {
      setPushState("unknown");
    }
  };
  useEffect(() => {
    if (!open) return;
    setPushMsg("");
    void checkPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const enablePush = async () => {
    setPushBusy(true);
    setPushMsg("");
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushMsg("This browser does not support push.");
        return;
      }
      const p = await Notification.requestPermission();
      if (p !== "granted") {
        setPushMsg("Blocked — allow notifications in the address-bar site settings, then retry.");
        await checkPush();
        return;
      }
      try {
        window.dispatchEvent(new Event("nexora:agent-push-allowed"));
      } catch { /* ignore */ }
      const reg = await navigator.serviceWorker.ready;
      try {
        const old = await reg.pushManager.getSubscription();
        if (old) await old.unsubscribe();
      } catch { /* ignore */ }
      const kr = await fetch(`${API_BASE}/api/agents/push-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!kr.ok) {
        setPushMsg("Backend VAPID keys missing — ask admin to add them, then retry.");
        await checkPush();
        return;
      }
      const { publicKey } = await kr.json();
      if (!publicKey) {
        setPushMsg("Backend VAPID keys missing — ask admin to add them, then retry.");
        await checkPush();
        return;
      }
      const pad = (s: string) => s + "=".repeat((4 - (s.length % 4)) % 4);
      const raw = atob(pad(publicKey.replace(/-/g, "+").replace(/_/g, "/")));
      const key = new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const sr = await fetch(`${API_BASE}/api/agents/push-subscribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!sr.ok) throw new Error(`HTTP ${sr.status}`);
      setPushMsg("Enabled — close the tab and deposits / withdrawals will still buzz.");
      await checkPush();
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : "Enable failed — retry.");
    } finally {
      setPushBusy(false);
    }
  };

  const testPush = async () => {
    setPushBusy(true);
    setPushMsg("");
    try {
      const r = await fetch(`${API_BASE}/api/agents/push-test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((j as any).message || `HTTP ${r.status}`);
      setPushMsg("Test sent — close the tab, it should still buzz.");
    } catch (e) {
      setPushMsg(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 transition-transform group-hover:scale-110" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-[18px] min-w-[18px] bg-gradient-to-br from-red-500 to-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm shadow-red-500/40 ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] shadow-xl border border-border/80 rounded-xl overflow-hidden bg-card z-50">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Mark all read
              </Button>
            )}
          </div>

          <div className="px-4 py-2 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full shrink-0 ${pushState === "on" ? "bg-emerald-500" : pushState === "unknown" ? "bg-muted-foreground/40" : "bg-red-500"}`} />
              <p className="text-[11px] font-semibold text-muted-foreground flex-1">
                {pushState === "on"
                  ? "Phone push ON — deposits & withdrawals buzz with app closed"
                  : pushState === "off-permission"
                    ? "Phone push OFF — allow notifications in browser"
                    : pushState === "off-backend"
                      ? "Phone push OFF — VAPID keys missing on backend"
                      : pushState === "off-sub"
                        ? "Phone push OFF — this browser not registered"
                        : "Checking phone push…"}
              </p>
            </div>
            {pushState !== "on" && pushState !== "unknown" && (
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" className="h-7 text-[11px]" onClick={() => void enablePush()} disabled={pushBusy}>
                  {pushBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
                  Enable closed-app alerts
                </Button>
              </div>
            )}
            {pushState === "on" && (
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void testPush()} disabled={pushBusy}>
                  {pushBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Send test (close tab to verify)
                </Button>
              </div>
            )}
            {pushMsg && <p className="text-[11px] text-muted-foreground mt-1.5">{pushMsg}</p>}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <BellOff className="h-6 w-6 opacity-40" />
                </div>
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">No unread notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {notifications.map((n: any) => {
                  const cfg = typeConfig[n.type] || { icon: Bell, color: "text-muted-foreground", bg: "bg-muted/50" };
                  const Icon = cfg.icon;
                  return (
                    <div key={n._id} className={cn("flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors", !n.isRead && "bg-primary/[0.03]")}>
                      <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", cfg.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-medium leading-snug truncate", !n.isRead ? "text-foreground" : "text-foreground/80")}>
                            {cleanNotifText(n.title)}
                          </p>
                          {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{cleanNotifText(n.message)}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-border bg-muted/20">
            <button
              onClick={() => { setOpen(false); navigate("/dashboard/notifications"); }}
              className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors w-full"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentNotificationDropdown;
