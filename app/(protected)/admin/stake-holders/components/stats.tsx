'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { StakeholderType } from '../type';

export function Stats(props: { data: StakeholderType[] } & React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  const total = props.data?.length || 0;
  const vip = props.data?.filter((s) => s.vipFlag).length || 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Stakeholders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{total.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>VIP Stakeholders</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{vip.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
