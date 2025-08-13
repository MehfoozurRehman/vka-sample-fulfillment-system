import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import React from 'react';

interface Stats {
  total: number;
  vip: number;
  avgItems: number;
  under24: number;
  over24: number;
  over48: number;
}

export default function ScreenerStats({ stats, isLoading }: { stats: Stats; isLoading: boolean }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-6">
      <StatCard label="Pending" value={stats.total} loading={isLoading} />
      <StatCard label="VIP Pending" value={stats.vip} loading={isLoading} />
      <StatCard label="Avg Items" value={stats.avgItems} loading={isLoading} />
      <StatCard label="<24h" value={stats.under24} loading={isLoading} />
      <StatCard label="24-48h" value={stats.over24} loading={isLoading} />
      <StatCard label=">48h" value={stats.over48} loading={isLoading} />
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <Card data-slot="card" className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{loading ? '—' : value.toLocaleString()}</CardTitle>
      </CardHeader>
    </Card>
  );
}
