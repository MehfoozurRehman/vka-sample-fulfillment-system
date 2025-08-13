'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMutation, useQuery } from 'convex/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconLoader } from '@tabler/icons-react';
import type { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { useAuth } from '@/hooks/use-user';
import { useQueryWithStatus } from '@/hooks/use-query';

interface PendingRow {
  id: Id<'requests'>;
  requestId: string;
  company: string;
  vip: boolean;
  products: number;
  applicationType: string;
  projectName: string;
  createdAt: number;
  createdAtFmt: string;
}
interface ScreenerMetrics {
  rangeDays: number;
  daily: { date: string; approved: number; rejected: number; pending: number }[];
  approvalRate30d: number;
  approved30: number;
  rejected30: number;
  ageBuckets: { under24: number; between24and48: number; over48: number };
  totals: { totalPending: number; vipPending: number; avgItemsPending: number };
  topPending: { company: string; count: number; vip: boolean }[];
  topVolume30d: { company: string; count: number; vip: boolean }[];
}

export default function ScreenerPage() {
  const auth = useAuth();

  const { data: pendingData, isPending } = useQueryWithStatus(api.screener.pending, { limit: 500 });

  const pending = useMemo(() => (pendingData as PendingRow[] | undefined) ?? [], [pendingData]);

  const [selected, setSelected] = useState<PendingRow | null>(null);

  const [range, setRange] = useState('90');

  const metrics = useQuery(api.screener.metrics, { days: Number(range) }) as ScreenerMetrics | undefined;

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return pending;

    return pending.filter((r) => [r.requestId, r.company, r.applicationType, r.projectName].some((f) => f.toLowerCase().includes(q)));
  }, [pending, search]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <ScreenerStats stats={stats} isLoading={isPending} />
        <div className="px-4 lg:px-6">
          <ScreenerChart metrics={metrics} range={range} setRange={setRange} />
        </div>
        <ScreenerTable data={filtered} isPending={isPending} onSelect={(r) => setSelected(r)} search={search} setSearch={setSearch} />
      </div>
      <RequestDrawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)} row={selected} reviewerEmail={auth.email} afterAction={() => setSelected(null)} />
    </div>
  );
}

function ScreenerStats({ stats, isLoading }: { stats: ReturnType<typeof computeStats>; isLoading: boolean }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-6">
      <StatCard label="Pending" value={stats.total} loading={isLoading} />
      <StatCard label="VIP Pending" value={stats.vip} loading={isLoading} />
      <StatCard label="Avg Items" value={stats.avgItems} loading={isLoading} />
      <StatCard label="<24h" value={stats.under24} loading={isLoading} />
      <StatCard label="24-48h" value={stats.over24} loading={isLoading} />
      <StatCard label=">48h" value={stats.over48} loading={isLoading} />
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <Card data-slot="card" className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{loading ? '—' : value.toLocaleString()}</CardTitle>
      </CardHeader>
    </Card>
  );
}

const flowChartConfig: ChartConfig = {
  approved: { label: 'Approved', color: 'var(--success)' },
  rejected: { label: 'Rejected', color: 'var(--destructive)' },
  pending: { label: 'Pending', color: 'var(--warning)' },
};

