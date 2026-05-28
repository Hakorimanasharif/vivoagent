import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  Layers, Search, Pause, Square, Trash2, Play,
  Calendar, User, Loader2, CheckCircle, AlertTriangle,
  Clock, PauseCircle, StopCircle,
} from 'lucide-react';
import SmartPagination from '@/components/SmartPagination';

const API_BASE = 'https://globalbackend-oqoz.onrender.com';

const statusColor: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  stopped: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusIcon: Record<string, JSX.Element> = {
  active: <CheckCircle className="h-3 w-3" />,
  paused: <Pause className="h-3 w-3" />,
  stopped: <Square className="h-3 w-3" />,
};

export default function UserTiers() {
  const agentToken = localStorage.getItem('agentToken') || '';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Pause modal state
  const [pauseTarget, setPauseTarget] = useState<any | null>(null);
  const [pauseUntil, setPauseUntil] = useState('');

  // Confirm delete modal
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Bulk action modal states
  const [bulkStopModal, setBulkStopModal] = useState(false);
  const [bulkPauseModal, setBulkPauseModal] = useState(false);
  const [bulkPauseUntil, setBulkPauseUntil] = useState('');

  const headers = { Authorization: `Bearer ${agentToken}` };

  // ── Fetch ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['agent-tiers', search, statusFilter, page],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/users/admin/tiers`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', '25');
      if (search) url.searchParams.set('search', search);
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      const r = await fetch(url.toString(), { headers });
      if (!r.ok) throw new Error('Failed to fetch');
      return r.json();
    },
    enabled: !!agentToken,
  });

  const rows: any[] = data?.rows || [];
  const totalRows = data?.total || 0;

  // Stats from rows
  const statsActive = rows.filter(r => r.status === 'active').length;
  const statsPaused = rows.filter(r => r.status === 'paused').length;
  const statsStopped = rows.filter(r => r.status === 'stopped').length;

  // ── Mutations ────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['agent-tiers'] });

  const pauseMutation = useMutation({
    mutationFn: async ({ userId, tierId, pausedUntil }: any) => {
      const r = await fetch(`${API_BASE}/api/users/admin/tiers/${userId}/${tierId}/pause`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pausedUntil }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message); }
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Tier paused', description: 'Will auto-resume on the selected date.' }); invalidate(); setPauseTarget(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const stopMutation = useMutation({
    mutationFn: async ({ userId, tierId }: any) => {
      const r = await fetch(`${API_BASE}/api/users/admin/tiers/${userId}/${tierId}/stop`, {
        method: 'PATCH', headers,
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message); }
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Tier stopped' }); invalidate(); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const resumeMutation = useMutation({
    mutationFn: async ({ userId, tierId }: any) => {
      const r = await fetch(`${API_BASE}/api/users/admin/tiers/${userId}/${tierId}/resume`, {
        method: 'PATCH', headers,
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message); }
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Tier resumed ✅' }); invalidate(); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ userId, tierId }: any) => {
      const r = await fetch(`${API_BASE}/api/users/admin/tiers/${userId}/${tierId}`, {
        method: 'DELETE', headers,
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message); }
      return r.json();
    },
    onSuccess: () => { toast({ title: 'Tier deleted permanently.' }); invalidate(); setDeleteTarget(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ── Bulk Mutations ─────────────────────────────────────────────────────
  const bulkStopMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API_BASE}/api/users/admin/tiers/stop-all`, { method: 'PATCH', headers });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message); }
      return r.json();
    },
    onSuccess: (data) => { toast({ title: 'All tiers stopped', description: `${data.count} tier subscriptions have been stopped` }); invalidate(); setBulkStopModal(false); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const bulkPauseMutation = useMutation({
    mutationFn: async ({ pausedUntil }: { pausedUntil?: string }) => {
      const r = await fetch(`${API_BASE}/api/users/admin/tiers/pause-all`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pausedUntil }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message); }
      return r.json();
    },
    onSuccess: (data) => { toast({ title: 'All tiers paused', description: `${data.count} tier subscriptions have been paused` }); invalidate(); setBulkPauseModal(false); setBulkPauseUntil(''); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const anyLoading = pauseMutation.isPending || stopMutation.isPending || resumeMutation.isPending || deleteMutation.isPending || bulkStopMutation.isPending || bulkPauseMutation.isPending;

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="User Tier Management" 
          breadcrumb="Management / User Tiers" 
        />
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
          <Layers className="h-3.5 w-3.5" />
          <span>Real-time Monitoring Active</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Subscriptions" 
          value={String(totalRows)} 
          icon={Layers} 
          variant="gradient" 
          gradient="from-indigo-600 via-blue-600 to-cyan-500" 
        />
        <StatCard 
          title="Active Tiers" 
          value={String(statsActive)} 
          icon={CheckCircle} 
          variant="gradient" 
          gradient="from-emerald-600 via-teal-600 to-cyan-500" 
        />
        <StatCard 
          title="Paused Tiers" 
          value={String(statsPaused)} 
          icon={Pause} 
          variant="gradient" 
          gradient="from-amber-500 via-orange-500 to-yellow-500" 
        />
        <StatCard 
          title="Stopped Tiers" 
          value={String(statsStopped)} 
          icon={Square} 
          variant="gradient" 
          gradient="from-rose-600 via-red-600 to-pink-600" 
        />
      </div>

      {/* Filters */}
      <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user name, email or phone..."
              className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 transition-all"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40 bg-background/50 border-border/50">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={() => setBulkPauseModal(true)}
                disabled={statsActive === 0}
              >
                <PauseCircle className="h-4 w-4 mr-1.5" />
                Pause All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => setBulkStopModal(true)}
                disabled={statsActive === 0 && statsPaused === 0}
              >
                <StopCircle className="h-4 w-4 mr-1.5" />
                Stop All
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => invalidate()}
              className="border-border/50 bg-background/50"
              title="Refresh Data"
            >
              <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-border/50 shadow-md bg-card/50 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-1000">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="text-left px-4 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/70">User</th>
                <th className="text-left px-4 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/70">Tier Details</th>
                <th className="text-left px-4 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/70">Progress</th>
                <th className="text-left px-4 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/70">Reward</th>
                <th className="text-left px-4 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/70">Timeline</th>
                <th className="text-left px-4 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/70">Status</th>
                <th className="text-right px-4 py-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground/70">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /><p className="text-xs">Loading tiers...</p></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground"><Layers className="h-8 w-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No tier subscriptions found</p></td></tr>
              ) : rows.map((row, i) => (
                <tr key={i} className="group hover:bg-muted/40 transition-all duration-300">
                  {/* User */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20 group-hover:scale-110 transition-transform">
                          {row.userName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {row.status === 'active' && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse"></span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{row.userName}</p>
                        <p className="text-[10px] text-muted-foreground/80 truncate font-medium">ID: {row.userId?.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>

                  {/* Tier Details */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm shadow-blue-500/20">
                        {row.tierLevel || 'T'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{row.tierName || '—'}</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Level {row.tierLevel?.replace('T', '') || '0'} Plan</span>
                      </div>
                    </div>
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1.5 w-32">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold text-muted-foreground">Completion</span>
                        <span className={`font-black ${row.completedTasks >= row.taskCount ? 'text-emerald-500' : 'text-blue-500'}`}>
                          {Math.round(((row.completedTasks || 0) / (row.taskCount || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden border border-border/50">
                        <div 
                          className={`h-full transition-all duration-1000 ease-out ${row.completedTasks >= row.taskCount ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-500 to-indigo-400'}`} 
                          style={{ width: `${Math.min(100, ((row.completedTasks || 0) / (row.taskCount || 1)) * 100)}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground/70 font-medium">
                        {row.completedTasks || 0} of {row.taskCount || 0} tasks done
                      </span>
                    </div>
                  </td>

                  {/* Reward */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-sm text-emerald-600">
                        {row.rewardPerTask ? `RWF ${Number(row.rewardPerTask).toLocaleString()}` : '—'}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Per Task Earning</span>
                    </div>
                  </td>

                  {/* Timeline */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Play className="h-2.5 w-2.5 text-emerald-500" />
                        <span>Started {fmtDate(row.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                        <Clock className="h-2.5 w-2.5 text-rose-500" />
                        <span>Expires {fmtDate(row.endDate)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border shadow-sm ${statusColor[row.status] || statusColor.active} border-current/20`}>
                        <span className="relative flex h-1.5 w-1.5">
                           <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${row.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                           <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${row.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        </span>
                        {(row.status || 'active').toUpperCase()}
                      </span>
                      {row.pausedUntil && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600/80 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-200/50">
                          <Calendar className="h-2.5 w-2.5" />
                          RESUMES {fmtDate(row.pausedUntil)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {row.status !== 'paused' && row.status !== 'stopped' && (
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                          onClick={() => { setPauseTarget(row); setPauseUntil(''); }}
                          disabled={anyLoading}
                          title="Pause Plan"
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {(row.status === 'paused' || row.status === 'stopped') && (
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-emerald-600 border-emerald-200 hover:bg-amber-50 hover:text-emerald-700 transition-colors"
                          onClick={() => resumeMutation.mutate({ userId: row.userId, tierId: row.tierId })}
                          disabled={anyLoading}
                          title="Resume Plan"
                        >
                          {resumeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                      )}

                      {row.status !== 'stopped' && (
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={() => stopMutation.mutate({ userId: row.userId, tierId: row.tierId })}
                          disabled={anyLoading}
                          title="Stop Plan"
                        >
                          {stopMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                        </Button>
                      )}

                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        onClick={() => setDeleteTarget(row)}
                        disabled={anyLoading}
                        title="Delete Subscription"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <SmartPagination
          currentPage={page}
          totalPages={data?.pages || 1}
          onPageChange={setPage}
          totalItems={totalRows}
          pageSize={25}
          className="bg-muted/20 border-t"
        />
      </Card>

      {/* ── PAUSE MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={!!pauseTarget} onOpenChange={() => setPauseTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-amber-500" /> Pause Tier
            </DialogTitle>
          </DialogHeader>
          {pauseTarget && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-bold">{pauseTarget.userName}</p>
                <p className="text-muted-foreground text-xs">{pauseTarget.tierLevel} — {pauseTarget.tierName}</p>
              </div>
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  The tier will be <strong>paused</strong> immediately and <strong>automatically resume</strong> on the date you choose below.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider">Auto-Resume Date</Label>
                <Input
                  type="date"
                  value={pauseUntil}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // tomorrow minimum
                  onChange={e => setPauseUntil(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">The tier will unlock automatically at midnight on this date.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPauseTarget(null)}>Cancel</Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  disabled={!pauseUntil || pauseMutation.isPending}
                  onClick={() => pauseMutation.mutate({ userId: pauseTarget.userId, tierId: pauseTarget.tierId, pausedUntil: pauseUntil })}
                >
                  {pauseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                  Confirm Pause
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM MODAL ─────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Tier Subscription
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to <strong>permanently delete</strong> the{' '}
                <span className="font-bold text-foreground">{deleteTarget.tierLevel} ({deleteTarget.tierName})</span> subscription for{' '}
                <span className="font-bold text-foreground">{deleteTarget.userName}</span>? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button
                  variant="destructive" className="flex-1"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ userId: deleteTarget.userId, tierId: deleteTarget.tierId })}
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete Forever
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── BULK STOP ALL MODAL ────────────────────────────────────────────── */}
      <Dialog open={bulkStopModal} onOpenChange={() => setBulkStopModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <StopCircle className="h-5 w-5" /> Stop All Tiers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">
                This will <strong>stop ALL active and paused</strong> tier subscriptions at once. Users will not be able to earn rewards until resumed manually.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setBulkStopModal(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                disabled={bulkStopMutation.isPending}
                onClick={() => bulkStopMutation.mutate()}
              >
                {bulkStopMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Square className="h-4 w-4 mr-2" />}
                Stop All ({statsActive + statsPaused})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── BULK PAUSE ALL MODAL ────────────────────────────────────────────── */}
      <Dialog open={bulkPauseModal} onOpenChange={() => setBulkPauseModal(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <PauseCircle className="h-5 w-5" /> Pause All Tiers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This will <strong>pause ALL active</strong> tier subscriptions at once. They will automatically resume after 7 days unless you set a custom date.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider">Auto-Resume Date (Optional)</Label>
              <Input
                type="date"
                value={bulkPauseUntil}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                onChange={e => setBulkPauseUntil(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Leave empty to use default 7-day pause period.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setBulkPauseModal(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                disabled={bulkPauseMutation.isPending}
                onClick={() => bulkPauseMutation.mutate({ pausedUntil: bulkPauseUntil || undefined })}
              >
                {bulkPauseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                Pause All ({statsActive})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}