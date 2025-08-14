'use client';

import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import type { EmailRow, EmailStats } from './types';
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconFilter } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseAsString, useQueryState } from 'nuqs';
import { useDeferredValue, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryWithStatus } from '@/hooks/use-query';

export default function EmailsPage() {
  const [status, setStatus] = useQueryState('status', parseAsString.withDefault(''));

  const [type, setType] = useQueryState('type', parseAsString.withDefault(''));

  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [start, setStart] = useQueryState('start', parseAsString.withDefault(''));

  const [end, setEnd] = useQueryState('end', parseAsString.withDefault(''));

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedEmail, setSelectedEmail] = useState<EmailRow | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);

    return () => clearTimeout(handler);
  }, [search]);

  const { data: emailsRaw, isPending } = useQueryWithStatus(api.email.list, {
    status: status && status !== 'all' ? status : undefined,
    type: type && type !== 'all' ? type : undefined,
    start: start ? dayjs(start).valueOf() : undefined,
    end: end ? dayjs(end).endOf('day').valueOf() : undefined,
    search: debouncedSearch || undefined,
  });

  const { data: stats } = useQueryWithStatus(api.email.stats, {
    start: start ? dayjs(start).valueOf() : undefined,
    end: end ? dayjs(end).endOf('day').valueOf() : undefined,
  });

  const emails = useDeferredValue(emailsRaw);

  const columns = useMemo<ColumnDef<EmailRow>[]>(
    () => [
      {
        header: 'When',
        accessorKey: 'createdAt',
        cell: ({ getValue }) => dayjs(getValue<number>()).format('MMM D, YYYY h:mm A'),
      },
      {
        header: 'Type',
        accessorKey: 'type',
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        header: 'Subject',
        accessorKey: 'subject',
      },
      {
        header: 'To',
        accessorKey: 'to',
        cell: ({ getValue }) => (getValue<string[]>() || []).join(', '),
      },
      {
        header: 'Attempts',
        accessorKey: 'attemptCount',
      },
    ],
    [],
  );

  const tableData = useMemo(() => emails || [], [emails]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  });

  const allTypes = useMemo(() => Array.from(new Set((tableData || []).map((e) => e.type))), [tableData]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      <HeaderStats stats={stats} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2 min-w-48">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['pending', 'retrying', 'sent', 'delivered', 'delivery_delayed', 'bounced', 'failed', 'cancelled'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 min-w-48">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="w-64">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {allTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start">Start</Label>
              <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="end">End</Label>
              <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-2 min-w-48">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Input id="search" placeholder="Find subject, recipient, status, error..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-8" />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setStatus('');
              setType('');
              setSearch('');
              setStart('');
              setEnd('');
            }}
          >
            <IconFilter /> Reset
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <Loader className="animate-spin" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/60"
                  onClick={() => {
                    setSelectedEmail(row.original as EmailRow);
                    setDrawerOpen(true);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">{table.getRowModel().rows.length} results</div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <span className="sr-only">Go to first page</span>
            <IconChevronsLeft />
          </Button>
          <Button variant="outline" className="size-8" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <span className="sr-only">Go to previous page</span>
            <IconChevronLeft />
          </Button>
          <Button variant="outline" className="size-8" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <span className="sr-only">Go to next page</span>
            <IconChevronRight />
          </Button>
          <Button variant="outline" className="hidden size-8 lg:flex" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
            <span className="sr-only">Go to last page</span>
            <IconChevronsRight />
          </Button>
        </div>
      </div>

      <DetailsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} row={selectedEmail} />
    </div>
  );
}

function HeaderStats({ stats }: { stats: EmailStats | undefined }) {
  const items: { label: string; value: number; variant?: 'secondary' | 'outline' }[] = [
    { label: 'Total', value: stats?.total ?? 0, variant: 'outline' },
    { label: 'Pending', value: stats?.pending ?? 0 },
    { label: 'Retrying', value: stats?.retrying ?? 0 },
    { label: 'Sent', value: stats?.sent ?? 0 },
    { label: 'Delivered', value: stats?.delivered ?? 0 },
    { label: 'Delayed', value: stats?.delivery_delayed ?? 0 },
    { label: 'Bounced', value: stats?.bounced ?? 0 },
    { label: 'Failed', value: stats?.failed ?? 0 },
    { label: 'Cancelled', value: stats?.cancelled ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9">
      {items.map((it) => (
        <div key={it.label} className="rounded-md border p-3">
          <div className="text-muted-foreground text-xs">{it.label}</div>
          <div className="text-lg font-semibold">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

type DetailsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: EmailRow | null;
};

function DetailsDrawer({ open, onOpenChange, row }: DetailsDrawerProps) {
  const isMobile = useIsMobile();

  if (!row) return null;

  return (
    <Drawer direction={isMobile ? 'bottom' : 'right'} open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Email Details</DrawerTitle>
          <DrawerDescription>Full payload and metadata</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[70vh] overflow-auto p-4 text-sm">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info label="When" value={dayjs(row.createdAt).format('MMM D, YYYY h:mm A')} />
              <Info label="Status" value={row.status} />
              <Info label="Type" value={row.type} />
              <Info label="Subject" value={row.subject} />
              <Info label="To" value={(row.to || []).join(', ')} />
              <Info label="CC" value={(row.cc || []).join(', ')} />
              <Info label="Attempts" value={String(row.attemptCount)} />
              <Info label="Next Attempt" value={row.nextAttemptAt ? dayjs(row.nextAttemptAt).format('MMM D, YYYY h:mm A') : '-'} />
              <Info label="Resend ID" value={row.resendId || '-'} />
              <Info label="Sent At" value={row.sentAt ? dayjs(row.sentAt).format('MMM D, YYYY h:mm A') : '-'} />
              <Info label="Finalized At" value={row.finalizedAt ? dayjs(row.finalizedAt).format('MMM D, YYYY h:mm A') : '-'} />
              <Info label="Created By" value={row.createdBy?.name || row.createdBy?.email || String(row.createdBy?.id || '')} />
            </div>
            <div>
              <div className="text-muted-foreground">Related</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{JSON.stringify(row.related, null, 2)}</pre>
            </div>
            <div>
              <div className="text-muted-foreground">Error</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{row.errorMessage || '-'}</pre>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value}</div>
    </div>
  );
}
