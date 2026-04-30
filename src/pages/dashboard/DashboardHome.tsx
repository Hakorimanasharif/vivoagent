import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import {
  Users, DollarSign, ArrowUpCircle, TrendingUp, ArrowDownCircle,
  Activity, Clock, Banknote, CheckCircle2
} from "lucide-react";

const API_BASE = 'https://globalbackend-oqoz.onrender.com';

const activityMeta: Record<string, { color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  deposit: { color: "text-emerald-600", bg: "bg-emerald-50", Icon: Banknote },
  withdrawal: { color: "text-amber-600", bg: "bg-amber-50", Icon: ArrowUpCircle },
};

const DashboardHome = () => {
  const [agentToken, setAgentToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const tok = localStorage.getItem('agentToken');
    if (tok) setAgentToken(tok);
    else navigate('/login');
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['agent-dashboard-stats'],
    queryFn: async () => {
      if (!agentToken) throw new Error('No token');
      const response = await fetch(`${API_BASE}/api/agents/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${agentToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
    enabled: !!agentToken,
    refetchInterval: 30000,
  });

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffHrs / 24)} day${Math.floor(diffHrs / 24) > 1 ? 's' : ''} ago`;
  };

  const activities = (data?.recentTransactions || []).slice(0, 8).map((txn: any) => ({
    type: txn.type,
    action: `${txn.type?.charAt(0).toUpperCase() + txn.type?.slice(1) || 'Transaction'} of RWF ${txn.amount?.toLocaleString() || 0}`,
    user: txn.user?.name || txn.user?.email || 'Unknown User',
    amount: txn.amount ? `RWF ${txn.amount.toLocaleString()}` : undefined,
    time: getTimeAgo(txn.createdAt),
    status: txn.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Agent Dashboard" breadcrumb="Overview" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={data?.totalUsers?.toLocaleString() || '—'}
          icon={Users}
          variant="gradient"
          gradient="from-blue-600 to-blue-700"
        />
        <StatCard
          title="Total Investors"
          value={data?.totalInvestors?.toLocaleString() || '—'}
          icon={TrendingUp}
          variant="gradient"
          gradient="from-indigo-600 to-indigo-700"
        />
        <StatCard
          title="Pending Deposits"
          value={`${data?.pendingDeposits?.toLocaleString() ?? '0'} pending`}
          icon={DollarSign}
          variant="gradient"
          gradient="from-emerald-600 to-emerald-700"
          onClick={() => navigate('/dashboard/pending-deposits')}
        />
        <StatCard
          title="Pending Withdrawals"
          value={`${data?.pendingWithdrawals?.toLocaleString() ?? '0'} pending`}
          icon={ArrowDownCircle}
          variant="gradient"
          gradient="from-amber-600 to-amber-700"
          onClick={() => navigate('/dashboard/pending-withdrawals')}
        />
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Deposits"
          value={data?.totalDepositsAmount ? `RWF ${data.totalDepositsAmount.toLocaleString()}` : '—'}
          icon={Banknote}
          variant="gradient"
          gradient="from-teal-600 to-teal-700"
        />
        <StatCard
          title="Total Withdrawals"
          value={data?.totalWithdrawalsAmount ? `RWF ${data.totalWithdrawalsAmount.toLocaleString()}` : '—'}
          icon={ArrowUpCircle}
          variant="gradient"
          gradient="from-rose-600 to-rose-700"
        />
        <StatCard
          title="Today's Deposits"
          value={data?.todayDeposits?.toString() || '0'}
          icon={CheckCircle2}
          variant="gradient"
          gradient="from-cyan-600 to-cyan-700"
        />
        <StatCard
          title="Today's Withdrawals"
          value={data?.todayWithdrawals?.toString() || '0'}
          icon={Clock}
          variant="gradient"
          gradient="from-orange-600 to-orange-700"
        />
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest deposits & withdrawals</p>
          </div>
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Live</span>
        </div>

        <div className="space-y-2 min-h-[200px]">
          {isLoading ? (
            Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 animate-pulse h-[52px]" />
            ))
          ) : activities.length > 0 ? (
            activities.map((item: any, i: number) => {
              const meta = activityMeta[item.type as keyof typeof activityMeta];
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors duration-150"
                >
                  <div className={`shrink-0 h-8 w-8 rounded-lg ${meta?.bg || 'bg-muted'} flex items-center justify-center`}>
                    {meta?.Icon ? <meta.Icon className={`h-3.5 w-3.5 ${meta.color}`} strokeWidth={2.5} /> : <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1">{item.action}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{item.user}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                      item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {item.status}
                    </span>
                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{item.time}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
              <Activity className="h-12 w-12 opacity-40 mx-auto" strokeWidth={1} />
              <p className="text-sm font-medium">No recent activity</p>
              <p className="text-xs opacity-75">Transactions will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
