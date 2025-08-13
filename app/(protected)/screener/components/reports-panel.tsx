'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, Legend as RechartsLegend, Tooltip as RechartsTooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useQueryWithStatus } from '@/hooks/use-query';

const reportOptions = [
  { value: 'PendingRequestsByAge', label: 'Pending Requests by Age' },
  { value: 'Top10CustomersThisMonth', label: 'Top 10 Customers' },
  { value: 'ProductsRequestedThisWeek', label: 'Products Requested' },
  { value: 'RejectionReasonsSummary', label: 'Rejection Reasons Summary' },
  { value: 'AverageProcessingTime', label: 'Average Processing Time' },
];

interface PendingAgeReport {
  type: 'PendingRequestsByAge';
  under24: number;
  between24and48: number;
  over48: number;
}
interface TopCustomersReport {
  type: 'Top10CustomersThisMonth' | 'TopCustomers';
  top: { company: string; count: number }[];
}
interface ProductsReport {
  type: 'ProductsRequestedThisWeek' | 'ProductsRequested';
  products: { name: string; count: number }[];
}
interface RejectionReasonsReport {
  type: 'RejectionReasonsSummary';
  reasons: { reason: string; count: number }[];
}
interface AvgProcTimeReport {
  type: 'AverageProcessingTime';
  averageMs: number;
  averageHours: number;
}

type ChartRow = { bucket: string; value: number } | { label: string; count: number };
type ReportData = PendingAgeReport | TopCustomersReport | ProductsReport | RejectionReasonsReport | AvgProcTimeReport;

