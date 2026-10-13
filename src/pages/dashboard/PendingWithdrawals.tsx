import { useState } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import SmartPagination from "@/components/SmartPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowDownCircle, Clock, Users, AlertTriangle, Search, Landmark, Loader2, Wallet, Layers, Briefcase, HandCoins, Gift } from "lucide-react";
import { toast } from "sonner";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://nexorabackend-eb0p.onrender.com';

const WALLET_LABEL: Record<string, string> = {
  investment: 'Umwuga',
  claim: 'Akazi',
  commission: 'Commission',
  luck: 'Bonus',
};

// Full timestamp with hrs:min:sec — e.g. 12/10/2026, 14:23:45
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

const PendingWithdrawals = () => {
  const [showBank, setShowBank] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [amountFilter, setAmountFilter] = useState<number | null>(null);
  const [batchApproving, setBatchApproving] = useState<number | null>(null);

  const agentToken = localStorage.getItem('agentToken') || '';
  const queryClient = useQueryClient();

  // 4 wallet cards — even gradient cards, same 4 wallets + colors as Nexora:
  // Umwuga (indigo) • Akazi (emerald) • Commission (amber) • Bonus (fuchsia)
  const [walletTab, setWalletTab] = useState<'investment' | 'claim' | 'commission' | 'luck'>('investment');
  const walletTabs = [
    { id: 'investment' as const, label: 'Umwuga', card: 'bg-gradient-to-br from-indigo-500 to-indigo-800', Icon: Briefcase },
    { id: 'claim' as const, label: 'Akazi', card: 'bg-gradient-to-br from-emerald-500 to-emerald-800', Icon: HandCoins },
    { id: 'commission' as const, label: 'Commission', card: 'bg-gradient-to-br from-amber-500 to-orange-700', Icon: Users },
    { id: 'luck' as const, label: 'Bonus', card: 'bg-gradient-to-br from-fuchsia-500 to-purple-800', Icon: Gift },
  ];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-withdrawals', page, search, amountFilter, walletTab],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/withdrawals/pending`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      url.searchParams.append('wallet', walletTab);
      if (search) url.searchParams.append('search', search);
      if (amountFilter !== null) url.searchParams.append('amount', String(amountFilter));

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch pending withdrawals');
      return response.json();
    },
    keepPreviousData: true,
    enabled: !!agentToken,
  });

  const { data: amountGroupsData, refetch: refetchGroups } = useQuery({
    queryKey: ['pending-amount-groups', walletTab],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/withdrawals/pending/by-amount`);
      url.searchParams.append('wallet', walletTab);
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch amount groups');
      return response.json();
    },
    enabled: !!agentToken,
  });
  const amountGroups: { amount: number; count: number; total: number }[] = amountGroupsData?.groups || [];

  const { data: walletCountsData } = useQuery({
    queryKey: ['pending-wallet-counts'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/withdrawals/pending/by-wallet`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch wallet counts');
      return response.json();
    },
    enabled: !!agentToken,
    refetchInterval: 30000,
  });
  const walletCounts = walletCountsData?.counts || { investment: 0, claim: 0, commission: 0, luck: 0 };

  const pickAmount = (amount: number | null) => {
    setAmountFilter(amount);
    setPage(1);
  };

  const pickWallet = (w: typeof walletTab) => {
    setWalletTab(w);
    setPage(1);
    setAmountFilter(null);
  };

  const handleApproveBatch = async (amount: number, count: number) => {
    if (!confirm(`Approve ALL ${count} pending ${WALLET_LABEL[walletTab]} withdrawal(s) of RWF ${Number(amount).toLocaleString()}?\n\nTotal payout: RWF ${Number(amount * count).toLocaleString()}`)) return;
    try {
      setBatchApproving(amount);
      const response = await fetch(`${API_BASE}/api/withdrawals/approve-batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${agentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount, wallet: walletTab })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.message || 'Batch approve failed');
      toast.success(json.message || `Approved ${count} withdrawal(s)`);
      await queryClient.invalidateQueries({ queryKey: ['pending-withdrawals'] });
      await queryClient.invalidateQueries({ queryKey: ['pending-amount-groups'] });
      await queryClient.invalidateQueries({ queryKey: ['pending-wallet-counts'] });
      await refetch();
      await refetchGroups();
    } catch (error: any) {
      toast.error(error.message || "Batch approve failed");
    } finally {
      setBatchApproving(null);
    }
  };

  const totalValue = data?.withdrawals?.reduce((acc: number, w: any) => acc + (Number(w.amount) || 0), 0) || 0;
  const uniqueUsers = new Set((data?.withdrawals || []).map((w: any) => w.user?._id || w.user)).size || 0;

  const tableData = (data?.withdrawals || []).map((withdrawal: any) => {
    const walletKey: string = withdrawal.metadata?.wallet || withdrawal.wallet || walletTab;
    return {
      id: withdrawal._id,
      raw: withdrawal,
      name: withdrawal.user?.name || 'Unknown',
      phone: withdrawal.user?.phone || 'Unknown',
      amount: `RWF ${Number(withdrawal.amount || 0).toLocaleString()}`,
      rawAmount: withdrawal.amount,
      wallet: WALLET_LABEL[walletKey] || walletKey || WALLET_LABEL[walletTab],
      walletKey,
      method: withdrawal.paymentMethod || withdrawal.paymentProvider || withdrawal.metadata?.originalPaymentMethod || withdrawal.user?.paymentProvider || 'Unknown',
      date: formatDateTime(withdrawal.createdAt),
      status: withdrawal.status || 'pending',
      bank: withdrawal.metadata?.accountNumber || withdrawal.user?.phone || 'N/A',
      account: withdrawal.metadata?.accountNumber || withdrawal.user?.phone || 'N/A',
      accountHolder: withdrawal.metadata?.accountHolder || withdrawal.user?.name || '',
      user: withdrawal.user,
    };
  });

  const handleWithdrawalAction = async (id: string, action: 'approve' | 'deny') => {
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE}/api/withdrawals/${id}/${action}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${agentToken}`,
          'Content-Type': 'application/json'
        },
        body: action === 'deny' ? JSON.stringify({ reason: 'Not approved' }) : undefined
      });
      if (!response.ok) throw new Error(`${action} failed`);
      toast.success(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      await refetch();
      await refetchGroups();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${action} withdrawal`);
    } finally {
      setActionLoading(false);
    }
  };

  const getProviderLogo = (method: string) => {
    const m = method?.toLowerCase();
    if (m === 'mtn' || m?.includes('mtn')) return "https://i.pinimg.com/1200x/0a/f0/0e/0af00e1d78100d4019d3344873902d5a.jpg";
    if (m === 'airtel' || m?.includes('airtel')) return "https://i.pinimg.com/736x/68/7c/cf/687ccf6f9a7987377f8eec6aba64e409.jpg";
    return null;
  };

  const columns = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] bg-[#01152d] text-white flex items-center justify-center font-extrabold text-xs shrink-0 uppercase">
            {(row.name || 'U').charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{row.name}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums truncate">{row.phone}</p>
          </div>
        </div>
      )
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }: any) => <span className="tabular-nums text-muted-foreground">{row.phone}</span> },
    { accessorKey: "amount", header: "Amount", cell: ({ row }: any) => <span className="font-extrabold tabular-nums text-emerald-700">{row.amount}</span> },
    {
      accessorKey: "wallet",
      header: "From",
      cell: ({ row }: any) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-[#01152d] text-white tabular-nums">
          {row.wallet}
        </span>
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
    {
      accessorKey: "account",
      header: "Payout Number",
      cell: ({ row }: any) => (
        <div className="flex flex-col items-start">
          <span className="font-mono text-xs font-bold tabular-nums">{row.account}</span>
          {row.accountHolder && row.accountHolder !== row.name && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{row.accountHolder}</span>
          )}
        </div>
      )
    },
    { accessorKey: "date", header: "Requested (date + time)", cell: ({ row }: any) => <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{row.date}</span> },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => <StatusBadge status={row?.status || 'unknown'} />
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-muted" title="View bank info" onClick={() => { setSelectedUser(row); setShowBank(true); }}>
            <Landmark className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600" disabled={actionLoading} onClick={() => handleWithdrawalAction(row.id, 'approve')}>
            Approve
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs font-bold border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600" disabled={actionLoading} onClick={() => handleWithdrawalAction(row.id, 'deny')}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Pending Withdrawals" breadcrumb="Pending Withdrawals" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Pending Total" value={`RWF ${totalValue.toLocaleString()}`} icon={ArrowDownCircle} tone="red" />
        <StatCard title="Requests" value={`${data?.pagination?.totalWithdrawals || 0}`} icon={Clock} tone="navy" />
        <StatCard title="Users" value={`${uniqueUsers}`} icon={Users} tone="gold" />
        <StatCard title={WALLET_LABEL[walletTab]} value={`${walletCounts[walletTab] ?? 0} pending`} icon={AlertTriangle} tone="green" />
      </div>

      {/* 4 wallet cards — even Nexora-style gradient cards */}
      <div className="rounded-3xl bg-gradient-to-b from-violet-50 to-white border border-violet-100 shadow-sm p-4">
        <p className="text-[15px] font-extrabold text-slate-900 px-1">Choose a wallet</p>
        <p className="mt-1 px-1 text-[11px] text-slate-500">Each wallet pays only its own money — same 4 wallets as Nexora.</p>
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
                  {count} pending
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Group by amount — same as admin */}
      <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-sm">
        <div className="flex items-center gap-3 min-w-0 mb-4">
          <span className="w-[38px] h-[38px] inline-grid place-items-center rounded-[11px] bg-[#C9A84C] text-[#01152d] shrink-0">
            <Layers className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15.5px] font-extrabold leading-tight">Group by amount — {WALLET_LABEL[walletTab]}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{amountFilter !== null ? `Showing RWF ${Number(amountFilter).toLocaleString()} only` : "All amounts"}</p>
          </div>
        </div>
        {amountGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending withdrawals.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pickAmount(null)}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold border transition-all ${amountFilter === null ? "bg-[#01152d] text-white border-[#01152d]" : "bg-background border-border hover:border-[#01152d]/40"}`}
            >
              All
            </button>
            {amountGroups.map((g) => {
              const selected = amountFilter === g.amount;
              const busy = batchApproving === g.amount;
              return (
                <div
                  key={g.amount}
                  className={`flex items-stretch rounded-xl border overflow-hidden transition-all ${selected ? "border-[#C9A84C] shadow-sm" : "border-border"}`}
                >
                  <button
                    type="button"
                    onClick={() => pickAmount(selected ? null : g.amount)}
                    className={`px-4 py-2 text-left ${selected ? "bg-[#C9A84C]/10" : "hover:bg-muted/60"}`}
                    title={selected ? "Show all amounts" : `Show only RWF ${Number(g.amount).toLocaleString()}`}
                  >
                    <span className="block text-sm font-extrabold tabular-nums">RWF {Number(g.amount).toLocaleString()}</span>
                    <span className="block text-[11px] text-muted-foreground font-semibold">
                      {g.count} {g.count === 1 ? "person" : "people"} • total RWF {Number(g.total).toLocaleString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy || actionLoading}
                    onClick={() => handleApproveBatch(g.amount, g.count)}
                    className="px-3 text-xs font-extrabold bg-[#178A52] hover:bg-[#178A52]/90 text-white disabled:opacity-60"
                    title={`Approve all ${g.count} × RWF ${Number(g.amount).toLocaleString()}`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve all"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Requests table */}
      <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-sm min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0 mb-4">
          <span className="w-[38px] h-[38px] inline-grid place-items-center rounded-[11px] bg-[#01152d] text-white shrink-0">
            <Wallet className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15.5px] font-extrabold leading-tight">Withdrawal Requests — {WALLET_LABEL[walletTab]}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Source wallet + full date & time (hrs:min:sec)</p>
          </div>
        </div>
        <div className="relative w-full md:max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search withdrawals..." className="pl-10 h-11 rounded-xl bg-muted/30" />
        </div>

        <div className="border border-border/60 rounded-xl overflow-hidden">
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
          <SmartPagination
            currentPage={data?.pagination?.currentPage || page}
            totalPages={data?.pagination?.totalPages || 1}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Bank Info Dialog */}
      <Dialog open={showBank} onOpenChange={setShowBank}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Bank Information</DialogTitle><DialogDescription>Recipient payout details + request time.</DialogDescription></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-[10px] bg-[#01152d] flex items-center justify-center text-white font-extrabold shrink-0 uppercase">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.user?.phone || selectedUser.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-[14px] border border-border/60 bg-muted/30 flex flex-col items-center justify-center">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">Payment Provider</p>
                  <div className="h-14 w-14 rounded-[10px] overflow-hidden border border-border/60 bg-card flex items-center justify-center">
                    {getProviderLogo(selectedUser.method || selectedUser.bank) ? (
                      <img src={getProviderLogo(selectedUser.method || selectedUser.bank)!} alt={selectedUser.bank} className="h-full w-full object-cover" />
                    ) : (
                      <Landmark className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs mt-2 font-semibold">{selectedUser.method}</p>
                </div>
                <div className="p-3 rounded-[14px] border border-border/60 bg-muted/30">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">From (wallet)</p>
                  <p className="font-extrabold text-foreground mt-0.5">{selectedUser.wallet}</p>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-2">Account Number</p>
                  <p className="font-mono font-bold text-foreground mt-0.5 break-all tabular-nums">{selectedUser.account}</p>
                </div>
                <div className="p-3 rounded-[14px] border border-border/60 bg-muted/30">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Phone</p>
                  <p className="font-semibold text-foreground mt-0.5 tabular-nums">{selectedUser.phone}</p>
                </div>
                <div className="p-3 rounded-[14px] border border-border/60 bg-muted/30">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Amount</p>
                  <p className="font-extrabold text-emerald-700 mt-0.5 tabular-nums">{selectedUser.amount}</p>
                </div>
              </div>
              <div className="p-3 rounded-[14px] border border-border/60 bg-muted/30 text-xs">
                <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Requested at</p>
                <p className="font-bold tabular-nums mt-0.5">{selectedUser.date}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1 rounded-xl bg-[#178A52] hover:bg-[#178A52]/90 font-bold" onClick={() => { handleWithdrawalAction(selectedUser.id, 'approve'); setShowBank(false); }}>Approve & Send</Button>
                <Button className="flex-1 rounded-xl" variant="destructive" onClick={() => { handleWithdrawalAction(selectedUser.id, 'deny'); setShowBank(false); }}>Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingWithdrawals;
