'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseAsString, useQueryState } from 'nuqs';

import CustomerSearch from './components/customer-search';
import { Id } from '@/convex/_generated/dataModel';
import ReportsPanel from './components/reports-panel';
import RequestDrawer from './components/request-drawer';
import ScreenerChart from './components/screener-chart';
import ScreenerStats from './components/screener-stats';
import ScreenerTable from './components/screener-table';
import { Input as TextInput } from '@/components/ui/input';
import { api } from '@/convex/_generated/api';
import { computeStats } from './components/utils';
import dayjs from 'dayjs';
import { useAuth } from '@/hooks/use-user';
import { useQueryWithStatus } from '@/hooks/use-query';

export default function ScreenerPage() {
  const auth = useAuth();

  const { data: pendingData, isPending } = useQueryWithStatus(api.screener.pending, { limit: 500 });

  const pending = useMemo(() => pendingData ?? [], [pendingData]);

  type SelectedRow = { id: Id<'requests'>; requestId: string } | null;
  const [selected, setSelected] = useState<SelectedRow>(null);

  const [range, setRange] = useState('90');

  const { data: metrics } = useQueryWithStatus(api.screener.metrics, { days: Number(range) });

  const [search, setSearch] = useState('');

  const [tab, setTab] = useQueryState('tab', parseAsString.withDefault('queue'));

  const myHistory = useQueryWithStatus(api.screener.myHistory, { email: auth.email, limit: 300 }).data as
    | { id: Id<'requests'>; requestId: string; status: string; reviewDate?: number; reviewDateFmt?: string | null }[]
    | undefined;

  const [from, setFrom] = useState('');

  const [to, setTo] = useState('');

  const filteredHistory = useMemo(() => {
    if (!myHistory) return [] as NonNullable<typeof myHistory>;
    const fromTs = from ? Date.parse(from) : undefined;

    const toTs = to ? Date.parse(to) : undefined;

    return myHistory.filter((r) => {
      const t = r.reviewDate || 0;

      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs + 24 * 3600 * 1000 - 1) return false;

      return true;
    });
  }, [myHistory, from, to]);

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

      if (next) setSelected({ id: next.id, requestId: next.requestId });
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
            <TabsTrigger value="history">My History</TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="flex flex-col gap-6">
            <ScreenerStats stats={stats} isLoading={isPending} />
            <ScreenerChart metrics={metrics} range={range} setRange={setRange} />
            <ScreenerTable data={filtered} isPending={isPending} onSelect={(r) => setSelected({ id: r.id, requestId: r.requestId })} search={search} setSearch={setSearch} />
          </TabsContent>
          <TabsContent value="customers">
            <CustomerSearch />
          </TabsContent>
          <TabsContent value="reports">
            <ReportsPanel />
          </TabsContent>
          <TabsContent value="history">
            <div className="rounded-lg border overflow-hidden">
              <div className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-auto" />
                <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-auto" />
              </div>
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory?.length ? (
                    filteredHistory.map((r, i) => (
                      <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected({ id: r.id, requestId: r.requestId })}>
                        <TableCell>{r.requestId}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>{r.reviewDate ? dayjs(r.reviewDate).format('YYYY-MM-DD HH:mm') : '—'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No history yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
