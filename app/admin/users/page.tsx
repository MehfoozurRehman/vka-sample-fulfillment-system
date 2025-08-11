'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { api } from '@/convex/_generated/api';
import { useQueryWithStatus } from '@/hooks/use-query';

export default function UsersPage() {
  const { data, isPending } = useQueryWithStatus(api.user.getUsers);

  const totalUsers = data?.length || 0;
  const noOfActiveUsers = data?.filter((user) => user.status === 'active').length || 0;
  const noOfInactiveUsers = data?.filter((user) => user.status === 'inactive').length || 0;
  const noOfInvitedUsers = data?.filter((user) => user.status === 'invited').length || 0;

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <Stats totalUsers={totalUsers} noOfActiveUsers={noOfActiveUsers} noOfInactiveUsers={noOfInactiveUsers} noOfInvitedUsers={noOfInvitedUsers} />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        {/* <DataTable data={data} /> */}
      </div>
    </div>
  );
}

function Stats(props: { totalUsers: number; noOfActiveUsers: number; noOfInactiveUsers: number; noOfInvitedUsers: number } & React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{props.totalUsers.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{props.noOfActiveUsers.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Inactive Users</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{props.noOfInactiveUsers.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pending Invites</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{props.noOfInvitedUsers.toLocaleString()}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
