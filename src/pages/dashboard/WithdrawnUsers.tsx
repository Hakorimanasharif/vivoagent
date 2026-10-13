import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import SmartPagination from "@/components/SmartPagination";
import { Input } from "@/components/ui/input";
import { ArrowUpCircle, DollarSign, Users, Search, Briefcase, HandCoins, Gift } from "lucide-react";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://nexorabackend-eb0p.onrender.com';

const WALLET_LABEL: Record<string, string> = {
  investment: 'Umwuga',
  claim: 'Akazi',
  commission: 'Commission',
  luck: 'Bonus',
};

// Full timestamp with hrs:min:sec
const formatDateTime = (iso: string | Date | null | undefined) => {
  if (!iso) return 'N/A';
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

const getProviderLogo = (method: string) => {
  const m = method?.toLowerCase();
  if (m === 'mtn' || m?.includes('mtn')) return "https://i.pinimg.com/1200x/0a/f0/0e/0af00e1d78100d4019d3344873902d5a.jpg";
  if (m === 'airtel' || m?.includes('airtel')) return "https://i.pinimg.com/736x/68/7c/cf/687ccf6f9a7987377f8eec6aba64e409.jpg";
  return null;
};

const WithdrawnUsers = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const agentToken = localStorage.getItem('agentToken') || '';

  // 4 wallet cards — even gradient cards, same 4 wallets + colors as Nexora
  const [walletTab, setWalletTab] = useState<'investment' | 'claim' | 'commission' | 'luck'>('investment');
  const walletTabs = [
    { id: 'investment' as const, label: 'Umwuga', card: 'bg-gradient-to-br from-indigo-500 to-indigo-800', Icon: Briefcase },
    { id: 'claim' as const, label: 'Akazi', card: 'bg-gradient-to-br from-emerald-500 to-emerald-800', Icon: HandCoins },
    { id: 'commission' as const, label: 'Commission', card: 'bg-gradient-to-br from-amber-500 to-orange-700', Icon: Users },
    { id: 'luck' as const, label: 'Bonus', card: 'bg-gradient-to-br from-fuchsia-500 to-purple-800', Icon: Gift },
  ];

  const columns = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] bg-[#01152d] text-white flex items-center justify-center font-extrabold text-xs shrink-0 uppercase">
            {(row?.name || 'U')?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{row?.name}</p>
            <p className="text-[10px] text-muted-foreground truncate tabular-nums">{row?.phone}</p>
          </div>
        </div>
      )
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }: any) => <span className="tabular-nums text-muted-foreground">{row.phone}</span> },
    {
      accessorKey: "totalWithdrawn",
      header: `Total Withdrawn (${WALLET_LABEL[walletTab]})`,
      cell: ({ row }: any) => (
        <span className="font-extrabold tabular-nums text-emerald-700">{row?.totalWithdrawn}</span>
      )
    },
    {
      accessorKey: "withdrawnCount",
      header: "Count",
      cell: ({ row }: any) => (
        <span className="font-bold tabular-nums">{row?.withdrawnCount}</span>
      )
    },
    {
      accessorKey: "wallet",
      header: "From",
      cell: ({ row }: any) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#01152d] text-white">
          {row?.wallet}
        </span>
      )
    },
    {
      accessorKey: "amount",
      header: "Latest Amount",
      cell: ({ row }: any) => (
        <span className="font-extrabold tabular-nums text-emerald-700">{row?.amount}</span>
      )
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }: any) => {
        const logo = getProviderLogo(row.method);
        return logo ? (
          <div className="flex items-center justify-center">
            <img src={logo} alt={row.method} className="h-8 w-8 object-cover rounded-full shadow-md border-2 border-background" />
          </div>
        ) : (
          <span className="text-xs font-medium uppercase text-muted-foreground">{row.method}</span>
        );
      }
    },
    { accessorKey: "date", header: "Latest Date + Time", cell: ({ row }: any) => <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{row.date}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }: any) => <StatusBadge status={row?.status || 'completed'} /> },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['withdrawn-users', page, search, walletTab],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/users/withdrawn`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      url.searchParams.append('wallet', walletTab);
      if (search) url.searchParams.append('search', search);

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch withdrawn users');
      return response.json();
    },
    keepPreviousData: true,
    enabled: !!agentToken,
  });

  const { data: walletCountsData } = useQuery({
    queryKey: ['withdrawn-wallet-counts'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/users/withdrawn/by-wallet`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch wallet counts');
      return response.json();
    },
    enabled: !!agentToken,
    refetchInterval: 30000,
  });
  const walletCounts = walletCountsData?.counts || { investment: 0, claim: 0, commission: 0, luck: 0 };

  const pickWallet = (w: typeof walletTab) => {
    setWalletTab(w);
    setPage(1);
  };

  const totalValue = data?.users?.reduce((acc: number, user: any) => acc + (Number(user.walletTotal ?? user.totalWithdrawals) || 0), 0) || 0;
  const userCount = data?.pagination?.totalUsers || 0;

  const tableData = (data?.users || []).map((user: any) => ({
    id: user._id,
    name: user.name,
    phone: user.phone,
    totalWithdrawn: `RWF ${Number(user.walletTotal ?? user.totalWithdrawals ?? 0).toLocaleString()}`,
    withdrawnCount: `${user.withdrawalCount || 0}`,
    wallet: WALLET_LABEL[walletTab],
    amount: `RWF ${Number(user.lastWithdrawalAmount || 0).toLocaleString()}`,
    method: user.paymentProvider || 'N/A',
    date: formatDateTime(user.lastWithdrawalDate),
    status: 'completed'
  }));

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Withdrawn Users" breadcrumb="Withdrawn Users" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title={`Total Withdrawn (${WALLET_LABEL[walletTab]})`}
          value={`RWF ${totalValue.toLocaleString()}`}
          icon={DollarSign}
          tone="navy"
        />
        <StatCard
          title="Withdrawn Users"
          value={`${userCount}`}
          icon={Users}
          tone="green"
        />
        <StatCard
          title={`${WALLET_LABEL[walletTab]} Users`}
          value={`${walletCounts[walletTab] ?? 0}`}
          icon={ArrowUpCircle}
          tone="gold"
        />
        <StatCard
          title="All Wallets"
          value={`${(walletCounts.investment || 0) + (walletCounts.claim || 0) + (walletCounts.commission || 0) + (walletCounts.luck || 0)}`}
          icon={Users}
          tone="red"
        />
      </div>

      {/* 4 wallet cards — even Nexora-style gradient cards */}
      <div className="rounded-3xl bg-gradient-to-b from-violet-50 to-white border border-violet-100 shadow-sm p-4">
        <p className="text-[15px] font-extrabold text-slate-900 px-1">Choose a wallet</p>
        <p className="mt-1 px-1 text-[11px] text-slate-500">Each wallet shows only its own withdrawals — same 4 wallets as Nexora.</p>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {walletTabs.map((t) => {
            const active = walletTab === t.id;
            const count = walletCounts[t.id] ?? 0;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickWallet(t.id)}
                className={`relative overflow-hidden min-h-[110px] rounded-2xl ${t.card} shadow-md active:scale-[0.98] transition-transform flex flex-col items-center justify-center gap-1.5 p-3 ${
                  active ? "ring-4 ring-[#C9A84C] ring-offset-2 ring-offset-white" : ""
                }`}
              >
                <span className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-white/15" />
                <span className="absolute -left-7 -bottom-7 h-24 w-24 rounded-full bg-black/10" />
                <t.Icon className="relative h-6 w-6 text-white" strokeWidth={2.5} />
                <span className="relative text-[14px] font-extrabold text-white text-center leading-snug drop-shadow-sm">
                  {t.label}
                </span>
                <span
                  className={`relative min-w-[28px] h-6 px-2 grid place-items-center rounded-full text-[11px] font-black tabular-nums ${
                    count > 0 ? "bg-red-500 text-white" : "bg-white/20 text-white"
                  }`}
                >
                  {count} users
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-sm min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-[38px] h-[38px] inline-grid place-items-center rounded-[11px] bg-[#01152d] text-white shrink-0">
              <ArrowUpCircle className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15.5px] font-extrabold leading-tight">Withdrawn Users — {WALLET_LABEL[walletTab]}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Source wallet + full date & time (hrs:min:sec)</p>
            </div>
          </div>
        </div>
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search withdrawals..." className="pl-10 h-11 rounded-xl bg-muted/30" />
        </div>
        <div className="w-full max-w-full overflow-hidden border border-border/60 rounded-xl">
          <DataTable
            columns={columns}
            data={tableData}
            loading={isLoading}
            pagination={
              data?.pagination
                ? {
                    currentPage: data.pagination.currentPage,
                    totalPages: data.pagination.totalPages,
                    onPageChange: setPage
                  }
                : null
            }
          />
        </div>
        <div className="mt-4">
          <SmartPagination currentPage={data?.pagination?.currentPage || page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
};

export default WithdrawnUsers;
