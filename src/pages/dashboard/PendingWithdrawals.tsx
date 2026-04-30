import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import SmartPagination from "@/components/SmartPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowDownCircle, Clock, Users, AlertTriangle, Search, Landmark } from "lucide-react";
import { toast } from "sonner";

const API_BASE = 'https://globalbackend-oqoz.onrender.com';

const PendingWithdrawals = () => {
  const [showBank, setShowBank] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  const agentToken = localStorage.getItem('agentToken') || '';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pending-withdrawals', page, search],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/withdrawals/pending`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      if (search) url.searchParams.append('search', search);

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch pending withdrawals');
      return response.json();
    },
    keepPreviousData: true,
    enabled: !!agentToken,
  });

  const totalValue = data?.withdrawals?.reduce((acc: number, w: any) => acc + (Number(w.amount) || 0), 0) || 0;
  const uniqueUsers = new Set((data?.withdrawals || []).map((w: any) => w.user?._id || w.user)).size || 0;

  const tableData = (data?.withdrawals || []).map((withdrawal: any) => ({
    id: withdrawal._id,
    name: withdrawal.user?.name || 'Unknown',
    phone: withdrawal.user?.phone || 'Unknown',
    amount: `RWF ${Number(withdrawal.amount || 0).toLocaleString()}`,
    method: withdrawal.paymentProvider || withdrawal.user?.paymentProvider || 'Unknown',
    date: new Date(withdrawal.createdAt).toLocaleDateString(),
    status: withdrawal.status || 'pending',
    bank: withdrawal.metadata?.accountNumber || withdrawal.user?.phone || 'N/A',
    account: withdrawal.metadata?.accountNumber || withdrawal.user?.phone || 'N/A',
    user: withdrawal.user,
  }));

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
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${action} withdrawal`);
    } finally {
      setActionLoading(false);
    }
  };

  const getProviderLogo = (method: string) => {
    const m = method?.toLowerCase();
    if (m === 'mtn') return "https://i.pinimg.com/1200x/0a/f0/0e/0af00e1d78100d4019d3344873902d5a.jpg";
    if (m === 'airtel') return "https://i.pinimg.com/736x/68/7c/cf/687ccf6f9a7987377f8eec6aba64e409.jpg";
    return null;
  };

  const columns = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "amount", header: "Amount" },
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
    { accessorKey: "date", header: "Requested" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => <StatusBadge status={row?.status || 'unknown'} />
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setSelectedUser(row); setShowBank(true); }}>
            <Landmark className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="default" disabled={actionLoading} onClick={() => handleWithdrawalAction(row.id, 'approve')}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" disabled={actionLoading} onClick={() => handleWithdrawalAction(row.id, 'deny')}>
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Pending Withdrawals" breadcrumb="Pending Withdrawals" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Pending Total" value={`RWF ${totalValue.toLocaleString()}`} icon={ArrowDownCircle} variant="gradient" gradient="from-rose-600 to-rose-700" />
        <StatCard title="Requests" value={`${data?.pagination?.totalWithdrawals || 0}`} icon={Clock} variant="gradient" gradient="from-blue-600 to-blue-700" />
        <StatCard title="Users" value={`${uniqueUsers}`} icon={Users} variant="gradient" gradient="from-amber-600 to-amber-700" />
      </div>

      <Card className="p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search withdrawals..." className="pl-9" />
        </div>
      </Card>

      <DataTable columns={columns} data={tableData} loading={isLoading} pagination={data?.pagination ? { currentPage: data.pagination.currentPage, totalPages: data.pagination.totalPages, onPageChange: setPage } : null} />
      <SmartPagination currentPage={data?.pagination?.currentPage || page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage} />

      {/* Bank Info Dialog */}
      <Dialog open={showBank} onOpenChange={setShowBank}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Information</DialogTitle>
            <DialogDescription>Review the recipient's bank or mobile money account details.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {selectedUser.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-secondary/50 flex flex-col items-center justify-center">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">Provider</p>
                  <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-primary/20 shadow-inner bg-white flex items-center justify-center">
                    {getProviderLogo(selectedUser.method) ? (
                      <img src={getProviderLogo(selectedUser.method)!} alt={selectedUser.method} className="h-full w-full object-cover" />
                    ) : (
                      <Landmark className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-muted-foreground text-xs">Account</p>
                  <p className="font-medium text-foreground mt-0.5">{selectedUser.account}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium text-foreground mt-0.5">{selectedUser.phone}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="font-medium text-primary mt-0.5">{selectedUser.amount}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => { handleWithdrawalAction(selectedUser.id, 'approve'); setShowBank(false); }}>Approve & Send</Button>
                <Button className="flex-1" variant="destructive" onClick={() => { handleWithdrawalAction(selectedUser.id, 'deny'); setShowBank(false); }}>Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingWithdrawals;
