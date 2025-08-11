'use client';

import { Chart } from './components/chart';
import { DataTable } from './components/table';
import { Stats } from './components/stats';
import { api } from '@/convex/_generated/api';
import { useQueryWithStatus } from '@/hooks/use-query';

export default function ProductsPage() {
  const { data, isPending } = useQueryWithStatus(api.product.list);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Stats data={data || []} />
        </div>
        <div className="px-4 lg:px-6">
          <Chart data={data || []} />
        </div>
        <DataTable data={data || []} isPending={isPending} />
      </div>
    </div>
  );
}
