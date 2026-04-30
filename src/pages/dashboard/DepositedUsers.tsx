import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { DataTable } from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DollarSign, Users, TrendingUp, ArrowUpRight, Search } from "lucide-react";


const columns: any[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "phone", header: "Phone" },
  {
    accessorKey: "totalDeposits",
    header: "Total Deposited",
    cell: ({ row }: any) => `RWF ${Number(row.totalDeposits || 0).toLocaleString()}`
  },
  { accessorKey: "depositCount", header: "Deposit Count" },
  {
    accessorKey: "lastDepositDate",
    header: "Last Deposit",
    cell: ({ row }: any) => row.lastDepositDate ? new Date(row.lastDepositDate).toLocaleDateString() : '—'
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
      const url = new URL('https://globalbackend-oqoz.onrender.com/api/users/deposited');
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
      const response = await fetch('https://globalbackend-oqoz.onrender.com/api/users/deposited/stats/overview', {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch deposited users stats');
      return response.json();
    },
    enabled: !!agentToken,
  });

  const { data: pendingDepositsData, isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-deposits', page],
    queryFn: async () => {
      if (!agentToken) throw new Error('No token');
      const url = new URL('https://globalbackend-oqoz.onrender.com/api/transactions/pending');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch pending deposits');
      return response.json();
    },
    enabled: !!agentToken,
  });

  const tableData = depositedUsersData?.users || [];
  const pagination = {
    currentPage: depositedUsersData?.pagination?.currentPage || page,
    totalPages: depositedUsersData?.pagination?.totalPages || 1,
    onPageChange: setPage,
  };

  const stats = {
    totalDeposited: depositedStatsData?.totalDeposits || 0,
    depositCount: depositedStatsData?.totalDepositedUsers || 0,
    avgDeposit: depositedStatsData?.avgDepositsPerUser || 0,
    highestDeposit: depositedStatsData?.totalDeposits ? Math.max(...(tableData.map((u: any) => u.totalDeposits || 0))) : 0,
    activeDepositedUsers: depositedStatsData?.activeDepositedUsers || 0,
    depositsThisMonth: depositedStatsData?.depositsThisMonth || 0,
  };

  const filteredData = tableData.filter((row: any) => 
    (row.name?.toLowerCase().includes(search.toLowerCase()) || 
    row.phone?.toLowerCase().includes(search.toLowerCase()) ||
    row.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <PageHeader title="Deposited Users" breadcrumb="Deposited Users" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard 
          title="Total Deposited" 
          value={stats.totalDeposited ? `RWF ${stats.totalDeposited.toLocaleString()}` : '—'} 
          icon={DollarSign} 
          trend="+12% this week" 
          trendUp={true} 
          variant="gradient"
          gradient="from-emerald-600 to-emerald-700" 
        />
        <StatCard 
          title="Deposited Users" 
          value={stats.depositCount?.toLocaleString() || '—'} 
          icon={Users} 
          trend="+2 new" 
          trendUp={true} 
          variant="gradient"
          gradient="from-blue-600 to-blue-700" 
        />
        <StatCard 
          title="Avg Deposit" 
          value={stats.avgDeposit ? `RWF ${stats.avgDeposit.toLocaleString()}` : '—'} 
          icon={TrendingUp} 
          variant="gradient"
          gradient="from-amber-600 to-amber-700" 
        />

        <StatCard 
          title="Highest Deposit" 
          value={stats.highestDeposit ? `RWF ${stats.highestDeposit.toLocaleString()}` : '—'} 
          icon={ArrowUpRight} 
          variant="gradient"
          gradient="from-violet-600 to-violet-700" 
        />
        <StatCard 
          title="Active Deposited Users" 
          value={stats.activeDepositedUsers?.toLocaleString() || '—'}
          icon={Users} 
          variant="gradient"
          gradient="from-cyan-600 to-cyan-700" 
        />
        <StatCard 
          title="Pending Deposits" 
          value={`${stats.pendingDeposits?.toLocaleString() ?? 0} pending`}
          icon={ArrowUpRight} 
          variant="gradient"
          gradient="from-orange-600 to-orange-700" 
        />
      </div>
      <Card className="p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            placeholder="Search users..." 
            className="pl-9" 
          />
        </div>
      </Card>
      <DataTable 
        columns={columns} 
        data={filteredData} 
        loading={isLoadingDeposited || isLoadingStats}
        pagination={pagination}
      />


    </div>
  );
};

export default DepositedUsers;
