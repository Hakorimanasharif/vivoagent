import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import PageHeader from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import SmartPagination from "@/components/SmartPagination";
import StatCard from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Layers, Users, TrendingUp } from "lucide-react";

const API_BASE = 'https://globalbackend-oqoz.onrender.com';

const UserTiers = () => {
  const [search, setSearch] = useState("");
  const agentToken = localStorage.getItem('agentToken') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['user-tiers', search],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/products`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!agentToken,
  });

  const products = data?.products || data || [];
  const productList = Array.isArray(products) ? products : [];

  const tableData = productList.map((p: any) => ({
    id: p._id, name: p.name || '—', tierLevel: p.tierLevel || '—',
    amount: `RWF ${Number(p.amount || 0).toLocaleString()}`,
    dailyIncome: `RWF ${Number(p.dailyIncome || 0).toLocaleString()}`,
    days: p.days || 0,
    totalReturn: `RWF ${((p.dailyIncome || 0) * (p.days || 0)).toLocaleString()}`,
    isActive: p.isActive !== false ? 'Active' : 'Inactive',
  }));

  const columns = [
    { accessorKey: "tierLevel", header: "Tier" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "amount", header: "Price" },
    { accessorKey: "dailyIncome", header: "Daily Income" },
    { accessorKey: "days", header: "Duration" },
    { accessorKey: "totalReturn", header: "Total Return" },
    { accessorKey: "isActive", header: "Status",
      cell: ({ row }: any) => (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${row.isActive === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{row.isActive}</span>
      )
    },
  ];

  return (
    <div>
      <PageHeader title="User Tiers" breadcrumb="User Tiers" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Tiers" value={productList.length.toString()} icon={Layers} variant="gradient" gradient="from-indigo-600 to-indigo-700" />
        <StatCard title="Active Tiers" value={productList.filter((p: any) => p.isActive !== false).length.toString()} icon={TrendingUp} variant="gradient" gradient="from-emerald-600 to-emerald-700" />
        <StatCard title="Tier Range" value={productList.length > 0 ? `T0 — T${productList.length - 1}` : '—'} icon={Users} variant="gradient" gradient="from-blue-600 to-blue-700" />
      </div>
      <Card className="p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tiers..." className="pl-9" />
        </div>
      </Card>
      <DataTable columns={columns} data={tableData} loading={isLoading} />
    </div>
  );
};

export default UserTiers;
