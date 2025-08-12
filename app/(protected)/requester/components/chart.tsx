'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RecentRequestsType } from '../type';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryState, parseAsString } from 'nuqs';

const chartConfig = {
  created: {
    label: 'Requests Created',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

export function Chart({ data }: { data: RecentRequestsType }) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useQueryState('range', parseAsString.withDefault('90d'));

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    data.forEach((req) => {
      const date = req.createdAt ? req.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
      grouped[date] = (grouped[date] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([date, created]) => ({ date, created }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  useEffect(() => {
    if (isMobile) setTimeRange('7d');
  }, [isMobile, setTimeRange]);

  const referenceDate = chartData.length > 0 ? new Date(chartData[chartData.length - 1].date) : new Date();
  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    let days = 90;
    if (timeRange === '30d') days = 30;
    else if (timeRange === '7d') days = 7;
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - days);
    return date >= start;
  });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Requests Trend</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Total for the selected range</span>
          <span className="@[540px]/card:hidden">Selected range</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup type="single" value={timeRange} onValueChange={setTimeRange} variant="outline" className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex">
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden" size="sm" aria-label="Select a value">
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[120px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(value) => new Date(value as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} indicator="dot" />}
            />
            <Area dataKey="created" type="natural" fill="url(#fillCreated)" stroke="var(--primary)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
