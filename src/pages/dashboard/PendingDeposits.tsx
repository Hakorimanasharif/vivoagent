import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import SmartPagination from "@/components/SmartPagination";
import DepositPreviewDialog from "@/components/DepositPreviewDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, DollarSign, Users, Eye, Search, Check, X, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'https://nexorabackend-eb0p.onrender.com';

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

const PendingDeposits = () => {
  const [preview, setPreview] = useState<{ id: string; name: string; amount: string; date: string; screenshot?: string; senderPhone?: string; senderName?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const agentToken = localStorage.getItem('agentToken') || '';
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pending-deposits', page, search],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/transactions/pending`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      if (search) url.searchParams.append('search', search);

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch pending deposits');
      return response.json();
    },
    keepPreviousData: true,
    enabled: !!agentToken,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE}/api/transactions/${id}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to approve deposit');
      return response.json();
    },
    onSuccess: () => {
      toast.success("Deposit Approved — Funds added to user wallet");
      queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['agent-dashboard-stats'] });
      setShowPreview(false);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      const response = await fetch(`${API_BASE}/api/transactions/${id}/deny`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${agentToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error('Failed to reject deposit');
      return response.json();
    },
    onSuccess: () => {
      toast.success("Deposit Rejected — User has been notified");
      queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['agent-dashboard-stats'] });
      setShowPreview(false);
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleReject = (id: string) => {
    const reason = prompt("Enter Rejection Reason:");
    if (reason) denyMutation.mutate({ id, reason });
  };

  const totalValue = data?.deposits?.reduce((acc: number, deposit: any) => acc + (Number(deposit.amount) || 0), 0) || 0;
  const uniqueUsers = new Set(data?.deposits?.map((deposit: any) => deposit.user ? deposit.user._id : deposit.user)?.filter(Boolean)).size || 0;

  const PAGE_LIMIT = 20;
  const tableData = (data?.deposits || []).map((deposit: any, idx: number) => ({
    id: deposit._id,
    no: (page - 1) * PAGE_LIMIT + idx + 1,
    name: deposit.user?.name || 'Unknown',
    phone: deposit.user?.phone || 'Unknown',
    payerPhone: deposit.senderPhone || '—',
    payerName: deposit.senderName || '—',
    amount: `RWF ${Number(deposit.amount || 0).toLocaleString()}`,
    date: formatDateTime(deposit.createdAt),
    status: deposit.status,
    user: deposit.user,
    screenshot: deposit.screenshot,
    senderPhone: deposit.senderPhone,
    senderName: deposit.senderName,
  }));

  const columns = [
    {
      accessorKey: "no",
      header: "#",
      cell: ({ row }: any) => (
        <span className="inline-grid place-items-center min-w-8 h-8 px-2 rounded-xl bg-[#F4F8F5] border border-[#D7E8DC] text-xs font-extrabold text-[#0A2E1F] tabular-nums">
          {row.no}
        </span>
      )
    },
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-[10px] bg-[#01152d] text-white flex items-center justify-center font-extrabold text-xs shrink-0 uppercase">
            {(row.name || 'U').charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{row.name}</p>
            <p className="text-[11px] text-muted-foreground truncate tabular-nums">{row.phone}</p>
          </div>
        </div>
      )
    },
    { accessorKey: "payerPhone", header: "Paid From", cell: ({ row }: any) => <span className="font-mono text-xs font-bold tabular-nums">{row.payerPhone}</span> },
    { accessorKey: "payerName", header: "Payer", cell: ({ row }: any) => <span className="text-sm font-semibold">{row.payerName}</span> },
    { accessorKey: "amount", header: "Amount", cell: ({ row }: any) => <span className="font-extrabold tabular-nums text-emerald-700">{row.amount}</span> },
    { accessorKey: "date", header: "Requested (date + time)", cell: ({ row }: any) => <span className="text-[11px] text-muted-foreground font-semibold tabular-nums whitespace-nowrap">{row.date}</span> },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => <StatusBadge status={row.status} />
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-muted" title="Preview" onClick={() => { setPreview({ id: row.id, name: row.name, amount: row.amount, date: row.date, screenshot: row.screenshot, senderPhone: row.senderPhone, senderName: row.senderName }); setShowPreview(true); }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-500 hover:text-white"
            title="Approve"
            disabled={approveMutation.isPending || denyMutation.isPending}
            onClick={() => approveMutation.mutate(row.id)}
          >
            {approveMutation.isPending && (approveMutation.variables as any) === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-500 hover:text-white"
            title="Reject"
            disabled={approveMutation.isPending || denyMutation.isPending}
            onClick={() => handleReject(row.id)}
          >
            {denyMutation.isPending && (denyMutation.variables as any)?.id === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Pending Deposits" breadcrumb="Pending Deposits" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Pending Total" value={`RWF ${totalValue.toLocaleString()}`} icon={DollarSign} tone="green" />
        <StatCard title="Pending Count" value={`${data?.pagination?.totalDeposits || 0}`} icon={Clock} tone="navy" />
        <StatCard title="Users Waiting" value={`${uniqueUsers}`} icon={Users} tone="gold" />
      </div>

      <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-sm min-w-0">
        <div className="flex items-center gap-3 min-w-0 mb-4">
          <span className="w-[38px] h-[38px] inline-grid place-items-center rounded-[11px] bg-[#C9A84C] text-[#01152d] shrink-0">
            <Wallet className="h-[18px] w-[18px]" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h3 className="text-[15.5px] font-extrabold leading-tight">Deposit Requests</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Paid-from number + full date & time (hrs:min:sec)</p>
          </div>
        </div>
        <div className="relative w-full md:max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search deposits…" className="pl-10 h-11 rounded-xl bg-muted/30 font-semibold" />
        </div>
        <div className="w-full max-w-full overflow-hidden border border-border/60 rounded-xl">
          <DataTable columns={columns} data={tableData} loading={isLoading} pagination={{ currentPage: data?.pagination?.currentPage || page, totalPages: data?.pagination?.totalPages || 1, onPageChange: setPage }} />
        </div>
        <div className="mt-4">
          <SmartPagination currentPage={data?.pagination?.currentPage || page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>

      <DepositPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        deposit={preview}
        onApprove={() => preview && approveMutation.mutate(preview.id)}
        onReject={() => preview && handleReject(preview.id)}
        isProcessing={approveMutation.isPending || denyMutation.isPending}
      />
    </div>
  );
};

export default PendingDeposits;