function ScreenerChart({ metrics, range, setRange }: { metrics?: ScreenerMetrics; range: string; setRange: (v: string) => void }) {
  const daily = metrics?.daily || [];

  const age = metrics?.ageBuckets || { under24: 0, between24and48: 0, over48: 0 };

  const ageData = [
    { bucket: '<24h', value: age.under24 },
    { bucket: '24-48h', value: age.between24and48 },
    { bucket: '>48h', value: age.over48 },
  ];

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Screening Activity</CardTitle>
        <CardDescription>Approvals, rejections & age distribution</CardDescription>
        <div className="flex gap-2 pt-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30d</SelectItem>
              <SelectItem value="60">60d</SelectItem>
              <SelectItem value="90">90d</SelectItem>
              <SelectItem value="120">120d</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <ChartContainer config={flowChartConfig} className="aspect-auto h-[170px] w-full">
            <AreaChart data={daily} stackOffset="expand">
              <defs>
                <linearGradient id="fillApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.85} /> {/* emerald-500 */}
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} /> {/* red-500 */}
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e42" stopOpacity={0.8} /> {/* amber-500 */}
                  <stop offset="95%" stopColor="#f59e42" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" /> {/* subtle grid */}
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area
                dataKey="approved"
                type="monotone"
                stackId="a"
                fill="url(#fillApproved)"
                stroke="#16a34a" // emerald-600
                strokeWidth={2}
                dot={false}
              />
              <Area
                dataKey="rejected"
                type="monotone"
                stackId="a"
                fill="url(#fillRejected)"
                stroke="#dc2626" // red-600
                strokeWidth={2}
                dot={false}
              />
              <Area
                dataKey="pending"
                type="monotone"
                stackId="a"
                fill="url(#fillPending)"
                stroke="#d97706" // amber-700
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
        <div>
          <ChartContainer config={{ value: { label: 'Requests' } }} className="aspect-auto h-[170px] w-full">
            <BarChart data={ageData}>
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
              <Bar dataKey="value" radius={6} fill="var(--primary)" />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ScreenerTable({
  data,
  isPending,
  onSelect,
  search,
  setSearch,
}: {
  data: PendingRow[];
  isPending: boolean;
  onSelect: (r: PendingRow) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  return (
    <Tabs value={'all'} className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-end px-4 lg:px-6 gap-2">
        <Input placeholder="Search id, company, app, project..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="hidden md:table-cell">Application</TableHead>
                <TableHead className="hidden lg:table-cell">Project</TableHead>
                <TableHead className="hidden md:table-cell">Items</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24">
                    <div className="flex w-full items-center justify-center">
                      <IconLoader className="animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length ? (
                data.map((row) => {
                  const ageH = (Date.now() - row.createdAt) / 3600000;

                  const dot = ageH > 48 ? 'bg-red-500' : ageH > 24 ? 'bg-amber-500' : 'bg-emerald-500';

                  return (
                    <TableRow key={row.id} className="relative z-0 cursor-pointer" onClick={() => onSelect(row)}>
                      <TableCell className="font-mono text-xs flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        {row.requestId}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        <span title={row.company}>{row.company}</span>
                        {row.vip && (
                          <Badge variant="destructive" className="ml-1">
                            VIP
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[140px] truncate" title={row.applicationType}>
                        {row.applicationType}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[160px] truncate" title={row.projectName}>
                        {row.projectName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{row.products}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{row.createdAtFmt}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Tabs>
  );
}

function RequestDrawer({
  open,
  onOpenChange,
  row,
  reviewerEmail,
  afterAction,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: PendingRow | null;
  reviewerEmail: string;
  afterAction: () => void;
}) {
  const approveMut = useMutation(api.screener.approve);

  const rejectMut = useMutation(api.screener.reject);

  const [notes, setNotes] = useState('');

  const [reason, setReason] = useState('');

  const [isSaving, startSaving] = useTransition();

  const [currentId, setCurrentId] = useState<Id<'requests'> | null>(null);

  useEffect(() => {
    if (row) setCurrentId(row.id);
  }, [row]);

  const canReject = reason.trim().length > 2;

  const detailData = useQuery(api.screener.detail, currentId ? { id: currentId } : 'skip');

  const vip = !!detailData?.stakeholder?.vipFlag;

  const handleSelect = (id: Id<'requests'>) => {
    setCurrentId(id);
    setNotes('');
    setReason('');
  };

  return (
    <Drawer direction={'right'} open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-xl">
        <DrawerHeader>
          <DrawerTitle>Request Details</DrawerTitle>
          <DrawerDescription>{row ? 'Review & take action' : 'Select a request'}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-6">
          {!row && <div className="text-xs text-muted-foreground">No request selected.</div>}
          {row && !detailData && <div className="text-xs text-muted-foreground animate-pulse">Loading details...</div>}
          {row && detailData && (
            <>
              <div className={`rounded-md border p-4 bg-card/40 backdrop-blur-sm space-y-3 relative ${vip ? 'ring-2 ring-destructive/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm font-mono">{detailData.request.requestId}</div>
                  {vip && <Badge variant="destructive">VIP</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] leading-relaxed">
                  <LabelVal label="Company" value={detailData.stakeholder?.companyName} />
                  <LabelVal label="Application" value={detailData.request.applicationType} />
                  <LabelVal label="Project" value={detailData.request.projectName} />
                  <LabelVal label="Submitted" value={dayjs(detailData.request.createdAt).format('MMM D, YYYY h:mm A')} />
                </div>
              </div>
              {detailData.productsDetailed && detailData.productsDetailed.length > 0 && (
                <Card className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Requested Products</CardTitle>
                    <CardDescription className="text-xs">Items included in this request</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="max-h-48 overflow-auto rounded-md border">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-10">
                          <TableRow>
                            <TableHead className="w-28">Product ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-16 text-right">Qty</TableHead>
                            <TableHead className="hidden lg:table-cell">Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailData.productsDetailed.map((p: { id: string; productId?: string; name?: string; quantity: number; notes?: string }) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.productId || '—'}</TableCell>
                              <TableCell className="truncate" title={p.name}>
                                {p.name || '—'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">{p.quantity}</TableCell>
                              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate" title={p.notes}>
                                {p.notes || ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              <RecentRequestsPanel data={detailData.lastFive} total={detailData.totalSamples12mo} onSelect={handleSelect} activeId={currentId} />
              <div className="space-y-3">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" className="resize-none h-24" />
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason (required to reject)" />
                <div className="flex gap-2">
                  <Button
                    disabled={isSaving || !currentId}
                    onClick={() => {
                      if (!currentId) return;
                      startSaving(async () => {
                        await approveMut({ id: currentId, reviewedBy: reviewerEmail, notes: notes || undefined });
                        afterAction();
                      });
                    }}
                  >
                    {isSaving && <Loader className="mr-2 size-4 animate-spin" />} Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isSaving || !currentId || !canReject}
                    onClick={() => {
                      if (!currentId || !canReject) return;
                      startSaving(async () => {
                        await rejectMut({ id: currentId, reviewedBy: reviewerEmail, reason: reason.trim(), notes: notes || undefined });
                        afterAction();
                      });
                    }}
                  >
                    {isSaving && <Loader className="mr-2 size-4 animate-spin" />} Reject
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground">Approvals create an order. Rejections require a reason. All actions are audit logged.</div>
              </div>
            </>
          )}
        </div>
        <DrawerFooter>
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function LabelVal({ label, value }: { label: string; value?: string }) {
  return (
    <div className="contents">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value || '—'}</div>
    </div>
  );
}

function RecentRequestsPanel({
  data,
  total,
  onSelect,
  activeId,
}: {
  data: { id: Id<'requests'>; requestId: string; status: string; createdAtFmt: string; products: number }[];
  total: number;
  onSelect: (id: Id<'requests'>) => void;
  activeId: Id<'requests'> | null;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Recent Requests</CardTitle>
        <CardDescription className="text-xs">Last 5 from this company</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1 text-xs max-h-40 overflow-auto pr-1">
          {data.map((i) => (
            <li
              key={i.id}
              className={`grid grid-cols-3 gap-2 items-center cursor-pointer rounded-sm px-1 py-0.5 transition-colors ${activeId === i.id ? 'bg-muted' : 'hover:bg-muted/60'}`}
              onClick={() => onSelect(i.id)}
            >
              <span className="font-mono truncate" title={i.requestId}>
                {i.requestId}
              </span>
              <span className="truncate" title={i.status}>
                {i.status}
              </span>
              <span className="text-muted-foreground text-right" title={i.createdAtFmt}>
                {i.createdAtFmt}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-[10px] text-muted-foreground">Total Units (12 mo): {total}</div>
      </CardContent>
    </Card>
  );
}

function computeStats(rows: PendingRow[]) {
  const total = rows.length;

  const vip = rows.filter((r) => r.vip).length;

  const avgItems = total ? Math.round(rows.reduce((s, r) => s + r.products, 0) / total) : 0;

  const now = Date.now();

  let over24 = 0;

  let over48 = 0;

  rows.forEach((r) => {
    const age = now - r.createdAt;

    if (age > 48 * 3600 * 1000) over48++;
    else if (age > 24 * 3600 * 1000) over24++;
  });
  const under24 = total - over24 - over48;

  return { total, vip, avgItems, under24, over24, over48 };
}
