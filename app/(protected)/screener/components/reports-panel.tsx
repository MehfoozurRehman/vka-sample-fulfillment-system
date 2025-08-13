'use client';

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
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

export default function ReportsPanel() {
  const [report, setReport] = useState('PendingRequestsByAge');

  const [range, setRange] = useState('30');

  const [anchorTo, setAnchorTo] = useState(() => Date.now());

  const from = useMemo(() => anchorTo - Number(range) * 24 * 3600 * 1000, [range, anchorTo]);

  const { data, isPending } = useQueryWithStatus(api.screener.reports, { report, from, to: anchorTo });

  const [exportOpen, setExportOpen] = useState(false);

  const { data: exportData } = useQueryWithStatus(api.screener.exportRequests, exportOpen ? { all: false, from, to: anchorTo } : 'skip');

  const chart = useMemo(() => {
    if (!data) return null;

    switch (data.type) {
      case 'PendingRequestsByAge':
        return {
          kind: 'bar',
          rows: [
            { bucket: '<24h', value: (data as PendingAgeReport).under24 },
            { bucket: '24-48h', value: (data as PendingAgeReport).between24and48 },
            { bucket: '>48h', value: (data as PendingAgeReport).over48 },
          ],
        } as const;
      case 'Top10CustomersThisMonth':
      case 'TopCustomers':
        return { kind: 'bar', rows: (data as TopCustomersReport).top.map((t) => ({ label: t.company, count: t.count })) } as const;
      case 'ProductsRequestedThisWeek':
      case 'ProductsRequested':
        return { kind: 'bar', rows: (data as ProductsReport).products.map((p) => ({ label: p.name, count: p.count })) } as const;
      case 'RejectionReasonsSummary':
        return { kind: 'pie', rows: (data as RejectionReasonsReport).reasons.map((r) => ({ label: r.reason, count: r.count })) } as const;
      case 'AverageProcessingTime':
        return { kind: 'stat', value: (data as AvgProcTimeReport).averageHours } as const;
      default:
        return null;
    }
  }, [data]);

  const COLORS = ['#6366f1', '#22c55e', '#eab308', '#ef4444', '#06b6d4', '#f472b6', '#8b5cf6', '#10b981'];

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
          {data && chart?.kind === 'bar' && (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  const rows = chart.rows as ChartRow[];

                  const first = rows[0] as ChartRow | undefined;

                  const hasBucket = !!first && 'bucket' in first;

                  const valueKey = hasBucket ? 'value' : 'count';

                  return (
                    <BarChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey={hasBucket ? 'bucket' : 'label'} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Bar dataKey={valueKey} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  );
                })()}
              </ResponsiveContainer>
            </div>
          )}
          {data && chart?.kind === 'pie' && (
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chart.rows as ChartRow[]} dataKey="count" nameKey="label" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {(chart.rows as ChartRow[]).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {data && chart?.kind === 'stat' && (
            <div className="text-center py-8 text-4xl font-bold">
              {chart.value.toLocaleString()} <span className="text-base font-normal">hrs</span>
              <div className="text-sm text-muted-foreground">average processing time</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
