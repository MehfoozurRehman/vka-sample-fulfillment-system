'use client';

import { Chart } from './chart';
import { Stats } from './stats';
import { api } from '@/convex/_generated/api';
import { useEffect, useMemo } from 'react';
import { useQueryWithStatus } from '@/hooks/use-query';

export default function UsersPage() {
  const { data, isPending } = useQueryWithStatus(api.user.getUsers);

  const totalUsers = data?.filter((user) => user.status !== 'invited').length || 0;
  const noOfActiveUsers = data?.filter((user) => user.status === 'active').length || 0;
  const noOfInactiveUsers = data?.filter((user) => user.status === 'inactive').length || 0;
  const noOfInvitedUsers = data?.filter((user) => user.status === 'invited').length || 0;

  const chartData = useMemo(() => {
    if (!data) return [];
    const grouped: Record<string, number> = {};
    data.forEach((user) => {
      const date = user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      if (!grouped[date]) grouped[date] = 0;
      grouped[date] += 1;
    });
    return Object.entries(grouped)
      .map(([date, created]) => ({ date, created }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <Stats totalUsers={totalUsers} noOfActiveUsers={noOfActiveUsers} noOfInactiveUsers={noOfInactiveUsers} noOfInvitedUsers={noOfInvitedUsers} />
        <div className="px-4 lg:px-6">
          <Chart chartData={chartData} />
        </div>
        <DataTable data={data || []} isPending={isPending} />
      </div>
    </div>
  );
}

import * as React from 'react';
import { closestCenter, DndContext, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type UniqueIdentifier } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconLoader,
  IconPlus,
  IconTrendingUp,
} from '@tabler/icons-react';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { toast } from 'sonner';
import { z } from 'zod';

import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Checkbox } from '@/components/ui/checkbox';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const schema = z.object({
  picture: z.string(),
  id: z.string(),
  name: z.string().optional(),
  role: z.string(),
  email: z.string(),
  designation: z.string().optional(),
  lastLogin: z.string(),
  createdAt: z.string(),
  status: z.enum(['invited', 'active', 'inactive']),
});

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'picture',
    header: 'Picture',
    cell: ({ row }) => (
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={row.original.picture} alt={row.original.name} className="w-full h-full" />
        <AvatarFallback className="rounded-lg">{row.original.name ? row.original.name.charAt(0) : 'CN'}</AvatarFallback>
      </Avatar>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => row.original.name || '-',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => row.original.role,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.email,
  },
  {
    accessorKey: 'designation',
    header: 'Designation',
    cell: ({ row }) => row.original.designation || '-',
  },
  {
    accessorKey: 'lastLogin',
    header: 'Last Login',
    cell: ({ row }) => row.original.lastLogin,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => dayjs(row.original.createdAt).format('MMM D, YYYY'),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.status === 'active' ? <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" /> : <IconLoader />}
        {row.original.status}
      </Badge>
    ),
  },
];

