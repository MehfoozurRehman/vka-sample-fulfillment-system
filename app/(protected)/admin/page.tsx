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
  const overview = useQuery(api.analytics.overview, {});

  const distributions = useQuery(api.analytics.distributions);

  const { data: recent, isPending } = useQueryWithStatus(api.request.recent, { limit: 8 });

  const auditLogs = useQuery(api.audit.list, {});

  const top = (arr?: { label: string; value: number }[], n = 3) =>
    (arr || []).slice(0, n).map((item) => ({
      label: item.label.charAt(0).toUpperCase() + item.label.slice(1),
      value: item.value,
    }));

  return (
    <div className="@container/main flex flex-1 flex-col gap-6 pb-6">
      <div className="grid gap-4 px-4 pt-4 lg:px-6 md:grid-cols-2 xl:grid-cols-3 @5xl/main:grid-cols-6">
        <StatCard title="Users" value={overview?.totalUsers} sub={overview ? `${overview.activeUsers} active` : ''} icon={<IconUser className="size-5" />} />
        <StatCard title="Stakeholders" value={overview?.totalStakeholders} sub={overview ? `${overview.vipStakeholders} VIP` : ''} icon={<IconClipboardText className="size-5" />} />
        <StatCard title="Products" value={overview?.totalProducts} sub={overview ? `${overview.totalRequests} requests` : ''} icon={<IconPackage className="size-5" />} />
        <StatCard title="Orders" value={overview?.totalOrders} sub={overview ? `${overview.openOrders} open` : ''} icon={<IconTruck className="size-5" />} />
        <StatCard title="Pending Requests" value={overview?.pendingRequests} sub="waiting" icon={<IconClipboardText className="size-5" />} />
        <StatCard title="Audit Logs" value={overview?.totalAuditLogs} sub="records" icon={<IconClipboardText className="size-5" />} />
      </div>
      <div className="grid gap-6 px-4 lg:px-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
            <div>
              <CardTitle>Recent Requests</CardTitle>
              <CardDescription>Latest submissions and their current stage.</CardDescription>
            </div>
            {isPending && <IconReload className="size-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent className="overflow-x-auto h-full">
            <div className="overflow-hidden rounded-lg border h-full">
              <Table containerClassName="h-full min-h-full">
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
                <TableBody className="min-h-full">
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
        <Card className="overflow-hidden h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Audit Logs</CardTitle>
            <CardDescription className="text-xs">Most recent changes</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
            {!auditLogs && (
              <div className="flex items-center justify-center h-full">
                <Loader className="h-5 animate-spin" />
              </div>
            )}
            {auditLogs &&
              auditLogs.slice(0, 8).map((l) => (
                <div key={l.id} className="py-1.5 border-b last:border-b-0 text-xs flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{l.action.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
                    <span className="text-muted-foreground">{new Date(l.timestamp).toLocaleDateString()} </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span>{l.userName}</span>
                    <span>·</span>
                    <span>{l.table}</span>
                  </div>
                </div>
              ))}
            {auditLogs && auditLogs.length === 0 && <div className="text-xs text-muted-foreground">No audit logs.</div>}
          </CardContent>
          <CardFooter className="text-[10px] text-muted-foreground">
            Showing {Math.min(auditLogs?.length || 0, 8)} of {auditLogs?.length || 0} logs.
          </CardFooter>
        </Card>
      </div>
      <div className="grid gap-6 px-4 lg:px-6 md:grid-cols-2 xl:grid-cols-3">
        <DistributionListCard title="Users by Role" items={top(distributions?.usersByRole)} emptyText="No roles" />
        <DistributionListCard title="Products by Category" items={top(distributions?.productsByCategory)} emptyText="No categories" />
        <DistributionListCard title="Requests by Status" items={top(distributions?.requestsByStatus)} emptyText="No requests" />
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

function DistributionListCard({ title, items, emptyText }: { title: string; items: { label: string; value: number }[]; emptyText: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{title}</span>
          {items?.length > 0 && <span className="text-[10px] text-muted-foreground">Top {items.length}</span>}
        </CardTitle>
        <CardDescription className="text-xs">{items?.length ? 'Most common' : emptyText}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ul className="space-y-2">
          {items?.length === 0 && <li className="text-xs text-muted-foreground">{emptyText}</li>}
          {items?.map((it) => (
            <li key={it.label} className="flex items-center justify-between text-xs">
              <span className="truncate max-w-[60%]" title={it.label}>
                {it.label}
              </span>
              <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0.5">
                {it.value}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
