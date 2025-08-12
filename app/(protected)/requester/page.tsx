'use client';

import { AddRequest } from './components/add-request';
import { Chart } from './components/chart';
import { DataTable } from './components/table';
import { Stats } from './components/stats';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/hooks/use-user';
import { useQueryWithStatus } from '@/hooks/use-query';

export default function RequesterPage() {
  const { data, isPending } = useQueryWithStatus(api.request.recent, { limit: 200 });
  const user = useAuth();

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <Stats data={data || []} />
        <div className="px-4 flex items-center justify-end lg:px-6">
          <AddRequest requesterEmail={user.email} />
        </div>
        <div className="px-4 lg:px-6">
          <Chart data={data || []} />
        </div>
        <DataTable data={data || []} isPending={isPending} />
      </div>
    </div>
  );
}
