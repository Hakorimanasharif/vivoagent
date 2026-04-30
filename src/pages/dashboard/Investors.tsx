import { useState } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  Search,
  Filter,
  Calendar,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Package,
  User as UserIcon,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  CreditCard,
  Building2,
  Smartphone,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/DataTable";



const API_BASE = 'https://globalbackend-oqoz.onrender.com';

const Investors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const agentToken = localStorage.getItem('agentToken') || '';
  const queryClient = useQueryClient();

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['investor-stats'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/investors/stats/overview`, {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!agentToken,
  });

  // Fetch investments
  const { data: investmentsData, isLoading } = useQuery({
    queryKey: ['investments', currentPage, searchTerm, statusFilter, tierFilter],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/investors`);
      url.searchParams.append('page', currentPage.toString());
      url.searchParams.append('search', searchTerm);
      if (statusFilter !== 'all') {
        url.searchParams.append('status', statusFilter);
      }
      if (tierFilter !== 'all') {
        url.searchParams.append('tier', tierFilter);
      }

      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${agentToken}` }
      });
      if (!response.ok) throw new Error('Failed to fetch investments');
      return response.json();
    },
    enabled: !!agentToken,
  });



  const columns = [
    {
      accessorKey: "user",
      header: "Investor",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
            {row.user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm truncate">{row.user?.name}</span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Phone className="h-3 w-3 text-primary/60" />
              {row.user?.phone}
            </div>
          </div>
        </div>
      )
    },
    {
      accessorKey: "product",
      header: "Product",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/50">
            {row.product?.image ? (
              <img src={row.product.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-primary/5">
                <Package className="h-5 w-5 text-primary/40" />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{row.product?.name}</span>
            <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">
              {row.product?.days} Day Plan
            </span>
          </div>
        </div>
      )
    },
    {
      accessorKey: "amount",
      header: "Financials",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <div className="font-bold text-sm">RWF {row.amount?.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
            <TrendingUp className="h-2.5 w-2.5" />
            RWF {row.product?.dailyIncome?.toLocaleString()}/day
          </div>
        </div>
      )
    },
    {
      accessorKey: "payout",
      header: "Payout Info",
      cell: ({ row }: any) => {
        const user = row.user;
        const hasBank = !!user?.bankDetails?.accountNumber;
        const provider = user?.paymentProvider;

        const mtnLogo = "https://i.pinimg.com/1200x/0a/f0/0e/0af00e1d78100d4019d3344873902d5a.jpg";
        const airtelLogo = "https://i.pinimg.com/736x/68/7c/cf/687ccf6f9a7987377f8eec6aba64e409.jpg";

        const isMTN = String(provider || '').toLowerCase().includes('mtn');
        const isAirtel = String(provider || '').toLowerCase().includes('airtel');
        const logo = isMTN ? mtnLogo : isAirtel ? airtelLogo : null;

        return (
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              {hasBank ? (
                <div className="h-10 w-10 rounded-full border-2 border-background shadow-sm bg-blue-50 flex items-center justify-center overflow-hidden">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
              ) : logo ? (
                <img src={logo} alt={provider} className="h-10 w-10 object-cover rounded-full border-2 border-background shadow-sm" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-rose-500 text-center leading-tight px-1">NOT SETTLED</span>
                </div>
              )}
              
              <div className="flex flex-col">
                <span className="text-sm font-bold font-mono tracking-wider">
                  {hasBank ? user.bankDetails.accountNumber : logo ? (user?.phone || 'N/A') : ''}
                </span>
                {hasBank && (
                  <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                    {user.bankDetails.bankName}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const isSettled = row.status === 'settled' || row.status === 'completed';
        return (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border tracking-wider",
            isSettled
              ? "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100/50"
              : "bg-amber-100 text-amber-700 border-amber-200 animate-pulse"
          )}>
            {isSettled ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            {row.status}
          </div>
        );
      }
    },

  ];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title="Investment Portfolio" breadcrumb="Investors" />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Investors"
          value={stats?.totalInvestors?.toLocaleString() || "0"}
          icon={Users}
          variant="gradient"
          gradient="from-indigo-600 to-indigo-700"
          trend={`${stats?.newThisMonth || 0} New Recently`}
          trendUp={true}
        />
        <StatCard
          title="Active Capital"
          value={`RWF ${stats?.totalInvestment?.toLocaleString() || "0"}`}
          icon={DollarSign}
          variant="gradient"
          gradient="from-emerald-600 to-emerald-700"
        />
        <StatCard
          title="Average ROI"
          value={stats?.averageROI || '0%'}
          icon={TrendingUp}
          variant="gradient"
          gradient="from-amber-600 to-amber-700"
        />
        <StatCard
          title="Active Deals"
          value={stats?.activeInvestments?.toLocaleString() || "0"}
          icon={BarChart3}
          variant="gradient"
          gradient="from-violet-600 to-violet-700"
        />
      </div>

      {/* Subscriber Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {['T0', 'T1', 'T2', 'T3', 'T4', 'T5'].map((tier) => (
          <Card key={tier} className={cn(
            "p-3 border-none shadow-md flex flex-col items-center justify-center text-center transition-all hover:scale-105",
            "bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950"
          )}>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Package className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{tier}</span>
            <span className="text-lg font-black text-primary leading-none">
              {stats?.subscribersPerTier?.[tier] || 0}
            </span>
            <span className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Subscribers</span>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card className="p-4 border-none shadow-lg flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search by investor name or phone..."
            className="pl-11 h-11 bg-muted/30 border-none shadow-inner rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-xs font-bold uppercase hidden md:inline">Filters</span>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={tierFilter} 
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-[120px] h-11 bg-muted/30 border-none rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Tiers</option>
              <option value="T0">T0 Level</option>
              <option value="T1">T1 Level</option>
              <option value="T2">T2 Level</option>
              <option value="T3">T3 Level</option>
              <option value="T4">T4 Level</option>
              <option value="T5">T5 Level</option>
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-[140px] h-11 bg-muted/30 border-none rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="settled">Settled Only</option>
              <option value="completed">Completed Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <Card className="border-none shadow-xl bg-card overflow-hidden">
        <div className="p-6 border-b border-border/50 flex justify-between items-center bg-muted/5">
          <div>
            <h4 className="font-bold text-lg">Active Portfolio List</h4>
            <p className="text-xs text-muted-foreground">Showing current investments across the platform.</p>
          </div>

        </div>
        <div className="p-0">
          <DataTable
            columns={columns}
            data={investmentsData?.investments || []}
            loading={isLoading}
            pagination={investmentsData?.pagination ? {
              currentPage: investmentsData.pagination.currentPage,
              totalPages: investmentsData.pagination.totalPages,
              onPageChange: (page) => setCurrentPage(page)
            } : null}
          />
        </div>
      </Card>
    </div>
  );
};

export default Investors;