function DataTable({ data: initialData, isPending }: { data: z.infer<typeof schema>[]; isPending: boolean }) {
  const [data, setData] = React.useState(() => initialData);
  const [selectedUser, setSelectedUser] = React.useState<null | z.infer<typeof schema>>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const isMobile = useIsMobile();

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data?.map(({ id }) => id) || [], [data]);

  const table = useReactTable({
    data,
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  const totalUsers = data?.filter((user) => user.status !== 'invited').length || 0;
  const noOfActiveUsers = data?.filter((user) => user.status === 'active').length || 0;
  const noOfInactiveUsers = data?.filter((user) => user.status === 'inactive').length || 0;
  const noOfInvitedUsers = data?.filter((user) => user.status === 'invited').length || 0;

  return (
    <>
      <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>
          <Select defaultValue="all">
            <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="invited">Pending Invite</SelectItem>
            </SelectContent>
          </Select>
          <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="all">
              All <Badge variant="secondary">{totalUsers || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active">
              Active <Badge variant="secondary">{noOfActiveUsers}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive <Badge variant="secondary">{noOfInactiveUsers}</Badge>
            </TabsTrigger>
            <TabsTrigger value="invited">
              Pending Invite <Badge variant="secondary">{noOfInvitedUsers}</Badge>
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Input placeholder="Search" />
            <InviteUser />
          </div>
        </div>
        <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
          <div className="overflow-hidden rounded-lg border">
            <DndContext collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd} sensors={sensors} id={sortableId}>
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
                <TableBody className="**:data-[slot=table-cell]:first:w-8">
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
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 cursor-pointer"
                        onClick={() => setSelectedUser(row.original)}
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
            </DndContext>
          </div>
        </div>
      </Tabs>
      <Drawer direction={isMobile ? 'bottom' : 'right'} open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>User Details</DrawerTitle>
            <DrawerDescription>Full information for the selected user.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            {selectedUser && (
              <>
                <div className="flex items-center gap-4">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={selectedUser.picture} alt={selectedUser.name} />
                    <AvatarFallback className="rounded-lg">{selectedUser.name ? selectedUser.name.charAt(0) : 'CN'}</AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-lg">{selectedUser.name || '-'}</span>
                </div>
                <div>
                  <strong>Email:</strong> {selectedUser.email}
                </div>
                <div>
                  <strong>Role:</strong> {selectedUser.role}
                </div>
                <div>
                  <strong>Designation:</strong> {selectedUser.designation || '-'}
                </div>
                <div>
                  <strong>Status:</strong> {selectedUser.status}
                </div>
                <div>
                  <strong>Last Login:</strong> {selectedUser.lastLogin}
                </div>
                <div>
                  <strong>Created At:</strong> {selectedUser.createdAt}
                </div>
              </>
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// const chartData = [
//   { month: 'January', desktop: 186, mobile: 80 },
//   { month: 'February', desktop: 305, mobile: 200 },
//   { month: 'March', desktop: 237, mobile: 120 },
//   { month: 'April', desktop: 73, mobile: 190 },
//   { month: 'May', desktop: 209, mobile: 130 },
//   { month: 'June', desktop: 214, mobile: 140 },
// ];

// const chartConfig = {
//   desktop: {
//     label: 'Desktop',
//     color: 'var(--primary)',
//   },
//   mobile: {
//     label: 'Mobile',
//     color: 'var(--primary)',
//   },
// } satisfies ChartConfig;

// function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
//   const isMobile = useIsMobile();

//   return (
//     <Drawer direction={isMobile ? 'bottom' : 'right'}>
//       <DrawerTrigger asChild>
//         <Button variant="link" className="text-foreground w-fit px-0 text-left">
//           {item.header}
//         </Button>
//       </DrawerTrigger>
//       <DrawerContent>
//         <DrawerHeader className="gap-1">
//           <DrawerTitle>{item.header}</DrawerTitle>
//           <DrawerDescription>Showing total visitors for the last 6 months</DrawerDescription>
//         </DrawerHeader>
//         <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
//           {!isMobile && (
//             <>
//               <ChartContainer config={chartConfig}>
//                 <AreaChart
//                   accessibilityLayer
//                   data={chartData}
//                   margin={{
//                     left: 0,
//                     right: 10,
//                   }}
//                 >
//                   <CartesianGrid vertical={false} />
//                   <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 3)} hide />
//                   <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
//                   <Area dataKey="mobile" type="natural" fill="var(--color-mobile)" fillOpacity={0.6} stroke="var(--color-mobile)" stackId="a" />
//                   <Area dataKey="desktop" type="natural" fill="var(--color-desktop)" fillOpacity={0.4} stroke="var(--color-desktop)" stackId="a" />
//                 </AreaChart>
//               </ChartContainer>
//               <Separator />
//               <div className="grid gap-2">
//                 <div className="flex gap-2 leading-none font-medium">
//                   Trending up by 5.2% this month <IconTrendingUp className="size-4" />
//                 </div>
//                 <div className="text-muted-foreground">
//                   Showing total visitors for the last 6 months. This is just some random text to test the layout. It spans multiple lines and should wrap around.
//                 </div>
//               </div>
//               <Separator />
//             </>
//           )}
//           <form className="flex flex-col gap-4">
//             <div className="flex flex-col gap-3">
//               <Label htmlFor="header">Header</Label>
//               <Input id="header" defaultValue={item.header} />
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div className="flex flex-col gap-3">
//                 <Label htmlFor="type">Type</Label>
//                 <Select defaultValue={item.type}>
//                   <SelectTrigger id="type" className="w-full">
//                     <SelectValue placeholder="Select a type" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Table of Contents">Table of Contents</SelectItem>
//                     <SelectItem value="Executive Summary">Executive Summary</SelectItem>
//                     <SelectItem value="Technical Approach">Technical Approach</SelectItem>
//                     <SelectItem value="Design">Design</SelectItem>
//                     <SelectItem value="Capabilities">Capabilities</SelectItem>
//                     <SelectItem value="Focus Documents">Focus Documents</SelectItem>
//                     <SelectItem value="Narrative">Narrative</SelectItem>
//                     <SelectItem value="Cover Page">Cover Page</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="flex flex-col gap-3">
//                 <Label htmlFor="status">Status</Label>
//                 <Select defaultValue={item.status}>
//                   <SelectTrigger id="status" className="w-full">
//                     <SelectValue placeholder="Select a status" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Done">Done</SelectItem>
//                     <SelectItem value="In Progress">In Progress</SelectItem>
//                     <SelectItem value="Not Started">Not Started</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div className="flex flex-col gap-3">
//                 <Label htmlFor="target">Target</Label>
//                 <Input id="target" defaultValue={item.target} />
//               </div>
//               <div className="flex flex-col gap-3">
//                 <Label htmlFor="limit">Limit</Label>
//                 <Input id="limit" defaultValue={item.limit} />
//               </div>
//             </div>
//             <div className="flex flex-col gap-3">
//               <Label htmlFor="reviewer">Reviewer</Label>
//               <Select defaultValue={item.reviewer}>
//                 <SelectTrigger id="reviewer" className="w-full">
//                   <SelectValue placeholder="Select a reviewer" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
//                   <SelectItem value="Jamik Tashpulatov">Jamik Tashpulatov</SelectItem>
//                   <SelectItem value="Emily Whalen">Emily Whalen</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//           </form>
//         </div>
//         <DrawerFooter>
//           <Button>Submit</Button>
//           <DrawerClose asChild>
//             <Button variant="outline">Done</Button>
//           </DrawerClose>
//         </DrawerFooter>
//       </DrawerContent>
//     </Drawer>
//   );
// }

import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { roles } from '@/constants';
import { useMutation } from 'convex/react';
import { Loader } from 'lucide-react';
import toastError from '@/utils/toastError';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import dayjs from 'dayjs';

function InviteUser() {
  const [open, setOpen] = React.useState(false);

  const inviteUser = useMutation(api.user.inviteUser);

  const [isPending, startTransition] = React.useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const formData = new FormData(event.currentTarget);
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const role = formData.get('role') as string;

      if (!name) {
        toast.error('Name is required');
        return;
      }

      if (!email) {
        toast.error('Email is required');
        return;
      }

      if (!role) {
        toast.error('Role is required');
        return;
      }

      try {
        await inviteUser({ name, email, role });

        setOpen(false);

        toast.success('User invited successfully');
      } catch (error) {
        toastError(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <IconPlus />
          <span className="hidden lg:inline">Invite User</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-4">
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>Invite a new user to the platform. Please provide their name, email, and role. The user will receive an invitation email to join.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="role">Role</Label>
              <Select name="role">
                <SelectTrigger className="flex w-full **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden capitalize" size="sm" aria-label="Select a role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {roles.map((role) => (
                    <SelectItem key={role} value={role} className="rounded-lg capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader className="mr-2 size-4 animate-spin" />}
              Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
