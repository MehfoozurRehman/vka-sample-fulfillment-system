'use client';

import { PendingRow, computeStats } from './components/utils';
import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import { IconLoader } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import RequestDrawer from './components/request-drawer';
import ScreenerChart from './components/screener-chart';
import ScreenerStats from './components/screener-stats';
import { Tabs } from '@/components/ui/tabs';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/use-user';
import { useQuery } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

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
      <RequestDrawer open={!!selected} onOpenChange={(openState: boolean) => !openState && setSelected(null)} row={selected} reviewerEmail={auth.email} afterAction={() => setSelected(null)} />
    </div>
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

// Components split into separate files (stats, chart, drawer, utils).
