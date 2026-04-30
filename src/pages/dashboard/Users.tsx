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
import { cn } from "@/lib/utils";
import {
  Users as UsersIcon,
  UserCheck,
  UserX,
  Search,
  Shield,
  Mail,
  Phone,
  Loader2
} from "lucide-react";


const Users = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const agentToken = localStorage.getItem('agentToken') || '';
  const API_BASE = 'https://globalbackend-oqoz.onrender.com';

  // Fetch Users Stats (Total, Active, etc.)
  const { data: stats } = useQuery({
    queryKey: ['users-stats-overview'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/users/stats/overview`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!agentToken,
  });

  // Fetch Users List
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['all-users', page, search],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/users`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '20');
      if (search) url.searchParams.append('search', search);

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!agentToken,
  });



  let adminCounter = 1;
  const adminMap = new Map<string, string>();
  
  const getAdminAlias = (user: any) => {
    if (user.role === 'admin') {
      if (!adminMap.has(user._id)) {
        adminMap.set(user._id, `Admin ${adminCounter++}`);
      }
      return adminMap.get(user._id);
    }
    return user.name;
  };

  const columns = [
    {
      accessorKey: "user",
      header: "User",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 uppercase overflow-hidden">
            {row.avatar ? (
              <img src={row.avatar} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              row.name.charAt(0)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {row.role === 'admin' ? <strong>{getAdminAlias(row)}</strong> : getAdminAlias(row)}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{row.role === 'admin' ? 'Hidden' : row.email}</p>
          </div>
        </div>
      )
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }: any) => row.role === 'admin' ? 'Hidden' : row.phone },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }: any) => (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
          row.role === 'admin' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        )}>
          {row.role}
        </span>
      )
    },
    {
      accessorKey: "balance",
      header: "Balance",
      cell: ({ row }: any) => (
        <span className="font-mono font-bold text-primary">RWF {Number(row.balance).toLocaleString()}</span>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
      )
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }: any) => (
        <span className="text-[11px] text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      )
    },

  ];

  const tableData = (data?.users || []).map((user: any) => ({
    ...user,
    id: user._id
  }));

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="User Management" breadcrumb="Users" />

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers?.toLocaleString() || "0"}
          icon={UsersIcon}
          variant="gradient"
          gradient="from-blue-600 to-blue-700"
        />
        <StatCard
          title="Active Accounts"
          value={stats?.activeUsers?.toLocaleString() || "0"}
          icon={UserCheck}
          variant="gradient"
          gradient="from-emerald-600 to-emerald-700"
        />
        <StatCard
          title="Platform Capital"
          value={`RWF ${(stats?.totalBalance || 0).toLocaleString()}`}
          icon={Shield}
          variant="gradient"
          gradient="from-indigo-600 to-indigo-700"
        />
        <StatCard
          title="Platform Visits"
          value={stats?.totalVisits?.toLocaleString() || "0"}
          icon={Search}
          variant="gradient"
          gradient="from-violet-600 to-violet-700"
        />
      </div>

      {/* Main List Section */}
      <Card className="border-none shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-card/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or phone..."
              className="pl-10 h-10 bg-background"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={tableData}
          loading={isLoading}
          pagination={
            data?.pagination ? {
              currentPage: data.pagination.currentPage,
              totalPages: data.pagination.totalPages,
              onPageChange: setPage
            } : null
          }
        />

        <SmartPagination
          currentPage={data?.pagination?.currentPage || page}
          totalPages={data?.pagination?.totalPages || 1}
          onPageChange={setPage}
        />
      </Card>

    </div>
  );
};

export default Users;
