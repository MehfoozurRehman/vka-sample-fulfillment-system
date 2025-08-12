'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { RecentRequestsType } from '../type';

export function Stats({ data }: { data: RecentRequestsType }) {
  const total = data.length;
  const pending = data.filter((r) => r.status.toLowerCase().includes('pending')).length;
  const reviewed = data.filter((r) => r.stage === 'Reviewed').length;
  const shipped = data.filter((r) => r.stage === 'Shipped').length;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Requests</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{total.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pending Review</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{pending.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Reviewed</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{reviewed.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Shipped</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{shipped.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
