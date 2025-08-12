'use client';

import { ColumnDef, SortingState, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RecentRequestsType } from '../type';

const columns: ColumnDef<RecentRequestsType[number]>[] = [
  { accessorKey: 'requestId', header: 'Request ID' },
  { accessorKey: 'company', header: 'Company' },
  { accessorKey: 'contactName', header: 'Contact' },
  { accessorKey: 'applicationType', header: 'Application' },
  { accessorKey: 'products', header: 'Products', cell: ({ row }) => row.original.products },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5 capitalize">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'stage',
    header: 'Stage',
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.original.stage}
      </Badge>
    ),
  },
  { accessorKey: 'createdAt', header: 'Created At' },
];

export function DataTable({ data }: { data: RecentRequestsType }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusMeta = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      const key = r.status || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    const entries = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    return { counts, entries };
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = data;
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (q) {
      rows = rows.filter((r) => [r.requestId, r.company, r.contactName, r.applicationType, r.status, r.stage].some((f) => f.toLowerCase().includes(q)));
    }
    return rows;
  }, [data, search, statusFilter]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className="flex flex-wrap justify-start">
              <TabsTrigger value="all">
                All{' '}
                <Badge variant="secondary" className="ml-1">
                  {data.length}
                </Badge>
              </TabsTrigger>
              {statusMeta.entries.map(([status, count]) => (
                <TabsTrigger key={status} value={status} className="capitalize">
                  {status}{' '}
                  <Badge variant="secondary" className="ml-1">
                    {count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input placeholder="Search requests..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
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
    </div>
  );
}
