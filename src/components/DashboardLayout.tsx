import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  DollarSign, Clock, ArrowDownCircle, Users, Layers,
  Menu, X, Search, Shield, LogOut, LayoutDashboard, User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_BASE = 'https://globalbackend-oqoz.onrender.com';

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
      { title: "Pending Deposits",    path: "/dashboard/pending-deposits",   icon: DollarSign },
      { title: "Pending Withdrawals", path: "/dashboard/pending-withdrawals", icon: ArrowDownCircle },
      { title: "User Tiers",          path: "/dashboard/user-tiers",         icon: Layers },
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
  const navigate = useNavigate();
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const userStr = localStorage.getItem('agentUser');
    const token = localStorage.getItem('agentToken');
    if (!token) {
      navigate('/login');
      return;
    }
    if (userStr) setAgentUser(JSON.parse(userStr));

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between border-b border-sidebar-border/30">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-black text-sidebar-foreground leading-none tracking-tight">CASHGROW</h1>
              <p className="text-[10px] text-sidebar-foreground/40 mt-1 font-bold uppercase tracking-widest">Agent Portal</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-border/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-2">
              <h3 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-sidebar-foreground/30">
                {section.label}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = item.path === "/dashboard"
                    ? location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group relative overflow-hidden",
                        active
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-border/40 hover:text-sidebar-foreground"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-foreground rounded-r-full" />
                      )}
                      <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active && "animate-pulse")} />
                      <span className="flex-1 truncate">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-border/50 transition-colors group">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-sm shrink-0">
              {agentUser?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{agentUser?.name || 'Agent'}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{agentUser?.email || 'agent@example.com'}</p>
            </div>
            <button
              className="p-1.5 rounded-lg text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Agent Mode</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground border-l border-border/50 pl-4 font-mono text-[11px] font-medium">
              <Clock className="h-3.5 w-3.5 text-primary/60" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {agentUser?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold">{agentUser?.name || 'Agent'}</p>
              <p className="text-[10px] text-muted-foreground">Agent</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
