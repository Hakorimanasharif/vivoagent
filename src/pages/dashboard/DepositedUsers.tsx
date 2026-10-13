import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import SmartPagination from "@/components/SmartPagination";
import { Input } from "@/components/ui/input";
import { DollarSign, Users, TrendingUp, ArrowUpRight, Search, Wallet } from "lucide-react";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://nexorabackend-eb0p.onrender.com';

// Full timestamp with hrs:min:sec
const formatDateTime = (iso: string | Date | null | undefined) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return new Date(iso as any).toLocaleString();
  }
};

const columns: any[] = [
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }: any) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-[10px] bg-[#01152d] text-white flex items-center justify-center font-extrabold text-xs shrink-0 uppercase">
          {(row.name || 'U')?.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{row.name}</p>
          <p className="text-[11px] text-muted-foreground truncate tabular-nums">{row.phone || '—'}</p>
        </div>
      </div>
    )
  },
  { accessorKey: "phone", header: "Phone", cell: ({ row }: any) => <span className="font-semibold text-sm tabular-nums">{row.phone}</span> },
  {
    accessorKey: "totalDeposits",
    header: "Total Deposited",
    cell: ({ row }: any) => <span className="font-extrabold tabular-nums text-emerald-700">RWF {Number(row.totalDeposits || 0).toLocaleString()}</span>
  },
  { accessorKey: "depositCount", header: "Count", cell: ({ row }: any) => <span className="font-bold tabular-nums">{row.depositCount}</span> },
  {
    accessorKey: "lastDepositDate",
    header: "Last Deposit (date + time)",
    cell: ({ row }: any) => <span className="text-xs text-muted-foreground font-semibold tabular-nums whitespace-nowrap">{formatDateTime(row.lastDepositDateRaw)}</span>
  },
];


const DepositedUsers = () => {
  const [agentToken] = useState(localStorage.getItem('agentToken') || '');
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: depositedUsersData, isLoading: isLoadingDeposited } = useQuery({
    queryKey: ['deposited-users', page, search],
    queryFn: async () => {
      if (!agentToken) throw new Error('No token');
      const url = new URL(`${API_BASE}/api/users/deposited`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      if (search) url.searchParams.append('search', search);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch deposited users');
      return response.json();
    },
    enabled: !!agentToken,
  });

  const { data: depositedStatsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['deposited-users-stats'],
    queryFn: async () => {
      if (!agentToken) throw new Error('No token');
      const response = await fetch(`${API_BASE}/api/users/deposited/stats/overview`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch deposited users stats');
      return response.json();
    },
    enabled: !!agentToken,
  });

  const rawTable = depositedUsersData?.users || [];
  const pagination = {
    currentPage: depositedUsersData?.pagination?.currentPage || page,
    totalPages: depositedUsersData?.pagination?.totalPages || 1,
    onPageChange: setPage,
  };

  const stats = {
    totalDeposited: depositedStatsData?.totalDeposits || 0,
    depositCount: depositedStatsData?.totalDepositedUsers || 0,
    avgDeposit: depositedStatsData?.avgDepositsPerUser || 0,
    activeDepositedUsers: depositedStatsData?.activeDepositedUsers || 0,
  };

  const filteredData = rawTable
    .filter((row: any) =>
      (row.name?.toLowerCase().includes(search.toLowerCase()) ||
        row.phone?.toLowerCase().includes(search.toLowerCase()) ||
        row.email?.toLowerCase().includes(search.toLowerCase()))
    )
    .map((row: any) => ({
      ...row,
      lastDepositDateRaw: row.lastDepositDate,
      lastDepositDate: formatDateTime(row.lastDepositDate),
    }));

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Deposited Users" breadcrumb="Deposited Users" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Deposited"
          value={stats.totalDeposited ? `RWF ${stats.totalDeposited.toLocaleString()}` : '—'}
          icon={DollarSign}
          tone="green"
        />
        <StatCard
          title="Deposited Users"
          value={stats.depositCount?.toLocaleString() || '—'}
          icon={Users}
          tone="navy"
        />
        <StatCard
          title="Avg Deposit"
          value={stats.avgDeposit ? `RWF ${stats.avgDeposit.toLocaleString()}` : '—'}
          icon={TrendingUp}
          tone="gold"
        />
        <StatCard
          title="Active Depositors"
          value={stats.activeDepositedUsers?.toLocaleString() || '—'}
          icon={ArrowUpRight}
          tone="red"
        />
      </div>
      <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-sm min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-[38px] h-[38px] inline-grid place-items-center rounded-[11px] bg-[#178A52] text-white shrink-0">
              <Wallet className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15.5px] font-extrabold leading-tight">Depositors</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Everyone who has deposited — with full date & time (hrs:min:sec)</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search users…"
              className="pl-10 h-11 rounded-xl bg-muted/30 font-semibold"
            />
          </div>
        </div>
        <div className="w-full max-w-full overflow-hidden border border-border/60 rounded-xl">
          <DataTable
            columns={columns}
            data={filteredData}
            loading={isLoadingDeposited || isLoadingStats}
            pagination={pagination}
          />
        </div>
        <div className="mt-4">
          <SmartPagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
};

export default DepositedUsers;
