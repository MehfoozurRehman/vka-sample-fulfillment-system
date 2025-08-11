'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { IconCircleCheckFilled, IconLoader, IconPlus } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chart } from './chart';
import { Checkbox } from '@/components/ui/checkbox';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from 'lucide-react';
import { Stats } from './stats';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { roles } from '@/constants';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMemo, useState, useTransition } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

type DataType = NonNullable<ReturnType<typeof useQuery<typeof api.user.getUsers>>>[number];

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

const columns: ColumnDef<DataType>[] = [
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
    cell: ({ row }) => (row.original.lastLogin ? dayjs(row.original.lastLogin).format('MMM D, YYYY h:mm A') : 'Never'),
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

function DataTable({ data: initialData, isPending }: { data: DataType[]; isPending: boolean }) {
  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'invited'>('all');

  const [selectedUser, setSelectedUser] = useState<null | DataType>(null);

  const [rowSelection, setRowSelection] = useState({});

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredData = useMemo(() => {
    let d = initialData;

    if (statusFilter === 'all') {
      d = d;
    } else {
      d = d.filter((u) => u.status === statusFilter);
    }

    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');
    const q = normalize(search.trim());
    if (q) {
      d = d.filter((u) => {
        const parts = [u.name || '', u.email || '', u.role || '', u.designation || '', u.status || ''];
        return parts.some((p) => normalize(p).includes(q));
      });
    }

    return d;
  }, [initialData, search, statusFilter]);

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

  const totalUsers = initialData?.filter((user) => user.status !== 'invited').length || 0;
  const noOfActiveUsers = initialData?.filter((user) => user.status === 'active').length || 0;
  const noOfInactiveUsers = initialData?.filter((user) => user.status === 'inactive').length || 0;
  const noOfInvitedUsers = initialData?.filter((user) => user.status === 'invited').length || 0;

  const updateStatus = useMutation(api.user.updateStatus);

  const [isActing, startActing] = useTransition();

  const handleSetStatus = (status: 'active' | 'inactive') => {
    if (!selectedUser) return;
    startActing(async () => {
      try {
        await updateStatus({ userId: selectedUser.id as Id<'users'>, status });
        toast.success(`User ${status === 'active' ? 'activated' : 'deactivated'}`);
        setSelectedUser((prev) => (prev ? { ...prev, status } : prev));
      } catch (err) {
        toastError(err);
      }
    });
  };

  return (
    <>
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive' | 'invited')} className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive' | 'invited')}>
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
            <Input placeholder="Search name, email, role..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <InviteUser />
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
          </div>
        </div>
      </Tabs>
      <Drawer direction={isMobile ? 'bottom' : 'right'} open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>User Details</DrawerTitle>
            <DrawerDescription>Full information for the selected user.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {selectedUser && (
              <>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-lg">
                      <AvatarImage src={selectedUser.picture} alt={selectedUser.name} />
                      <AvatarFallback className="rounded-lg">{selectedUser.name ? selectedUser.name.charAt(0) : 'CN'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-semibold text-lg truncate">{selectedUser.name || '-'}</div>
                      <div className="text-sm text-muted-foreground truncate">{selectedUser.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {selectedUser.role}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground px-1.5 capitalize">
                      {selectedUser.status === 'active' ? (
                        <IconCircleCheckFilled className="mr-1 size-4 shrink-0 fill-green-500 dark:fill-green-400" />
                      ) : (
                        <IconLoader className="mr-1 size-4 shrink-0" />
                      )}
                      {selectedUser.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <span className="font-medium">{selectedUser.name || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <span className="font-medium break-all">{selectedUser.email}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Role</span>
                    <span className="font-medium capitalize">{selectedUser.role}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Designation</span>
                    <span className="font-medium">{selectedUser.designation || '-'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Last Login</span>
                    <span className="font-medium">{selectedUser.lastLogin ? dayjs(selectedUser.lastLogin).format('MMM D, YYYY h:mm A') : 'Never'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Created At</span>
                    <span className="font-medium">{selectedUser.createdAt ? dayjs(selectedUser.createdAt).format('MMM D, YYYY h:mm A') : '-'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <DrawerFooter>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleSetStatus(selectedUser?.status === 'active' ? 'inactive' : 'active')}
                  variant={selectedUser?.status === 'active' ? 'destructive' : 'default'}
                  disabled={isActing || !selectedUser}
                >
                  {isActing && <Loader className="mr-2 size-4 animate-spin" />}
                  {selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
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

function InviteUser() {
  const [open, setOpen] = useState(false);

  const inviteUser = useMutation(api.user.inviteUser);

  const [isPending, startTransition] = useTransition();

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
