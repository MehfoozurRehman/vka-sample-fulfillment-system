'use client';

import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconFilter } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDeferredValue, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

type AuditRow = NonNullable<ReturnType<typeof useQuery<typeof api.audit.list>>>[number];

export default function AuditLogsPage() {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [tableName, setTableName] = useState<string>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditRow | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const users = useQuery(api.user.getUsers);

  const { data: logsRaw, isPending } = useQueryWithStatus(api.audit.list, {
    userId: selectedUser && selectedUser !== 'all' ? (selectedUser as unknown as Id<'users'>) : undefined,
    action: action && action !== 'all' ? action : undefined,
    table: tableName && tableName !== 'all' ? tableName : undefined,
    start: start ? dayjs(start).valueOf() : undefined,
    end: end ? dayjs(end).endOf('day').valueOf() : undefined,
    search: debouncedSearch || undefined,
  });

  const logs = useDeferredValue(logsRaw);

  const columns = useMemo<ColumnDef<AuditRow>[]>(
    () => [
      {
        header: 'When',
        accessorKey: 'timestamp',
        cell: ({ getValue }) => dayjs(getValue<number>()).format('MMM D, YYYY h:mm A'),
      },
      {
        header: 'User',
        accessorKey: 'userName',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.userName || 'Unknown'}</span>
            <span className="text-muted-foreground text-xs">{row.original.userEmail}</span>
          </div>
        ),
      },
      {
        header: 'Action',
        accessorKey: 'action',
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        header: 'Table',
        accessorKey: 'table',
      },
    ],
    [],
  );

  const tableData = useMemo(() => logs || [], [logs]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const actions = useMemo(() => Array.from(new Set(tableData.map((l) => l.action))), [tableData]);
  const tables = useMemo(() => Array.from(new Set(tableData.map((l) => l.table))), [tableData]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2 min-w-48">
            <Label htmlFor="user">User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="user" className="w-56">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {(users || []).map((u) => (
                  <SelectItem key={u.id} value={u.id as unknown as string}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 min-w-48">
            <Label htmlFor="action">Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger id="action" className="w-44">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 min-w-48">
            <Label htmlFor="table">Table</Label>
            <Select value={tableName} onValueChange={setTableName}>
              <SelectTrigger id="table" className="w-44">
                <SelectValue placeholder="All tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tables</SelectItem>
                {tables.map((t) => (
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
              <Input id="search" placeholder="Find action, table, id or change..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-8" />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedUser('');
              setAction('');
              setTableName('');
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
                    setSelectedLog(row.original);
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
      <DetailsDrawer open={drawerOpen} onOpenChange={setDrawerOpen} row={selectedLog} />
    </div>
  );
}

interface DetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AuditRow | null;
}

function DetailsDrawer({ open, onOpenChange, row }: DetailsDrawerProps) {
  const isMobile = useIsMobile();

  if (!row) return null;

  return (
    <Drawer direction={isMobile ? 'bottom' : 'right'} open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Audit Log Details</DrawerTitle>
          <DrawerDescription>Full change payload and metadata</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[70vh] overflow-auto p-4 text-sm">
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-muted-foreground">When</div>
              <div className="font-medium">{dayjs(row.timestamp).format('MMM D, YYYY h:mm A')}</div>
            </div>
            <div>
              <div className="text-muted-foreground">User</div>
              <div className="font-medium">{row.userName || 'Unknown'}</div>
              <div className="text-muted-foreground">{row.userEmail}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Action</div>
              <div className="font-medium">{row.action}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Table</div>
              <div className="font-medium">{row.table}</div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground">Changes</div>
              <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{JSON.stringify(row.changes, null, 2)}</pre>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
