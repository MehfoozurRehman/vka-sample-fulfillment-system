'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo, useState, useTransition } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader } from 'lucide-react';
import { Input as TextInput } from '@/components/ui/input';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-user';
import { useQueryWithStatus } from '@/hooks/use-query';

interface QueueRow {
  id: Id<'orders'>;
  orderId: string;
  requestId: string;
  company: string;
  contactName: string;
  products: number;
  priority: string;
  createdAt: string;
}

interface DetailsData {
  order: Doc<'orders'>;
  request: Doc<'requests'>;
  stakeholder: Doc<'stakeholders'> | null | undefined;
  products: (Doc<'products'> | null)[];
}

type Checklist = {
  pickedCorrect: boolean;
  coaIncluded: boolean;
  sdsIncluded: boolean;
  specsIncluded: boolean;
  labelsApplied: boolean;
  packingListIncluded: boolean;
};

const chartConfig: ChartConfig = {
  packed: { label: 'Orders Packed', color: 'var(--primary)' },
};

function PackingDialog({ orderId, email, onClose }: { orderId: Id<'orders'>; email: string; onClose: () => void }) {
  const details = useQuery(api.packer.details, { id: orderId }) as DetailsData | undefined;

  const markPacked = useMutation(api.packer.markPacked);

  const [lotNumbers, setLotNumbers] = useState<Record<string, string>>({});

  const [checks, setChecks] = useState<Checklist>({
    pickedCorrect: false,
    coaIncluded: false,
    sdsIncluded: false,
    specsIncluded: false,
    labelsApplied: false,
    packingListIncluded: false,
  });

  const productMap = useMemo(() => {
    const m = new Map<Id<'products'>, Doc<'products'>>();

    details?.products.filter(Boolean).forEach((p) => m.set((p as Doc<'products'>)._id, p as Doc<'products'>));

    return m;
  }, [details]);

  const isPacked = useMemo(() => {
    const status = (details?.order?.status || '').toLowerCase();

    return !!details?.order?.packedDate || status === 'packed' || status === 'shipped' || status === 'completed';
  }, [details]);

  const existingLots = useMemo(() => {
    try {
      const raw = details?.order?.lotNumbers;

      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;

      const map: Record<string, string> = {};

      if (Array.isArray(arr)) {
        for (const it of arr) {
          if (it && it.productId && typeof it.lot !== 'undefined') map[String(it.productId)] = String(it.lot);
        }
      }

      return map;
    } catch {
      return {} as Record<string, string>;
    }
  }, [details]);

  const [isSubmitting, startSubmitting] = useTransition();

  async function completePacking() {
    if (!details) return;
    const lots = details.request.productsRequested.map((p) => ({ productId: p.productId, lot: lotNumbers[String(p.productId)] || '' }));

    if (lots.some((l) => !l.lot.trim())) {
      toast.error('Enter lot numbers for all products');

      return;
    }

    if (!Object.values(checks).every(Boolean)) {
      toast.error('Please confirm all checklist items');

      return;
    }

    startSubmitting(async () => {
      try {
        await markPacked({ id: orderId, packedBy: email, lotNumbers: lots, ...checks });
        toast.success('Order marked as packed');
        onClose();
      } catch (e) {
        toast.error((e as Error).message || 'Failed to mark packed');
      }
    });
  }

  if (!details)
    return (
      <div className="py-10 flex justify-center">
        <Loader className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap gap-4">
        <Info label="Order ID" value={details.order.orderId} />
        <Info label="Request ID" value={details.request.requestId} />
        <Info label="Company" value={details.stakeholder?.companyName || 'Unknown'} />
        <Info label="Submitted" value={dayjs(details.request.createdAt).format('MMM D, YYYY HH:mm')} />
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm tracking-tight">Products</h4>
        <div className="rounded-md border divide-y">
          {details.request.productsRequested.map((p, i) => {
            const prod = productMap.get(p.productId);

            const lotDisplay = existingLots[String(p.productId)];

            return (
              <div key={i} className="p-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{prod ? `${prod.productName} (${prod.productId})` : 'Loading...'}</span>
                  {prod && <span className="text-xs text-muted-foreground">{prod.category}</span>}
                  {prod && <span className="text-xs text-muted-foreground">Loc: {prod.location}</span>}
                  <span className="text-xs text-muted-foreground">Qty: {p.quantity}</span>
                </div>
                {!isPacked ? (
                  <div className="flex items-center gap-2">
                    <TextInput
                      placeholder="Lot #"
                      value={lotNumbers[String(p.productId)] || ''}
                      onChange={(e) => setLotNumbers((prev) => ({ ...prev, [String(p.productId)]: e.target.value }))}
                      className="h-8 w-40"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5">Lot: {lotDisplay || '—'}</span>
                  </div>
                )}
                {p.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{p.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {!isPacked && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm tracking-tight">Checklist</h4>
          <div className="grid gap-2">
            {Object.entries({
              pickedCorrect: 'Items picked from correct locations',
              coaIncluded: 'COA documents included',
              sdsIncluded: 'SDS documents included',
              specsIncluded: 'Specification sheets included',
              labelsApplied: 'Labels printed and applied',
              packingListIncluded: 'Packing list included',
            }).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-xs">
                <Checkbox checked={(checks as Checklist)[k as keyof Checklist]} onCheckedChange={(v) => setChecks((c) => ({ ...c, [k]: Boolean(v) }))} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!isPacked && (
        <div className="flex justify-end">
          <Button onClick={completePacking} disabled={isSubmitting || !Object.values(checks).every(Boolean)}>
            {isSubmitting && <Loader className="mr-2 size-4 animate-spin" />} Complete Packing
          </Button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}

export default function PackerPage() {
  const { email } = useAuth();

  const { data: stats } = useQueryWithStatus(api.packer.stats, {});

  const { data: queue, isPending } = useQueryWithStatus(api.packer.queue, {});

  const trend = useQuery(api.packer.trend, { days: 90 }) as { date: string; packed: number }[] | undefined;

  const myHistory = useQuery(api.packer.myHistory, { email, limit: 200 }) as
    | { id: Id<'orders'>; orderId: string; packedDate?: number; shippedDate?: number; status: string; requestId?: string }[]
    | undefined;

  const [active, setActive] = useState<Id<'orders'> | null>(null);

  const packedTodayPct = useMemo(() => {
    if (!stats || !stats.totalPacked) return '0';

    return ((stats.packedToday / stats.totalPacked) * 100).toFixed(0);
  }, [stats]);

  const trendData = useMemo(() => trend || [], [trend]);

  const queueRows = (queue as QueueRow[] | undefined) || [];

  const [from, setFrom] = useState('');

  const [to, setTo] = useState('');

  const filteredHistory = useMemo(() => {
    if (!myHistory) return [] as NonNullable<typeof myHistory>;
    const fromTs = from ? Date.parse(from) : undefined;

    const toTs = to ? Date.parse(to) : undefined;

    return myHistory.filter((r) => {
      const t = r.packedDate || 0;

      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs + 24 * 3600 * 1000 - 1) return false;

      return true;
    });
  }, [myHistory, from, to]);

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="history">My History</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="flex flex-col gap-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Ready Queue" value={queueRows.length} />
            <StatCard label="Packed (Total)" value={stats?.totalPacked || 0} />
            <StatCard label="Packed Today" value={stats?.packedToday || 0} />
            <StatCard label="Packed Today %" value={`${packedTodayPct}%`} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Packing Trend</CardTitle>
              <CardDescription>Orders packed per day</CardDescription>
            </CardHeader>
            <div className="px-4 pb-6">
              <ChartContainer config={chartConfig} className="h-56">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="fillPacked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area dataKey="packed" type="natural" fill="url(#fillPacked)" stroke="var(--primary)" />
                </AreaChart>
              </ChartContainer>
            </div>
          </Card>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader className="mx-auto animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : queueRows.length ? (
                  queueRows.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setActive(o.id)}>
                      <TableCell>{o.orderId}</TableCell>
                      <TableCell>{o.requestId}</TableCell>
                      <TableCell>{o.company}</TableCell>
                      <TableCell>{o.contactName}</TableCell>
                      <TableCell>{o.products}</TableCell>
                      <TableCell>
                        <Badge variant={o.priority === 'High' ? 'destructive' : o.priority === 'Medium' ? 'secondary' : 'outline'} className="capitalize">
                          {o.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{o.createdAt}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No orders in queue
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="history">
          <div className="rounded-lg border overflow-hidden">
            <div className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-auto" />
              <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-auto" />
            </div>
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Packed At</TableHead>
                  <TableHead>Shipped At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory?.length ? (
                  filteredHistory.map((r, i) => (
                    <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setActive(r.id)}>
                      <TableCell>{r.orderId}</TableCell>
                      <TableCell>{r.requestId || '—'}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell>{r.packedDate ? dayjs(r.packedDate).format('YYYY-MM-DD HH:mm') : '—'}</TableCell>
                      <TableCell>{r.shippedDate ? dayjs(r.shippedDate).format('YYYY-MM-DD HH:mm') : '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No history yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Packing Order</DialogTitle>
          </DialogHeader>
          {active && <PackingDialog orderId={active} email={email} onClose={() => setActive(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
