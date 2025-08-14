'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { useQuery } from 'convex/react';

export default function Timeline({ requestId }: { requestId: string }) {
  const id = requestId as unknown as Id<'requests'>;

  const events = useQuery(api.request.timeline, { id }) as { ts: number; type: string; actor?: string; details?: unknown }[] | undefined;

  if (!events) return <div className="text-sm text-muted-foreground">Loading…</div>;

  if (!events.length) return <div className="text-sm text-muted-foreground">No events.</div>;

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[160px]">Time</TableHead>
            <TableHead>Event</TableHead>
            <TableHead className="w-[220px]">Actor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e, i) => (
            <TableRow key={i} className="text-sm">
              <TableCell className="whitespace-nowrap">{dayjs(e.ts).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="mr-2">
                  {e.type}
                </Badge>
                <span className="text-muted-foreground">{typeof e.details === 'string' ? e.details : e.details ? JSON.stringify(e.details) : ''}</span>
              </TableCell>
              <TableCell className="font-mono text-xs">{e.actor || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
