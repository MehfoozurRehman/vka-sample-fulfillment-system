import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { Id } from '@/convex/_generated/dataModel';

export function LabelVal({ label, value }: { label: string; value?: string }) {
  return (
    <div className="contents">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value || '—'}</div>
    </div>
  );
}

export function RecentRequestsPanel({
  data,
  total,
  onSelect,
  activeId,
}: {
  data: { id: Id<'requests'>; requestId: string; status: string; createdAtFmt: string; products: number }[];
  total: number;
  onSelect: (id: Id<'requests'>) => void;
  activeId: Id<'requests'> | null;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Recent Requests</CardTitle>
        <CardDescription className="text-xs">Last 5 from this company</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1 text-xs max-h-40 overflow-auto pr-1">
          {data.map((i) => (
            <li
              key={i.id}
              className={`grid grid-cols-3 gap-2 items-center cursor-pointer rounded-sm px-1 py-0.5 transition-colors ${activeId === i.id ? 'bg-muted' : 'hover:bg-muted/60'}`}
              onClick={() => onSelect(i.id)}
            >
              <span className="font-mono truncate" title={i.requestId}>
                {i.requestId}
              </span>
              <span className="truncate" title={i.status}>
                {i.status}
              </span>
              <span className="text-muted-foreground text-right" title={i.createdAtFmt}>
                {i.createdAtFmt}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-[10px] text-muted-foreground">Total Units (12 mo): {total}</div>
      </CardContent>
    </Card>
  );
}
