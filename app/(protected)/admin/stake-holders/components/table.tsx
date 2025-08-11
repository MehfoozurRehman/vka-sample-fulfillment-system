'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { IconCircleCheckFilled, IconLoader } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo, useState } from 'react';

import { AddStakeholder } from './add-stakeholder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StakeholderType } from '../type';
import dayjs from 'dayjs';
import { useIsMobile } from '@/hooks/use-mobile';

const columns: ColumnDef<StakeholderType>[] = [
  { accessorKey: 'companyName', header: 'Company' },
  { accessorKey: 'salesRepEmail', header: 'Sales Rep' },
  { accessorKey: 'accountManagerEmail', header: 'Account Manager' },
  { accessorKey: 'complianceOfficerEmail', header: 'Compliance Officer' },
  {
    accessorKey: 'vipFlag',
    header: 'VIP',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.vipFlag ? <IconCircleCheckFilled className="mr-1 size-4 fill-green-500 dark:fill-green-400" /> : <IconLoader className="mr-1 size-4" />}
        {row.original.vipFlag ? 'Yes' : 'No'}
      </Badge>
    ),
  },
  { accessorKey: 'createdAt', header: 'Created At', cell: ({ row }) => dayjs(row.original.createdAt).format('MMM D, YYYY') },
];

export function DataTable({ data: initialData, isPending }: { data: StakeholderType[]; isPending: boolean }) {
  const [search, setSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<'all' | 'vip' | 'non-vip'>('all');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<StakeholderType | null>(null);
  const isMobile = useIsMobile();

  const filteredData = useMemo(() => {
    let d = initialData;
    if (vipFilter !== 'all') d = d.filter((s) => (vipFilter === 'vip' ? s.vipFlag : !s.vipFlag));
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');
    const q = normalize(search.trim());
    if (q) {
      d = d.filter((s) => {
        const parts = [s.companyName, s.salesRepEmail, s.accountManagerEmail, s.complianceOfficerEmail];
        return parts.some((p) => normalize(p).includes(q));
      });
    }
    return d;
  }, [initialData, search, vipFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility, columnFilters },
    getRowId: (row) => row.id.toString(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const total = initialData?.length || 0;
  const vip = initialData?.filter((s) => s.vipFlag).length || 0;
  const nonVip = total - vip;

  return (
    <>
      <Tabs value={vipFilter} onValueChange={(v) => setVipFilter(v as 'all' | 'vip' | 'non-vip')} className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>
          <Select value={vipFilter} onValueChange={(v) => setVipFilter(v as 'all' | 'vip' | 'non-vip')}>
            <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
              <SelectValue placeholder="Select a filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="non-vip">Non-VIP</SelectItem>
            </SelectContent>
          </Select>
          <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="all">
              All <Badge variant="secondary">{total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="vip">
              VIP <Badge variant="secondary">{vip}</Badge>
            </TabsTrigger>
            <TabsTrigger value="non-vip">
              Non-VIP <Badge variant="secondary">{nonVip}</Badge>
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Input placeholder="Search company or emails..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <AddStakeholder />
          </div>
        </div>
        <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24">
                      <div className="flex w-full items-center justify-center">
                        <IconLoader className="animate-spin" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="relative z-0 cursor-pointer data-[dragging=true]:z-10 data-[dragging=true]:opacity-80" onClick={() => setSelected(row.original)}>
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
      </Tabs>
      <Drawer direction={isMobile ? 'bottom' : 'right'} open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Stakeholder Details</DrawerTitle>
            <DrawerDescription>Full information for the selected stakeholder.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {selected && (
              <>
                <div className="flex flex-col gap-2">
                  <div className="font-semibold text-lg">{selected.companyName}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-muted-foreground px-1.5">
                      {selected.vipFlag ? <IconCircleCheckFilled className="mr-1 size-4 fill-green-500 dark:fill-green-400" /> : <IconLoader className="mr-1 size-4" />}
                      {selected.vipFlag ? 'VIP' : 'Standard'}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Sales Rep Email</span>
                    <span className="font-medium break-all">{selected.salesRepEmail}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Account Manager Email</span>
                    <span className="font-medium break-all">{selected.accountManagerEmail}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Compliance Officer Email</span>
                    <span className="font-medium break-all">{selected.complianceOfficerEmail}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Created At</span>
                    <span className="font-medium">{dayjs(selected.createdAt).format('MMM D, YYYY h:mm A')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <DrawerFooter>
            <div className="flex w-full justify-end">
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