export default function ReportsPanel() {
  const [report, setReport] = useState('PendingRequestsByAge');

  const [range, setRange] = useState('30');

  const [anchorTo, setAnchorTo] = useState(() => Date.now());

  const from = useMemo(() => anchorTo - Number(range) * 24 * 3600 * 1000, [range, anchorTo]);

  const { data, isPending } = useQueryWithStatus(api.screener.reports, { report, from, to: anchorTo });

  const typedData = data as ReportData | undefined;

  const [exportOpen, setExportOpen] = useState(false);

  const { data: exportData } = useQueryWithStatus(api.screener.exportRequests, exportOpen ? { all: false, from, to: anchorTo } : 'skip');

  const chart = useMemo(() => {
    if (!typedData) return null;

    switch (typedData.type) {
      case 'PendingRequestsByAge':
        return {
          kind: 'bar',
          rows: [
            { bucket: '<24h', value: typedData.under24 },
            { bucket: '24-48h', value: typedData.between24and48 },
            { bucket: '>48h', value: typedData.over48 },
          ],
        } as const;
      case 'Top10CustomersThisMonth':
      case 'TopCustomers':
        return { kind: 'bar', rows: typedData.top.map((t) => ({ label: t.company, count: t.count })) } as const;
      case 'ProductsRequestedThisWeek':
      case 'ProductsRequested':
        return { kind: 'bar', rows: typedData.products.map((p) => ({ label: p.name, count: p.count })) } as const;
      case 'RejectionReasonsSummary':
        return { kind: 'pie', rows: typedData.reasons.map((r) => ({ label: r.reason, count: r.count })) } as const;
      case 'AverageProcessingTime':
        return { kind: 'stat', value: typedData.averageHours } as const;
      default:
        return null;
    }
  }, [typedData]);

  const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#06b6d4', '#f472b6', '#8b5cf6', '#10b981'];

  const axisTickColor = 'hsl(var(--foreground, 0 0% 100%))';

  const barGradientId = 'reportBarGradient';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 space-y-2">
          <CardTitle className="text-sm">Reports & Export</CardTitle>
          <CardDescription>Visual summaries of screening activity</CardDescription>
          <div className="flex flex-wrap gap-4 items-end pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium">Report Type</span>
              <Select value={report} onValueChange={setReport}>
                <SelectTrigger className="w-64 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs max-h-60">
                  {reportOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium">Date Range</span>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAnchorTo(Date.now())} className="h-8 text-xs">
              Refresh
            </Button>
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  Export CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Export Requests</DialogTitle>
                </DialogHeader>
                <div className="text-xs space-y-2">
                  <div>
                    Exporting current date range ({dayjs(from).format('YYYY-MM-DD')} – {dayjs(anchorTo).format('YYYY-MM-DD')}).
                  </div>
                  {exportData && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([exportData.csv], { type: 'text/csv;charset=utf-8;' });

                        const link = window.document.createElement('a');

                        const url = URL.createObjectURL(blob);

                        link.setAttribute('href', url);
                        link.setAttribute('download', exportData.filename);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        toast.success('Download started');
                      }}
                    >
                      Download {exportData.filename}
                    </Button>
                  )}
                </div>
                <DialogFooter></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {isPending && (
            <div className="text-xs text-muted-foreground flex items-center justify-center h-24">
              <Loader className="animate-spin" />
            </div>
          )}
          {typedData && chart?.kind === 'bar' && (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  const rows = chart.rows as ChartRow[];

                  const first = rows[0] as ChartRow | undefined;

                  const hasBucket = !!first && 'bucket' in first;

                  const valueKey = hasBucket ? 'value' : 'count';

                  return (
                    <BarChart data={rows}>
                      <defs>
                        <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey={hasBucket ? 'bucket' : 'label'} tick={{ fontSize: 11, fill: axisTickColor }} stroke="hsl(var(--border))" />
                      <YAxis tick={{ fontSize: 11, fill: axisTickColor }} stroke="hsl(var(--border))" allowDecimals={false} />
                      <RechartsTooltip
                        cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12, borderRadius: 6 }}
                      />
                      <RechartsLegend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey={valueKey} radius={[4, 4, 0, 0]} fill={`url(#${barGradientId})`}>
                        <LabelList dataKey={valueKey} position="top" fill={axisTickColor} fontSize={10} />
                        {rows.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  );
                })()}
              </ResponsiveContainer>
            </div>
          )}
          {typedData && chart?.kind === 'pie' && (
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12, borderRadius: 6 }}
                  />
                  <RechartsLegend wrapperStyle={{ fontSize: 11 }} />
                  <Pie data={chart.rows as ChartRow[]} dataKey="count" nameKey="label" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {(chart.rows as ChartRow[]).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {typedData && <ReportSummary data={typedData} />}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportSummary({ data }: { data: PendingAgeReport | TopCustomersReport | ProductsReport | RejectionReasonsReport | AvgProcTimeReport }) {
  if (!data) return null;
  const commonCls = 'mt-4 text-xs space-y-1';

  if (data.type === 'PendingRequestsByAge') {
    const total = data.under24 + data.between24and48 + data.over48;

    const pct = (n: number) => (total ? ((n / total) * 100).toFixed(1) : '0.0');

    return (
      <div className={commonCls}>
        <div className="font-medium">Pending Requests (Total {total})</div>
        <div>
          &lt;24h: {data.under24} ({pct(data.under24)}%)
        </div>
        <div>
          24–48h: {data.between24and48} ({pct(data.between24and48)}%)
        </div>
        <div>
          &gt;48h: {data.over48} ({pct(data.over48)}%)
        </div>
      </div>
    );
  }

  if (data.type === 'Top10CustomersThisMonth' || data.type === 'TopCustomers') {
    const total = data.top.reduce((a, b) => a + b.count, 0);

    return (
      <div className={commonCls}>
        <div className="font-medium">Top Customers (Total {total})</div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {data.top.map((t) => (
            <li key={t.company} className="flex justify-between">
              <span className="truncate pr-2">{t.company}</span>
              <span className="tabular-nums font-medium">{t.count}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (data.type === 'ProductsRequestedThisWeek' || data.type === 'ProductsRequested') {
    const total = data.products.reduce((a, b) => a + b.count, 0);

    return (
      <div className={commonCls}>
        <div className="font-medium">Products Requested (Total {total})</div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {data.products.map((p) => (
            <li key={p.name} className="flex justify-between">
              <span className="truncate pr-2">{p.name}</span>
              <span className="tabular-nums font-medium">{p.count}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (data.type === 'RejectionReasonsSummary') {
    const total = data.reasons.reduce((a, b) => a + b.count, 0);

    const pct = (n: number) => (total ? ((n / total) * 100).toFixed(1) : '0.0');

    return (
      <div className={commonCls}>
        <div className="font-medium">Rejection Reasons (Total {total})</div>
        <ul className="space-y-1">
          {data.reasons.map((r) => (
            <li key={r.reason} className="flex justify-between">
              <span className="truncate pr-2">{r.reason}</span>
              <span className="tabular-nums">
                {r.count} ({pct(r.count)}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (data.type === 'AverageProcessingTime') {
    return (
      <div className={commonCls}>
        <div className="font-medium">Average Processing Time</div>
        <div>
          {data.averageHours.toFixed(2)} hours ({(data.averageMs / 1000 / 60).toFixed(1)} mins)
        </div>
      </div>
    );
  }

  return null;
}
