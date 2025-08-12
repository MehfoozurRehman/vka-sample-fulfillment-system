'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IconClipboardText, IconPackage, IconReload, IconTruck, IconUser } from '@tabler/icons-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import { Loader } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

export default function AdminDashboard() {
  const overview = useQuery(api.analytics.overview);

  const { data: recent, isPending } = useQueryWithStatus(api.request.recent, { limit: 8 });

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <StatCard title="Users" value={overview?.totalUsers} sub={overview ? `${overview.activeUsers} active` : ''} icon={<IconUser className="size-5" />} />
          <StatCard title="Stakeholders" value={overview?.totalStakeholders} sub={overview ? `${overview.vipStakeholders} VIP` : ''} icon={<IconClipboardText className="size-5" />} />
          <StatCard title="Products" value={overview?.totalProducts} sub={overview ? `${overview.totalRequests} requests` : ''} icon={<IconPackage className="size-5" />} />
          <StatCard title="Orders" value={overview?.totalOrders} sub={overview ? `${overview.openOrders} open` : ''} icon={<IconTruck className="size-5" />} />
        </div>
        <Card className="mx-4 lg:mx-6 overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
            <div>
              <CardTitle>Recent Requests</CardTitle>
              <CardDescription>Latest submissions and their current stage.</CardDescription>
            </div>
            {isPending && <IconReload className="size-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent className="overflow-x-auto pt-4">
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="min-w-[120px]">ID</TableHead>
                    <TableHead className="min-w-[160px]">Company</TableHead>
                    <TableHead className="min-w-[140px]">Contact</TableHead>
                    <TableHead className="min-w-[140px]">Type</TableHead>
                    <TableHead className="w-[90px] text-center">Products</TableHead>
                    <TableHead className="min-w-[110px]">Status</TableHead>
                    <TableHead className="min-w-[140px]">Stage</TableHead>
                    <TableHead className="min-w-[180px]">Assigned To</TableHead>
                    <TableHead className="min-w-[170px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending && (
                    <TableRow>
                      <TableCell colSpan={9} className="p-2">
                        <div className="flex items-center justify-center h-10">
                          <Loader className="h-5 animate-spin" />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isPending &&
                    (recent || []).map((r) => (
                      <TableRow key={r.id} className="text-sm">
                        <TableCell className="font-mono text-xs">{r.requestId}</TableCell>
                        <TableCell>{r.company}</TableCell>
                        <TableCell>{r.contactName}</TableCell>
                        <TableCell>{r.applicationType}</TableCell>
                        <TableCell className="text-center">{r.products}</TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell>{r.stage}</TableCell>
                        <TableCell>{r.assignedTo || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.createdAt}</TableCell>
                      </TableRow>
                    ))}
                  {!isPending && (recent || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No recent requests.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">Showing latest {recent?.length || 0} requests.</CardFooter>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, loading }: { title: string; value?: number; sub?: string; icon: React.ReactNode; loading?: boolean }) {
  return (
    <Card data-slot="card" className="@container/card relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            {sub && <CardDescription>{sub}</CardDescription>}
          </div>
          <div className="text-right">{loading ? <Skeleton className="h-7 w-14" /> : <span className="text-2xl font-semibold tabular-nums">{value?.toLocaleString?.() ?? '—'}</span>}</div>
        </div>
      </CardHeader>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';
  if (normalized.includes('pending')) variant = 'outline';
  else if (['approved', 'open'].some((s) => normalized.includes(s))) variant = 'default';
  else if (['rejected', 'cancel', 'error'].some((s) => normalized.includes(s))) variant = 'destructive';
  return <Badge variant={variant}>{status}</Badge>;
}
