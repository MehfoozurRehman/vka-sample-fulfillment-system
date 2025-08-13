'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
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
    try {
      await markPacked({ id: orderId, packedBy: email, lotNumbers: lots, ...checks });
      toast.success('Order marked as packed');
      onClose();
    } catch (e) {
      toast.error((e as Error).message || 'Failed to mark packed');
    }
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
            return (
              <div key={i} className="p-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{prod ? `${prod.productName} (${prod.productId})` : 'Loading...'}</span>
                  {prod && <span className="text-xs text-muted-foreground">{prod.category}</span>}
                  {prod && <span className="text-xs text-muted-foreground">Loc: {prod.location}</span>}
                  <span className="text-xs text-muted-foreground">Qty: {p.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Lot #"
                    value={lotNumbers[String(p.productId)] || ''}
                    onChange={(e) => setLotNumbers((prev) => ({ ...prev, [String(p.productId)]: e.target.value }))}
                    className="h-8 w-40"
                  />
                </div>
                {p.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{p.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>

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

      <div className="flex justify-end">
        <Button onClick={completePacking} disabled={!Object.values(checks).every(Boolean)}>
          Complete Packing
        </Button>
      </div>
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

  const [active, setActive] = useState<Id<'orders'> | null>(null);

  const packedTodayPct = useMemo(() => {
    if (!stats || !stats.totalPacked) return '0';
    return ((stats.packedToday / stats.totalPacked) * 100).toFixed(0);
  }, [stats]);

  const trendData = useMemo(() => trend || [], [trend]);
  const queueRows = (queue as QueueRow[] | undefined) || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Ready Queue" value={queueRows.length} />
        <StatCard label="Packed (Total)" value={stats?.totalPacked || 0} />
        <StatCard label="Packed Today" value={stats?.packedToday || 0} />
        <StatCard label="Packed Today %" value={`${packedTodayPct}%`} />
      </div>

      {/* Trend */}
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

      {/* Queue Table */}
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
