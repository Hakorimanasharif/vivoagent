import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import {
  DollarSign, Clock, ArrowDownCircle, Users, Layers, TrendingUp, Bell,
  Menu, X, Shield, LogOut, LayoutDashboard, User, ChevronDown, ArrowUpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AgentNotificationDropdown from "@/components/AgentNotificationDropdown";
import AgentBrowserNotificationsBar from "@/components/AgentBrowserNotificationsBar";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://nexorabackend-eb0p.onrender.com';

const navSections = [
  {
    label: "Core",
    items: [
      { title: "Dashboard",           path: "/dashboard",                    icon: LayoutDashboard },
    ]
  },
  {
    label: "Operations",
    items: [
      { title: "Users",               path: "/dashboard/users",              icon: Users },
      { title: "Investors",           path: "/dashboard/investors",          icon: TrendingUp },
      { title: "Deposited Users",     path: "/dashboard/deposited-users",    icon: DollarSign },
      { title: "Withdrawn Users",     path: "/dashboard/withdrawn-users",    icon: ArrowUpCircle },
      { title: "Pending Deposits",    path: "/dashboard/pending-deposits",   icon: DollarSign, badge: "pending-deposits" },
      { title: "Pending Withdrawals", path: "/dashboard/pending-withdrawals", icon: ArrowDownCircle, badge: "pending-withdrawals" },
      { title: "Notifications",       path: "/dashboard/notifications",      icon: Bell, badge: "notifications" },
      { title: "Platform Tiers",      path: "/dashboard/user-tiers",         icon: Layers },
    ]
  },
  {
    label: "Account",
    items: [
      { title: "My Profile",          path: "/dashboard/profile",            icon: User },
    ]
  }
];

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentUser, setAgentUser] = useState<any>(null);
  const [agentToken, setAgentToken] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [currentTime, setCurrentTime] = useState(new Date());
  const seenAlertRef = useRef<Set<string>>(new Set());
  const bgAlertCount = useRef(0);
  const origTitle = useRef(typeof document !== 'undefined' ? document.title : 'Nexora Agent');

  useEffect(() => {
    const userStr = localStorage.getItem('agentUser');
    const token = localStorage.getItem('agentToken');
    if (!token) {
      navigate('/login');
      return;
    }
    if (userStr) {
      try { setAgentUser(JSON.parse(userStr)); } catch { /* ignore */ }
    }
    setAgentToken(token);

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pleasant deposit/withdrawal chime + vibration (background-tab safe)
  const playAlertSound = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const offset = i * 0.13;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.3, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.55);
      });
      setTimeout(() => void ctx.close().catch(() => {}), 1200);
    } catch { /* ignore */ }
    try {
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    } catch { /* ignore */ }
  };

  const flashTitle = (text: string) => {
    try {
      if (!document.hidden) return;
      bgAlertCount.current += 1;
      document.title = `(${bgAlertCount.current}) ${text}`;
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const reset = () => {
      bgAlertCount.current = 0;
      try { document.title = origTitle.current; } catch { /* ignore */ }
    };
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('focus', reset);
    return () => {
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('focus', reset);
    };
  }, []);

  const pushBrowserNotification = (title: string, body: string) => {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      const n = new Notification(title, { body, tag: `nexora-agent-${Date.now()}` });
      n.onclick = () => {
        try { window.focus(); } catch { /* ignore */ }
        n.close();
      };
      setTimeout(() => n.close(), 10000);
    } catch { /* ignore */ }
  };

  // Realtime deposit / withdrawal alerts — toast + browser notification + sound
  useEffect(() => {
    if (!agentToken) return;
    let s: Socket | null = null;
    try {
      s = io(API_BASE, {
        auth: { token: agentToken },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
      });
    } catch { return; }

    const handleAlert = (kind: string, payload: any) => {
      const notif = payload?.notification || payload || {};
      const deposit = payload?.deposit;
      const withdrawal = payload?.withdrawal;
      const dedupeId =
        String(notif?._id || deposit?.id || withdrawal?.id || `${kind}-${notif?.createdAt || Date.now()}`)
        + '|' + String(notif?.metadata?.step || '')
        + '|' + String(notif?.updatedAt || notif?.createdAt || '');
      if (seenAlertRef.current.has(dedupeId)) return;
      seenAlertRef.current.add(dedupeId);
      setTimeout(() => seenAlertRef.current.delete(dedupeId), 30000);

      void queryClient.invalidateQueries({ queryKey: ['agent-notifications-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['agent-notifications-dropdown'] });
      void queryClient.invalidateQueries({ queryKey: ['agent-notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-deposits-count'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-amount-groups'] });
      void queryClient.invalidateQueries({ queryKey: ['pending-wallet-counts'] });
      void queryClient.invalidateQueries({ queryKey: ['agent-dashboard-stats'] });

      const type = String(notif?.type || (deposit ? 'deposit' : withdrawal ? 'withdrawal' : kind)).toLowerCase();
      const isDeposit = type.includes('deposit') || kind.includes('deposit');
      const amount = Number(deposit?.amount ?? withdrawal?.amount ?? notif?.metadata?.amount ?? 0);
      const who = deposit?.user || withdrawal?.user || notif?.message || '';
      const title = isDeposit
        ? `New deposit${amount ? `: RWF ${amount.toLocaleString()}` : ''}`
        : `New withdrawal${amount ? `: RWF ${amount.toLocaleString()}` : ''}`;
      const description = typeof who === 'string' ? who.slice(0, 140) : 'A user just submitted a request.';

      toast.success(title, { description, duration: 8000 });
      playAlertSound();
      pushBrowserNotification(title, description);
      flashTitle(title);
    };

    s.on('new-notification', (p: any) => handleAlert('new-notification', p));
    s.on('new-deposit', (p: any) => handleAlert('new-deposit', p));
    s.on('new-withdrawal', (p: any) => handleAlert('new-withdrawal', p));
    s.on('new-investment', (p: any) => handleAlert('new-investment', p));

    return () => {
      try { s?.disconnect(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentToken]);

  // Phone push subscription (installed PWA, app closed) via agent endpoints
  const pushSubSent = useRef(false);
  const tryPushSubscribe = async () => {
    if (pushSubSent.current) return;
    if (!agentToken) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const syncSub = async (subJson: unknown) => {
        const r = await fetch(`${API_BASE}/api/agents/push-subscribe`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${agentToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subJson }),
        });
        if (!r.ok) throw new Error(`push-subscribe HTTP ${r.status}`);
        pushSubSent.current = true;
      };
      const kr = await fetch(`${API_BASE}/api/agents/push-key`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!kr.ok) return;
      const { publicKey } = await kr.json();
      if (!publicKey) return;
      const pad = (s: string) => s + '='.repeat((4 - (s.length % 4)) % 4);
      const raw = atob(pad(publicKey.replace(/-/g, '+').replace(/_/g, '/')));
      const key = new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
      const sameKey = (buf: ArrayBuffer | null) => {
        if (!buf) return false;
        const cur = new Uint8Array(buf);
        if (cur.length !== key.length) return false;
        for (let i = 0; i < cur.length; i++) if (cur[i] !== key[i]) return false;
        return true;
      };
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        if (sameKey(existing.options?.applicationServerKey as ArrayBuffer | null)) {
          await syncSub(existing.toJSON());
          return;
        }
        try { await existing.unsubscribe(); } catch { /* ignore */ }
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await syncSub(sub.toJSON());
    } catch {
      /* push unavailable — socket alerts still work while open */
    }
  };
  useEffect(() => {
    pushSubSent.current = false;
    void tryPushSubscribe();
    const retry = () => { void tryPushSubscribe(); };
    window.addEventListener('focus', retry);
    window.addEventListener('nexora:agent-push-allowed', retry);
    const id = window.setInterval(retry, 60000);
    return () => {
      window.removeEventListener('focus', retry);
      window.removeEventListener('nexora:agent-push-allowed', retry);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentToken]);

  // Unread badge
  const { data: notifStats } = useQuery({
    queryKey: ['agent-notifications-stats'],
    queryFn: async () => {
      if (!agentToken) return { unread: 0 };
      const r = await fetch(`${API_BASE}/api/notifications/stats`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!r.ok) return { unread: 0 };
      return r.json();
    },
    enabled: !!agentToken,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const unreadCount = notifStats?.unread || 0;

  // Pending deposits count for sidebar badge
  const { data: pendingDepositsData } = useQuery({
    queryKey: ['pending-deposits-count'],
    queryFn: async () => {
      if (!agentToken) return { count: 0 };
      const url = new URL(`${API_BASE}/api/transactions/pending`);
      url.searchParams.append('page', '1');
      url.searchParams.append('limit', '1');
      const r = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!r.ok) return { count: 0 };
      const j = await r.json();
      return { count: Number(j?.pagination?.totalDeposits ?? j?.deposits?.length ?? 0) };
    },
    enabled: !!agentToken,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Pending withdrawals count for sidebar badge
  const { data: pendingWithdrawalsData } = useQuery({
    queryKey: ['pending-withdrawals-count'],
    queryFn: async () => {
      if (!agentToken) return { count: 0 };
      const url = new URL(`${API_BASE}/api/withdrawals/pending`);
      url.searchParams.append('page', '1');
      url.searchParams.append('limit', '1');
      const r = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!r.ok) return { count: 0 };
      const j = await r.json();
      return { count: Number(j?.pagination?.totalWithdrawals ?? j?.withdrawals?.length ?? 0) };
    },
    enabled: !!agentToken,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const pendingDepositsCount = pendingDepositsData?.count || 0;
  const pendingWithdrawalsCount = pendingWithdrawalsData?.count || 0;

  const handleLogout = () => {
    localStorage.removeItem('agentToken');
    localStorage.removeItem('agentUser');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar (Nexora team style: deep green, like admin) */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex flex-col bg-gradient-to-b from-[#0a3d2e] to-[#04170f] text-white border-r border-white/10 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none overflow-hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl bg-[#C9A84C] flex items-center justify-center text-[#04170f] font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              N
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-none tracking-tight">NEXORA</h1>
              <p className="text-[10px] text-emerald-100/60 mt-1 font-bold uppercase tracking-widest">Agent Portal</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-9 h-9 grid place-items-center rounded-full text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-2">
              <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/50">
                {section.label}
              </h3>
              <div className="space-y-1">
                {(section.items as any[]).map((item) => {
                  const active = item.path === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.path);
                  const badgeCount =
                    (item as any).badge === "notifications"
                      ? unreadCount
                      : (item as any).badge === "pending-deposits"
                        ? pendingDepositsCount
                        : (item as any).badge === "pending-withdrawals"
                          ? pendingWithdrawalsCount
                          : 0;
                  const showBadge = !!(item as any).badge && badgeCount > 0;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-bold transition-all group relative overflow-hidden",
                        active
                          ? "bg-white text-[#0A2E1F] shadow-lg shadow-black/20"
                          : "text-emerald-100/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#C9A84C] rounded-r-full" />
                      )}
                      <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active && "animate-pulse")} />
                      <span className="flex-1 truncate">{item.title}</span>
                      {showBadge && (
                        <span className={cn(
                          "flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-black px-1.5 transition-all",
                          active ? "bg-[#0A2E1F] text-white" : "bg-red-500 text-white shadow-md"
                        )}>
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/10 transition-colors group">
            <div className="h-9 w-9 rounded-2xl bg-[#C9A84C] flex items-center justify-center text-[#04170f] font-black text-xs shadow-sm shrink-0">
              {agentUser?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{agentUser?.name || 'Agent'}</p>
              <p className="text-[10px] text-emerald-100/60 truncate">{agentUser?.email || 'agent@example.com'}</p>
            </div>
            <button
              className="w-8 h-8 grid place-items-center rounded-full text-emerald-100/60 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden xl:flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-500">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0B4D33]/10 rounded-full border border-[#0B4D33]/20">
              <div className="h-1.5 w-1.5 rounded-full bg-[#0B4D33] animate-pulse" />
              <span className="text-[10px] font-bold text-[#0B4D33] uppercase tracking-widest">Agent Mode</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground border-l border-border/50 pl-4 font-mono text-[11px] font-medium">
              <Clock className="h-3.5 w-3.5 text-primary/60" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Bell — deposit + withdrawal notifications with unread badge */}
          <AgentNotificationDropdown token={agentToken} />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-muted/50 p-2 rounded-xl transition-colors outline-none focus:ring-2 focus:ring-primary/20">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shadow-sm border border-primary/20">
                {agentUser?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <p className="text-sm font-bold leading-none">{agentUser?.name || 'Agent'}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Platform Agent</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl rounded-xl">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{agentUser?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {agentUser?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')} className="cursor-pointer gap-2">
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')} className="cursor-pointer gap-2">
                <Shield className="h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-2 text-red-500 focus:bg-red-50 focus:text-red-600">
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <AgentBrowserNotificationsBar />

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
