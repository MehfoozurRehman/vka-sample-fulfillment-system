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
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { IconCircleCheckFilled, IconLoader } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo, useState } from 'react';

import { AddStakeholder } from './add-stakeholder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { StakeholderType } from '../type';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { useAuth } from '@/hooks/use-user';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMutation } from 'convex/react';
import { useTransition } from 'react';

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
  const auth = useAuth();

  const [search, setSearch] = useState('');

  const [vipFilter, setVipFilter] = useState<'all' | 'vip' | 'non-vip'>('all');

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [sorting, setSorting] = useState<SortingState>([]);

  const [selected, setSelected] = useState<StakeholderType | null>(null);

  const [edit, setEdit] = useState<StakeholderType | null>(null);

  const [isSaving, startSaving] = useTransition();

  const isMobile = useIsMobile();

  const updateStakeholder = useMutation(api.stakeholder.updateStakeholder);

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
        <div className="flex items-center justify-between px-4 lg:px-6 gap-2">
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
          <div className="flex items-center gap-2 flex-1">
            <Input placeholder="Search company or emails..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
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
                <div className="grid gap-3">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={(edit?.companyName ?? selected.companyName) || ''} onChange={(e) => setEdit({ ...(edit ?? selected), companyName: e.target.value })} />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="salesRepEmail">Sales Rep Email</Label>
                  <Input
                    id="salesRepEmail"
                    type="email"
                    value={(edit?.salesRepEmail ?? selected.salesRepEmail) || ''}
                    onChange={(e) => setEdit({ ...(edit ?? selected), salesRepEmail: e.target.value })}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="accountManagerEmail">Account Manager Email</Label>
                  <Input
                    id="accountManagerEmail"
                    type="email"
                    value={(edit?.accountManagerEmail ?? selected.accountManagerEmail) || ''}
                    onChange={(e) => setEdit({ ...(edit ?? selected), accountManagerEmail: e.target.value })}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="complianceOfficerEmail">Compliance Officer Email</Label>
                  <Input
                    id="complianceOfficerEmail"
                    type="email"
                    value={(edit?.complianceOfficerEmail ?? selected.complianceOfficerEmail) || ''}
                    onChange={(e) => setEdit({ ...(edit ?? selected), complianceOfficerEmail: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="vipFlag" checked={!!(edit?.vipFlag ?? selected.vipFlag)} onCheckedChange={(v) => setEdit({ ...(edit ?? selected), vipFlag: !!v })} />
                  <Label htmlFor="vipFlag">Mark as VIP</Label>
                </div>
                <div className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Created At</span>
                    <span className="font-medium">{dayjs(selected.createdAt).format('MMM D, YYYY h:mm A')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <DrawerFooter>
            <div className="flex w-full items-center justify-between">
              <div />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEdit(null);
                    setSelected(null);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isSaving || !selected}
                  onClick={() => {
                    if (!selected) return;
                    const payload = {
                      id: selected.id as Id<'stakeholders'>,
                      companyName: (edit?.companyName ?? selected.companyName) || '',
                      salesRepEmail: (edit?.salesRepEmail ?? selected.salesRepEmail) || '',
                      accountManagerEmail: (edit?.accountManagerEmail ?? selected.accountManagerEmail) || '',
                      complianceOfficerEmail: (edit?.complianceOfficerEmail ?? selected.complianceOfficerEmail) || '',
                      vipFlag: !!(edit?.vipFlag ?? selected.vipFlag),
                    };

                    startSaving(async () => {
                      await updateStakeholder({ userId: auth.id, ...payload });
                      setSelected({ ...selected, ...payload });
                      setEdit(null);
                    });
                  }}
                >
                  {isSaving && <Loader className="mr-2 size-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
