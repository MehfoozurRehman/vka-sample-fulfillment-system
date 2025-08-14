import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

type ScreenerMetrics = NonNullable<ReturnType<typeof useQuery<typeof api.screener.metrics>>>;

const flowChartConfig: ChartConfig = {
  approved: { label: 'Approved', color: 'var(--success)' },
  rejected: { label: 'Rejected', color: 'var(--destructive)' },
  pending: { label: 'Pending', color: 'var(--warning)' },
};

export default function ScreenerChart({ metrics, range, setRange }: { metrics?: ScreenerMetrics; range: string; setRange: (v: string) => void }) {
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
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.08} />
                </linearGradient>
                <linearGradient id="fillPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e42" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e42" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area dataKey="approved" type="monotone" stackId="a" fill="url(#fillApproved)" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Area dataKey="rejected" type="monotone" stackId="a" fill="url(#fillRejected)" stroke="#dc2626" strokeWidth={2} dot={false} />
              <Area dataKey="pending" type="monotone" stackId="a" fill="url(#fillPending)" stroke="#d97706" strokeWidth={2} dot={false} />
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
