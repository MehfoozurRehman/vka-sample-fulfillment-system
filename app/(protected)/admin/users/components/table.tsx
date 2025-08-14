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
import { Copy, Loader, Mail } from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { IconCircleCheckFilled, IconLoader, IconStar, IconStarFilled } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState, useTransition } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataType } from '../type';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { InviteUser } from './invite-user';
import { Label } from '@/components/ui/label';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { roles } from '@/constants';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';
import { useAuth } from '@/hooks/use-user';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMutation } from 'convex/react';

const columns: ColumnDef<DataType>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
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
    cell: ({ row }) => row.original.activeRole,
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

export function DataTable({ data: initialData, isPending }: { data: DataType[]; isPending: boolean }) {
  const isMobile = useIsMobile();

  const currentUser = useAuth();

  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));

  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString.withDefault('all'));

  const [selectedUser, setSelectedUser] = useState<null | (DataType & { roles?: string[]; activeRole?: string })>(null);

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [sorting, setSorting] = useState<SortingState>([]);

  const filteredData = useMemo(() => {
    type ExtendedUser = DataType & { roles?: string[]; activeRole?: string };
    let d: ExtendedUser[] = initialData as ExtendedUser[];

    if (statusFilter !== 'all') {
      d = d.filter((u) => u.status === statusFilter);
    }

    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');

    const q = normalize(search.trim());

    if (q) {
      d = d.filter((u) => {
        const roleText = u.activeRole || (u.roles ? u.roles.join(' ') : '');

        const parts = [u.name || '', u.email || '', roleText, u.designation || '', u.status || ''];

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

  const [isActing, startActing] = useTransition();

  const updateStatus = useMutation(api.user.updateStatus);

  const setActiveRole = useMutation(api.user.setActiveRole);

  const addRole = useMutation(api.user.addRole);

  const removeRole = useMutation(api.user.removeRole);

  const resendInvite = useMutation(api.user.resendInvite);

  const [isBulkActing, startBulkActing] = useTransition();

  const selectedRowIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  const selectedUsers = filteredData.filter((u) => selectedRowIds.includes(u.id.toString()));

  const handleBulkSetStatus = (status: 'active' | 'inactive') => {
    if (!selectedUsers.length) {
      toast.error('No users selected');

      return;
    }

    if (status === 'inactive' && selectedUsers.some((u) => u.id === currentUser.id)) {
      toast.error('You cannot deactivate yourself');

      return;
    }

    startBulkActing(async () => {
      try {
        await Promise.all(selectedUsers.map((user) => updateStatus({ userId: user.id as Id<'users'>, status })));
        setRowSelection({});
        toast.success(`Selected users ${status === 'active' ? 'activated' : 'deactivated'}`);
      } catch (err) {
        toastError(err);
      }
    });
  };

  const handleSetStatus = (status: 'active' | 'inactive') => {
    if (!selectedUser) return;

    if (status === 'inactive' && selectedUser.id === currentUser.id) {
      toast.error('You cannot deactivate yourself');

      return;
    }

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
      <Tabs value={statusFilter as 'all' | 'active' | 'inactive' | 'invited'} onValueChange={(v) => setStatusFilter(v)} className="w-full flex-col justify-start gap-6">
        <div className="flex items-center justify-between px-4 lg:px-6 gap-2">
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
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
          <div className="flex items-center gap-2 flex-1">
            {rowSelection && Object.keys(rowSelection).length > 0 && (
              <>
                <Button variant="default" size="sm" disabled={isBulkActing || selectedUsers.length === 0} onClick={() => handleBulkSetStatus('active')}>
                  {isBulkActing && <Loader className="mr-2 size-4 animate-spin" />}
                  Bulk Activate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isBulkActing || selectedUsers.length === 0 || selectedUsers.some((u) => u.id === currentUser.id)}
                  onClick={() => handleBulkSetStatus('inactive')}
                >
                  {isBulkActing && <Loader className="mr-2 size-4 animate-spin" />}
                  Bulk Deactivate
                </Button>
              </>
            )}
            <Input placeholder="Search name, email, role..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
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
                      {selectedUser.activeRole}
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
                    <span className="font-medium capitalize">{selectedUser.roles && selectedUser.roles.length ? selectedUser.roles.join(', ') : selectedUser.activeRole}</span>
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
                {selectedUser?.status === 'invited' && (
                  <div className="rounded-lg border border-dashed p-3 flex flex-col gap-3">
                    <div className="text-sm">
                      <span className="font-medium">Invitation Pending</span>
                      <p className="text-xs text-muted-foreground">Resend the email or copy the direct invite link for manual sharing.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        className="sm:flex-1"
                        disabled={isActing}
                        onClick={() => {
                          startActing(async () => {
                            try {
                              await resendInvite({ userId: selectedUser.id as Id<'users'> });
                              toast.success('Invite email re-sent');
                            } catch (err) {
                              toastError(err);
                            }
                          });
                        }}
                      >
                        {isActing && <Loader className="mr-2 size-4 animate-spin" />}
                        <Mail className="mr-2 size-4" /> Resend Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="sm:flex-1"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}?invite=${selectedUser.id}`);
                          toast.success('Invite link copied');
                        }}
                      >
                        <Copy className="mr-2 size-4" /> Copy Link
                      </Button>
                    </div>
                  </div>
                )}
                {selectedUser && (
                  <div className="flex flex-col gap-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Roles & Active Role</span>
                    </div>
                    <div className="space-y-2">
                      {roles.map((r) => {
                        const assigned = (selectedUser.roles && selectedUser.roles.includes(r)) || selectedUser.activeRole === r;
                        const isActive = selectedUser.activeRole === r;
                        return (
                          <div key={r} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                            <Checkbox
                              checked={assigned}
                              disabled={isActing}
                              onCheckedChange={(value) => {
                                const checked = !!value;
                                if (checked) {
                                  startActing(async () => {
                                    try {
                                      await addRole({ userId: selectedUser.id as Id<'users'>, role: r });
                                      // If this is the first role being added, also set as active
                                      const hadAny = !!(selectedUser.roles && selectedUser.roles.length);
                                      if (!hadAny) {
                                        await setActiveRole({ userId: selectedUser.id as Id<'users'>, role: r });
                                      }
                                      setSelectedUser((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              roles: prev.roles ? Array.from(new Set([...prev.roles, r])) : [r],
                                              activeRole: prev.roles && prev.roles.length > 0 ? prev.activeRole : r,
                                            }
                                          : prev,
                                      );
                                      toast.success('Role added');
                                    } catch (err) {
                                      toastError(err);
                                    }
                                  });
                                } else {
                                  const currentRoles = selectedUser.roles ? [...selectedUser.roles] : selectedUser.activeRole ? [selectedUser.activeRole] : [];
                                  const remaining = currentRoles.filter((rr) => rr !== r);
                                  if (remaining.length === 0) {
                                    toast.error('User must have at least one role');
                                    return;
                                  }
                                  startActing(async () => {
                                    try {
                                      await removeRole({ userId: selectedUser.id as Id<'users'>, role: r });
                                      const removedActive = selectedUser.activeRole === r;
                                      const nextActive = removedActive ? remaining[0] : selectedUser.activeRole;
                                      if (removedActive) {
                                        await setActiveRole({ userId: selectedUser.id as Id<'users'>, role: nextActive });
                                      }
                                      setSelectedUser((prev) => (prev ? { ...prev, roles: remaining, activeRole: nextActive } : prev));
                                      toast.success('Role removed');
                                    } catch (err) {
                                      toastError(err);
                                    }
                                  });
                                }
                              }}
                            />
                            <span className="capitalize flex-1">{r}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className={isActive ? 'text-yellow-500' : 'text-muted-foreground hover:text-foreground'}
                              title={isActive ? 'Active role' : 'Set as active'}
                              disabled={!assigned || isActive || isActing}
                              onClick={() => {
                                if (isActive || !assigned) return;
                                startActing(async () => {
                                  try {
                                    await setActiveRole({ userId: selectedUser.id as Id<'users'>, role: r });
                                    setSelectedUser((prev) => (prev ? { ...prev, activeRole: r } : prev));
                                    toast.success('Active role switched');
                                  } catch (err) {
                                    toastError(err);
                                  }
                                });
                              }}
                            >
                              {isActive ? <IconStarFilled className="size-4" /> : <IconStar className="size-4" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DrawerFooter>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {selectedUser && selectedUser.status !== 'invited' && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleSetStatus(selectedUser?.status === 'active' ? 'inactive' : 'active')}
                    variant={selectedUser?.status === 'active' ? 'destructive' : 'default'}
                    disabled={isActing || !selectedUser || (selectedUser?.status === 'active' && selectedUser.id === currentUser.id)}
                    title={selectedUser?.status === 'active' && selectedUser.id === currentUser.id ? 'You cannot deactivate yourself' : undefined}
                  >
                    {isActing && <Loader className="mr-2 size-4 animate-spin" />}
                    {selectedUser?.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              )}
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
