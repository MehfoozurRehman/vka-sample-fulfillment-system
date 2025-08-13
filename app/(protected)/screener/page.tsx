'use client';

import { PendingRow, computeStats } from './components/utils';
import React, { useCallback, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import CustomerSearch from './components/customer-search';
import ReportsPanel from './components/reports-panel';
import RequestDrawer from './components/request-drawer';
import ScreenerChart from './components/screener-chart';
import ScreenerStats from './components/screener-stats';
import ScreenerTable from './components/screener-table';
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

  const [tab, setTab] = useState('queue');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return pending;

    return pending.filter((r) => [r.requestId, r.company, r.applicationType, r.projectName].some((f) => f.toLowerCase().includes(q)));
  }, [pending, search]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const handleAfterAction = useCallback(
    (id: string) => {
      const ordered = [...filtered].sort((a, b) => a.createdAt - b.createdAt);

      const idx = ordered.findIndex((r) => r.id === id);

      const next = ordered[idx + 1] || null;

      if (next) setSelected(next);
      else setSelected(null);
    },
    [filtered],
  );

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full flex-col gap-4 px-2">
          <TabsList>
            <TabsTrigger value="queue">Approval Queue ({pending.length})</TabsTrigger>
            <TabsTrigger value="customers">Customer Search</TabsTrigger>
            <TabsTrigger value="reports">Reports & Export</TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="flex flex-col gap-6">
            <ScreenerStats stats={stats} isLoading={isPending} />
            <ScreenerChart metrics={metrics} range={range} setRange={setRange} />
            <ScreenerTable data={filtered} isPending={isPending} onSelect={(r) => setSelected(r)} search={search} setSearch={setSearch} />
          </TabsContent>
          <TabsContent value="customers">
            <CustomerSearch />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsPanel />
          </TabsContent>
        </Tabs>
      </div>
      <RequestDrawer
        open={!!selected}
        onOpenChange={(openState: boolean) => !openState && setSelected(null)}
        row={selected}
        reviewerEmail={auth.email}
        afterAction={(processedId: string) => handleAfterAction(processedId)}
      />
    </div>
  );
}
