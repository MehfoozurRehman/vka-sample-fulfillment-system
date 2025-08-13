'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-user';
import { useMutation } from 'convex/react';
import { useQuery } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

const chartConfig: ChartConfig = {
  shipped: { label: 'Orders Shipped', color: 'var(--primary)' },
};

interface QueueRow {
  id: Id<'orders'>;
  orderId: string;
  requestId: string;
  company: string;
  contactName: string;
  country: string;
  products: number;
  packedAt: string;
}

interface DetailsData {
  order: Doc<'orders'>;
  request: Doc<'requests'>;
  stakeholder: Doc<'stakeholders'> | null | undefined;
}

function ShipDialog({ orderId, email, onClose }: { orderId: Id<'orders'>; email: string; onClose: () => void }) {
  const details = useQuery(api.shipper.details, { id: orderId }) as DetailsData | undefined;
  const markShipped = useMutation(api.shipper.markShipped);

  const [form, setForm] = useState({
    packageCount: 1,
    totalWeight: 0,
    carrier: 'FedEx',
    serviceLevel: 'Standard',
    trackingNumber: '',
    internationalDocsIncluded: false,
    shippingLabelAttached: false,
    notifyCustomer: true,
  });

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!details) return;
    if (!form.trackingNumber.trim()) {
      toast.error('Tracking number required');
      return;
    }
    try {
      await markShipped({ id: orderId, shippedBy: email, ...form });
      toast.success('Order marked as shipped');
      onClose();
    } catch (e) {
      toast.error((e as Error).message || 'Failed');
    }
  }

  if (!details)
    return (
      <div className="py-10 flex justify-center">
        <Loader className="animate-spin" />
      </div>
    );

  const address = `${details.request.contactName}\n${details.request.country}`; // placeholder (no full address in schema)

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap gap-4">
        <Info label="Order ID" value={details.order.orderId} />
        <Info label="Request ID" value={details.request.requestId} />
        <Info label="Company" value={details.stakeholder?.companyName || 'Unknown'} />
        <Info label="Packed" value={details.order.packedDate ? dayjs(details.order.packedDate).format('MMM D, YYYY HH:mm') : '—'} />
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm tracking-tight">Destination</h4>
        <div className="rounded-md border p-3 text-xs whitespace-pre-wrap bg-muted/30">{address}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium">Package Count</label>
          <Input type="number" min={1} value={form.packageCount} onChange={(e) => update('packageCount', Number(e.target.value) || 1)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Total Weight (kg)</label>
          <Input type="number" min={0} step={0.01} value={form.totalWeight} onChange={(e) => update('totalWeight', Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Carrier</label>
          <Select value={form.carrier} onValueChange={(v: string) => update('carrier', v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select carrier" />
            </SelectTrigger>
            <SelectContent>
              {['FedEx', 'UPS', 'DHL'].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium">Service Level</label>
          <Select value={form.serviceLevel} onValueChange={(v: string) => update('serviceLevel', v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select service" />
            </SelectTrigger>
            <SelectContent>
              {['Standard', 'Express', 'Overnight'].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium">Tracking Number *</label>
          <Input value={form.trackingNumber} onChange={(e) => update('trackingNumber', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold text-sm tracking-tight">Checklist</h4>
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={form.shippingLabelAttached} onCheckedChange={(v) => update('shippingLabelAttached', Boolean(v))} />
            <span>Shipping label attached</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={form.internationalDocsIncluded} onCheckedChange={(v) => update('internationalDocsIncluded', Boolean(v))} />
            <span>Commercial invoice included (if international)</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={form.notifyCustomer} onCheckedChange={(v) => update('notifyCustomer', Boolean(v))} />
            <span>Customer notification will be sent</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={!form.trackingNumber.trim() || !form.shippingLabelAttached}>
          Mark as Shipped
        </Button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}

export default function ShipperPage() {
  const { email } = useAuth();
  const { data: stats } = useQueryWithStatus(api.shipper.stats, {});
  const { data: queue, isPending } = useQueryWithStatus(api.shipper.queue, {});
  const trend = useQuery(api.shipper.trend, { days: 90 }) as { date: string; shipped: number }[] | undefined;
  const [active, setActive] = useState<Id<'orders'> | null>(null);

  const shippedTodayPct = useMemo(() => {
    if (!stats || !stats.totalShipped) return '0';
    return ((stats.shippedToday / stats.totalShipped) * 100).toFixed(0);
  }, [stats]);

  const queueRows = (queue as QueueRow[] | undefined) || [];
  const trendData = trend || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Shipping Queue" value={queueRows.length} />
        <StatCard label="Shipped (Total)" value={stats?.totalShipped || 0} />
        <StatCard label="Shipped Today" value={stats?.shippedToday || 0} />
        <StatCard label="Shipped Today %" value={`${shippedTodayPct}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Trend</CardTitle>
          <CardDescription>Orders shipped per day</CardDescription>
        </CardHeader>
        <div className="px-4 pb-6">
          <ChartContainer config={chartConfig} className="h-56">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="fillShipped" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area dataKey="shipped" type="natural" fill="url(#fillShipped)" stroke="var(--primary)" />
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
              <TableHead>Country</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Packed At</TableHead>
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
                  <TableCell>{o.country}</TableCell>
                  <TableCell>{o.products}</TableCell>
                  <TableCell>{o.packedAt}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No packed orders awaiting shipment
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Ship Order</DialogTitle>
          </DialogHeader>
          {active && <ShipDialog orderId={active} email={email} onClose={() => setActive(null)} />}
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
