'use client';

import * as React from 'react';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { useQueryWithStatus } from '@/hooks/use-query';

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  [key: string]: unknown;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover/90 backdrop-blur p-2 text-xs shadow-sm min-w-[140px]">
      {label && <div className="mb-1 font-medium text-foreground/80">{label}</div>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-medium tabular-nums">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = React.useState('90');

  const { data: overview } = useQueryWithStatus(api.analytics.overview, {});
  const { data: distributions } = useQueryWithStatus(api.analytics.distributions, {});
  const { data: timeseries, isPending: tsLoading } = useQueryWithStatus(api.analytics.timeseries, { days: Number(range) });

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 py-6">
      <div className="grid gap-4 px-4 lg:grid-cols-4 2xl:grid-cols-6 lg:px-6">
        <StatCard title="Users" value={overview?.totalUsers} subtitle={`${overview?.activeUsers ?? 0} active`} />
        <StatCard title="Stakeholders" value={overview?.totalStakeholders} subtitle={`${overview?.vipStakeholders ?? 0} VIP`} />
        <StatCard title="Products" value={overview?.totalProducts} />
        <StatCard title="Requests" value={overview?.totalRequests} subtitle={`${overview?.pendingRequests ?? 0} pending`} />
        <StatCard title="Orders" value={overview?.totalOrders} subtitle={`${overview?.openOrders ?? 0} open`} />
        <StatCard title="Audit Logs" value={overview?.totalAuditLogs} />
      </div>
      <Card className="mx-4 lg:mx-6 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4 pb-0">
          <div>
            <CardTitle>Entity Growth</CardTitle>
            <CardDescription>{range} day trend</CardDescription>
          </div>
          <ToggleGroup type="single" value={range} onValueChange={(v) => v && setRange(v)} variant="outline" className="hidden md:flex">
            <ToggleGroupItem value="7">7d</ToggleGroupItem>
            <ToggleGroupItem value="30">30d</ToggleGroupItem>
            <ToggleGroupItem value="90">90d</ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent className="h-[360px] pt-4">
          {tsLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="w-full h-56" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries?.data || []} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <defs>
                  {['users', 'stakeholders', 'products', 'requests', 'orders'].map((k, i) => (
                    <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis dataKey="date" hide={range === '7'} tickLine={false} axisLine={false} minTickGap={24} tickMargin={8} />
                <YAxis width={48} tickLine={false} axisLine={false} allowDecimals={false} tickMargin={4} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Area type="monotone" dataKey="users" name="Users" stackId="1" strokeWidth={2} stroke={COLORS[0]} fill={`url(#grad-users)`} />
                <Area type="monotone" dataKey="stakeholders" name="Stakeholders" stackId="1" strokeWidth={2} stroke={COLORS[1]} fill={`url(#grad-stakeholders)`} />
                <Area type="monotone" dataKey="products" name="Products" stackId="1" strokeWidth={2} stroke={COLORS[2]} fill={`url(#grad-products)`} />
                <Area type="monotone" dataKey="requests" name="Requests" stackId="1" strokeWidth={2} stroke={COLORS[3]} fill={`url(#grad-requests)`} />
                <Area type="monotone" dataKey="orders" name="Orders" stackId="1" strokeWidth={2} stroke={COLORS[4]} fill={`url(#grad-orders)`} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-6 px-4 lg:grid-cols-2 2xl:grid-cols-3 lg:px-6">
        <DistributionCard title="Users by Role" data={distributions?.usersByRole} type="bar" />
        <DistributionCard title="Products by Category" data={distributions?.productsByCategory} type="bar" />
        <DistributionCard title="Requests by Status" data={distributions?.requestsByStatus} type="pie" />
        <DistributionCard title="Orders by Status" data={distributions?.ordersByStatus} type="pie" />
        <DistributionCard title="Stakeholders VIP" data={distributions?.stakeholdersVip} type="pie" />
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: number | undefined; subtitle?: string }) {
  return (
    <Card className="shadow-xs @container/card relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">{title}</CardTitle>
        {subtitle && <CardDescription className="text-xs">{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums tracking-tight @[250px]/card:text-3xl">{typeof value === 'number' ? value.toLocaleString() : '—'}</div>
      </CardContent>
    </Card>
  );
}

interface DistDatum {
  label: string;
  value: number;
}

function DistributionCard({ title, data, type }: { title: string; data: DistDatum[] | undefined; type: 'bar' | 'pie' }) {
  const items: DistDatum[] = (data || []).filter((d) => d && typeof d.value === 'number');
  const total = items.reduce((a, b) => a + b.value, 0);
  const withPct = items.map((d) => ({ ...d, pct: total ? (d.value / total) * 100 : 0 }));

  return (
    <Card className="h-[360px] flex flex-col">
      <CardHeader className="pb-2 space-y-1">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{title}</span>
          {total > 0 && <span className="text-[10px] font-normal text-muted-foreground tracking-wide">Total {total}</span>}
        </CardTitle>
        <CardDescription className="text-xs">{total ? 'Distribution' : 'No data'}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] relative">
        {!total ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs text-muted-foreground">No data</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={withPct} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={38} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Count">
                  <LabelList dataKey="value" position="top" className="fill-foreground text-[10px] font-medium" />
                  {withPct.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
                <Pie
                  data={withPct}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  strokeWidth={2}
                  labelLine={false}
                  label={(p) => (p.percent && p.percent * 100 >= 8 ? `${Math.round(p.percent * 100)}%` : '')}
                >
                  {withPct.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <foreignObject x="50%" y="50%" width="0" height="0" />
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
        {type === 'pie' && total > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-lg font-semibold tabular-nums">{total}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
