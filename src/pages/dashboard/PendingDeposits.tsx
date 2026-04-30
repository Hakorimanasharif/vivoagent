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
import { Card } from "@/components/ui/card";
import { Clock, DollarSign, Users, AlertCircle, Eye, Search, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE = 'https://globalbackend-oqoz.onrender.com';

const PendingDeposits = () => {
  const [preview, setPreview] = useState<{ id: string; name: string; amount: string; date: string; screenshot?: string } | null>(null);
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
      queryClient.invalidateQueries(['pending-deposits']);
      queryClient.invalidateQueries(['agent-dashboard-stats']);
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
      queryClient.invalidateQueries(['pending-deposits']);
      queryClient.invalidateQueries(['agent-dashboard-stats']);
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

  const tableData = (data?.deposits || []).map((deposit: any) => ({
    id: deposit._id,
    name: deposit.user?.name || 'Unknown',
    phone: deposit.user?.phone || 'Unknown',
    amount: `RWF ${Number(deposit.amount || 0).toLocaleString()}`,
    date: new Date(deposit.createdAt).toLocaleDateString(),
    status: deposit.status,
    user: deposit.user,
    screenshot: deposit.screenshot,
  }));

  const columns = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "amount", header: "Amount" },
    { accessorKey: "date", header: "Requested" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => <StatusBadge status={row.status} />
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setPreview(row); setShowPreview(true); }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={approveMutation.isLoading || denyMutation.isLoading}
            onClick={() => approveMutation.mutate(row.id)}
          >
            {approveMutation.isLoading && approveMutation.variables === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={approveMutation.isLoading || denyMutation.isLoading}
            onClick={() => handleReject(row.id)}
          >
            {denyMutation.isLoading && denyMutation.variables?.id === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Pending Deposits" breadcrumb="Pending Deposits" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="Pending Total" value={`RWF ${totalValue.toLocaleString()}`} icon={DollarSign} variant="gradient" gradient="from-emerald-600 to-emerald-700" />
        <StatCard title="Pending Count" value={`${data?.pagination?.totalDeposits || 0}`} icon={Clock} variant="gradient" gradient="from-blue-600 to-blue-700" />
        <StatCard title="Users Waiting" value={`${uniqueUsers}`} icon={Users} variant="gradient" gradient="from-amber-600 to-amber-700" />
      </div>

      <Card className="p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deposits..." className="pl-9" />
        </div>
      </Card>

      <DataTable columns={columns} data={tableData} loading={isLoading} pagination={{ currentPage: data?.pagination?.currentPage || page, totalPages: data?.pagination?.totalPages || 1, onPageChange: setPage }} />
      <SmartPagination currentPage={data?.pagination?.currentPage || page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage} />

      <DepositPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        deposit={preview}
        onApprove={() => preview && approveMutation.mutate(preview.id)}
        onReject={() => preview && handleReject(preview.id)}
        isProcessing={approveMutation.isLoading || denyMutation.isLoading}
      />
    </div>
  );
};

export default PendingDeposits;
