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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useMemo, useState, useTransition } from 'react';

import { AddProduct } from './add-product';
import { Button } from '@/components/ui/button';
import { IconLoader } from '@tabler/icons-react';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { ProductType } from '../type';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMutation, useQuery } from 'convex/react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { InputWithSuggestions } from '@/components/ui/input-with-suggestions';

const columns: ColumnDef<ProductType>[] = [
  { accessorKey: 'productId', header: 'Product ID' },
  { accessorKey: 'productName', header: 'Name' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'location', header: 'Location' },
  { accessorKey: 'createdAt', header: 'Created At', cell: ({ row }) => dayjs(row.original.createdAt).format('MMM D, YYYY') },
];

const detailChartConfig = {
  requested: { label: 'Requested', color: 'var(--chart-1)' },
  ordered: { label: 'Ordered', color: 'var(--chart-2)' },
  shipped: { label: 'Shipped', color: 'var(--chart-3)' },
} satisfies ChartConfig;

export function DataTable({ data: initialData, isPending }: { data: ProductType[]; isPending: boolean }) {
  const [search, setSearch] = useState('');
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selected, setSelected] = useState<ProductType | null>(null);
  const [edit, setEdit] = useState<ProductType | null>(null);
  const [isSaving, startSaving] = useTransition();
  const isMobile = useIsMobile();

  const update = useMutation(api.product.update);
  const remove = useMutation(api.product.remove);
  const products = useQuery(api.product.list);

  const stats = useQuery(api.product.stats, selected ? { productId: selected.id as Id<'products'>, rangeDays: 90 } : 'skip');

  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    (products || []).forEach((p: ProductType) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredData = useMemo(() => {
    let d = initialData;
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');
    const q = normalize(search.trim());
    if (q) {
      d = d.filter((p) => {
        const parts = [p.productId, p.productName, p.category, p.location];
        return parts.some((part) => normalize(part).includes(q));
      });
    }
    return d;
  }, [initialData, search]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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

  return (
    <>
      <Tabs value={'all'} className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-end px-4 lg:px-6 gap-2">
          <Input placeholder="Search id, name, category, location..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <AddProduct />
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
                    <TableRow key={row.id} className="relative z-0 cursor-pointer" onClick={() => setSelected(row.original)}>
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
            <DrawerTitle>Product Details</DrawerTitle>
            <DrawerDescription>View and edit product information.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {selected && (
              <>
                <div className="grid gap-3">
                  <Label htmlFor="productId">Product ID</Label>
                  <Input id="productId" value={(edit?.productId ?? selected.productId) || ''} onChange={(e) => setEdit({ ...(edit ?? selected), productId: e.target.value })} autoFocus />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input id="productName" value={(edit?.productName ?? selected.productName) || ''} onChange={(e) => setEdit({ ...(edit ?? selected), productName: e.target.value })} />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="category">Category</Label>
                  <InputWithSuggestions
                    id="category"
                    name="category"
                    placeholder="Select or type a category"
                    options={categoryOptions}
                    value={(edit?.category ?? selected.category) || ''}
                    onValueChange={(val) => setEdit({ ...(edit ?? selected), category: val })}
                    inputProps={{ spellCheck: false }}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={(edit?.location ?? selected.location) || ''} onChange={(e) => setEdit({ ...(edit ?? selected), location: e.target.value })} />
                </div>
                <div className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Created At</span>
                    <span className="font-medium">{dayjs(selected.createdAt).format('MMM D, YYYY h:mm A')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Updated At</span>
                    <span className="font-medium">{dayjs(selected.updatedAt).format('MMM D, YYYY h:mm A')}</span>
                  </div>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Activity (Last 90 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={detailChartConfig} className="aspect-auto h-[160px] w-full">
                      <AreaChart data={stats?.data || []}>
                        <defs>
                          <linearGradient id="fillRequested" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="fillOrdered" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="fillShipped" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={32}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                        <Area dataKey="requested" type="natural" fill="url(#fillRequested)" stroke="var(--chart-1)" />
                        <Area dataKey="ordered" type="natural" fill="url(#fillOrdered)" stroke="var(--chart-2)" />
                        <Area dataKey="shipped" type="natural" fill="url(#fillShipped)" stroke="var(--chart-3)" />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          <DrawerFooter>
            <div className="flex w-full items-center justify-between">
              <Button
                variant="destructive"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  startSaving(async () => {
                    await remove({ id: selected.id as Id<'products'> });
                    setSelected(null);
                  });
                }}
              >
                {isSaving && <Loader className="mr-2 size-4 animate-spin" />}
                Delete
              </Button>
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
                      id: selected.id as Id<'products'>,
                      productId: (edit?.productId ?? selected.productId) || '',
                      productName: (edit?.productName ?? selected.productName) || '',
                      category: (edit?.category ?? selected.category) || '',
                      location: (edit?.location ?? selected.location) || '',
                    };

                    startSaving(async () => {
                      await update(payload);
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
