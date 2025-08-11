'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { DataType } from '../type';

export function Stats(props: { data: DataType[] } & React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  const totalUsers = props.data?.filter((user) => user.status !== 'invited').length || 0;
  const noOfActiveUsers = props.data?.filter((user) => user.status === 'active').length || 0;
  const noOfInactiveUsers = props.data?.filter((user) => user.status === 'inactive').length || 0;
  const noOfInvitedUsers = props.data?.filter((user) => user.status === 'invited').length || 0;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{totalUsers.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{noOfActiveUsers.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Inactive Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{noOfInactiveUsers.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pending Invites</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{noOfInvitedUsers.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
