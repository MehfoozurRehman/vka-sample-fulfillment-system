import { Id } from '@/convex/_generated/dataModel';
import RequestSummary from '@/app/(protected)/admin/components/request-summary';
import Timeline from '@/app/(protected)/admin/components/timeline';

export default async function AdminRequestDetailsPage({ params }: { params: Promise<{ id: Id<'requests'> }> }) {
  const id = (await params).id;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <RequestSummary requestId={id} />
      <Timeline requestId={id} />
    </div>
  );
}
