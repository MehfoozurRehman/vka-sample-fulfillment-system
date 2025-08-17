'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo, useState } from 'react';

import { Chart } from './components/chart';
import { DataTable } from './components/table';
import { Id } from '@/convex/_generated/dataModel';
import { RequestDetailsDrawer } from './components/request-details';
import { Stats } from './components/stats';
import { Input as TextInput } from '@/components/ui/input';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { useAuth } from '@/hooks/use-user';
import { useQueryWithStatus } from '@/hooks/use-query';

export default function RequesterPage() {
  const auth = useAuth();

  const { data, isPending } = useQueryWithStatus(api.request.my, { userId: auth.id, limit: 200 });

  type HistoryRow = { id: Id<'requests'>; requestId: string; status: string; createdAt: number; reviewDate?: number; packedDate?: number; shippedDate?: number; company: string; stage: string };
  const history = useQueryWithStatus(api.request.myHistory, { userId: auth.id, limit: 200 }).data as HistoryRow[] | undefined;

  const [from, setFrom] = useState('');

  const [to, setTo] = useState('');

  const [open, setOpen] = useState(false);

  const [activeRow, setActiveRow] = useState<HistoryRow | null>(null);

  const filteredHistory = useMemo(() => {
    if (!history) return [] as NonNullable<typeof history>;
    const fromTs = from ? Date.parse(from) : undefined;

    const toTs = to ? Date.parse(to) : undefined;

    return history.filter((r) => {
      const t = r.createdAt || 0;

      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs + 24 * 3600 * 1000 - 1) return false;

      return true;
    });
  }, [history, from, to]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <Tabs defaultValue="dashboard" className="px-4">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="history">My History</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <div className="flex flex-col gap-4">
              <Stats data={data || []} />
              <Chart data={data || []} />
              <DataTable data={data || []} isPending={isPending} />
            </div>
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
                    <TableHead>Submitted</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead>Packed</TableHead>
                    <TableHead>Shipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory?.length ? (
                    filteredHistory.map((r, i) => (
                      <TableRow
                        key={i}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setActiveRow(r);
                          setOpen(true);
                        }}
                      >
                        <TableCell>{r.requestId}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                        <TableCell>{r.reviewDate ? dayjs(r.reviewDate).format('YYYY-MM-DD HH:mm') : '—'}</TableCell>
                        <TableCell>{r.packedDate ? dayjs(r.packedDate).format('YYYY-MM-DD HH:mm') : '—'}</TableCell>
                        <TableCell>{r.shippedDate ? dayjs(r.shippedDate).format('YYYY-MM-DD HH:mm') : '—'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No history yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <RequestDetailsDrawer open={open} onOpenChange={setOpen} row={activeRow} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
