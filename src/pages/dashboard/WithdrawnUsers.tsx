import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import SmartPagination from "@/components/SmartPagination";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowUpCircle, DollarSign, Users, TrendingDown, Search } from "lucide-react";

const getProviderLogo = (method: string) => {
  const m = method?.toLowerCase();
  if (m === 'mtn') return "https://i.pinimg.com/1200x/0a/f0/0e/0af00e1d78100d4019d3344873902d5a.jpg";
  if (m === 'airtel') return "https://i.pinimg.com/736x/68/7c/cf/687ccf6f9a7987377f8eec6aba64e409.jpg";
  return null;
};

const columns = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "phone", header: "Phone" },
  { accessorKey: "totalWithdrawn", header: "Total Withdrawn" },
  { accessorKey: "withdrawnCount", header: "Withdrawn Count" },
  { accessorKey: "amount", header: "Latest Amount" },
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
  { accessorKey: "date", header: "Latest Date" },
  { accessorKey: "status", header: "Status", cell: ({ row }: any) => <StatusBadge status={row?.status || 'completed'} /> },
];

const WithdrawnUsers = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const agentToken = localStorage.getItem('agentToken') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['withdrawn-users', page, search],
    queryFn: async () => {
      const url = new URL('https://globalbackend-oqoz.onrender.com/api/users/withdrawn');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
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

  const totalValue = data?.users?.reduce((acc: number, user: any) => acc + (Number(user.totalWithdrawals) || 0), 0) || 0;
  const userCount = data?.pagination?.totalUsers || 0;
  const avg = userCount ? totalValue / userCount : 0;

  const tableData = (data?.users || []).map((user: any) => ({
    id: user._id,
    name: user.name,
    phone: user.phone,
    totalWithdrawn: `RWF ${Number(user.totalWithdrawals || 0).toLocaleString()}`,
    withdrawnCount: `${user.withdrawalCount || 0}`,
    amount: `RWF ${Number(user.lastWithdrawalAmount || 0).toLocaleString()}`,
    method: user.paymentProvider || 'N/A',
    date: user.lastWithdrawalDate ? new Date(user.lastWithdrawalDate).toLocaleDateString() : 'N/A',
    status: 'completed'
  }));

  return (
    <div>
      <PageHeader title="Withdrawn Users" breadcrumb="Withdrawn Users" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Withdrawn" 
          value={`RWF ${totalValue.toLocaleString()}`} 
          icon={DollarSign} 
          variant="gradient"
          gradient="from-rose-600 to-rose-700" 
        />
        <StatCard 
          title="Users" 
          value={`${userCount}`} 
          icon={Users} 
          variant="gradient"
          gradient="from-blue-600 to-blue-700" 
        />
        <StatCard 
          title="Avg Withdrawal" 
          value={`RWF ${Math.round(avg).toLocaleString()}`} 
          icon={ArrowUpCircle} 
          variant="gradient"
          gradient="from-amber-600 to-amber-700" 
        />
        <StatCard 
          title="Page Volume" 
          value={`${tableData.length}`} 
          icon={TrendingDown} 
          variant="gradient"
          gradient="from-violet-600 to-violet-700" 
        />
      </div>
      <Card className="p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search withdrawals..." className="pl-9" />
        </div>
      </Card>
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
      <SmartPagination currentPage={data?.pagination?.currentPage || page} totalPages={data?.pagination?.totalPages || 1} onPageChange={setPage} />
    </div>
  );
};

export default WithdrawnUsers;
