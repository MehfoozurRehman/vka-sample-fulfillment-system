'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, GalleryVerticalEnd, InfoIcon, Loader } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconAlertTriangle, IconBell, IconCircleCheck, IconDotsVertical, IconInfoCircle, IconLogout, IconUserCircle } from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from './ui/button';
import ClickAwayListener from 'react-click-away-listener';
import type { Doc } from '@/convex/_generated/dataModel';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from './theme-button';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { motion } from 'motion/react';
import { removeToken } from '@/actions/remove-token';
import { useAuth } from '@/hooks/use-user';
import { useMutation } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

export function SiteHeader() {
  const router = useRouter();

  const pathname = usePathname();

  const pageName =
    pathname
      .split('/')
      .filter((segment) => segment && segment !== 'admin')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' / ') || 'Dashboard';

  const isRoot = pathname.split('/').length === 2;

  const root = pathname.split('/')[1] || '';

  const isAdmin = root === 'admin';

  const previousPath = pathname.split('/').slice(0, -1).join('/');

  return (
    <header className="flex h-[var(--header-height,56px)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height,56px)]">
      <div className={`flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 ${isAdmin ? '' : 'container mx-auto'}`}>
        {!isAdmin && (
          <Link href={'/' + root} data-slot="logo" className="flex items-center gap-2 text-sm font-semibold border-white/70 transition-colors border-r-2 pr-2">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            <span className="text-base font-semibold">VKA Sample Fulfillment</span>
          </Link>
        )}
        {isAdmin && <SidebarTrigger className="-ml-1" />}
        {!isRoot && (
          <Button onClick={() => router.push(previousPath)} data-slot="back-button" variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Go back</span>
          </Button>
        )}
        <h1 className="text-base font-medium">{pageName}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/${root}/help`}>
            <Button variant="outline" size="icon">
              <InfoIcon />
              <span className="sr-only">Help</span>
            </Button>
          </Link>
          <Notifications />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

function Notifications() {
  const user = useAuth();

  const [isOpen, setIsOpen] = useState(false);

  const { data, isPending } = useQueryWithStatus(api.notification.getNotifications, {
    userId: user.id,
  });

  const { data: prefs } = useQueryWithStatus(api.notification.getPreferences, {
    userId: user.id,
  });

  const markAsRead = useMutation(api.notification.markAsRead);

  const [isActing, startTransition] = useTransition();

  const prefList: Doc<'notificationPreferences'>[] = (prefs as Doc<'notificationPreferences'>[] | undefined) ?? [];
  const disabledTypes = new Set(prefList.filter((p) => !p.enabled).map((p) => p.type));

  const notifications: Doc<'notifications'>[] = (data as Doc<'notifications'>[] | undefined) ?? [];
  const visibleData: Doc<'notifications'>[] = notifications.filter((n) => !disabledTypes.has(n.type));

  const unreadCount = visibleData.length;

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <div className="relative">
        <Button variant="outline" size="icon" className="relative" onClick={() => setIsOpen(!isOpen)}>
          <IconBell />
          <span className="sr-only">Notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full bg-red-500 text-[10px] leading-4 text-white px-1 text-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </Button>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-100 rounded-md border bg-popover text-popover-foreground shadow-md z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-sm font-medium">Notifications</div>
              <Button
                variant="ghost"
                size="sm"
                disabled={unreadCount === 0 || isPending || isActing}
                onClick={() =>
                  startTransition(async () => {
                    await Promise.all(visibleData.map((n) => markAsRead({ notificationId: n._id })));
                  })
                }
                className="text-xs"
              >
                Mark all as read
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isPending ? (
                <div className=" flex items-center justify-center p-6">
                  <Loader className="animate-spin" />
                </div>
              ) : unreadCount === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">You&apos;re all caught up</div>
              ) : (
                <ul className="divide-y">
                  {visibleData.map((n) => (
                    <li key={n._id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/40">
                      <TypeIcon type={n.type} />
                      <div className="flex-1">
                        <div className="text-sm">{n.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">{dayjs(n.createdAt).format('MMM D, YYYY h:mm A')}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isActing}
                        onClick={() =>
                          startTransition(async () => {
                            await markAsRead({ notificationId: n._id });
                          })
                        }
                        className="text-xs"
                      >
                        Mark as read
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </ClickAwayListener>
  );
}

function UserMenu() {
  const user = useAuth();

  const pathname = usePathname();

  const root = pathname.split('/')[1] || '';

  const [isLoggingOut, startLogout] = useTransition();

  const [isSwitching, startSwitch] = useTransition();

  const setActiveRole = useMutation(api.user.setActiveRole);

  const router = useRouter();

  const initials = (user?.name || '')
    .split(' ')
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const logout = () => {
    startLogout(async () => {
      await removeToken();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-2 flex items-center gap-2">
          <Avatar className="h-7 w-7">
            {user?.picture && <AvatarImage src={user.picture} alt={user.name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline text-xs font-medium max-w-32 truncate">{user?.name || 'User'}</span>
          <IconDotsVertical className="size-4 text-muted-foreground" />
          <span className="sr-only">Open user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-2 py-2">
            <Avatar className="h-9 w-9">
              {user?.picture && <AvatarImage src={user.picture} alt={user.name} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="text-xs leading-tight">
              <p className="font-medium truncate max-w-40">{user?.name || '—'}</p>
              <p className="text-muted-foreground truncate max-w-40">{user?.email || ''}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user?.roles && user.roles.length > 1 && (
          <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide opacity-70">Switch Role</DropdownMenuLabel>
            <DropdownMenuGroup>
              {user.roles.map((r) => (
                <DropdownMenuItem
                  key={r}
                  disabled={isSwitching || user.activeRole === r}
                  onClick={() => {
                    if (user.activeRole === r) return;
                    startSwitch(async () => {
                      try {
                        await setActiveRole({ userId: user.id, role: r });
                        router.push(`/${r}`);
                      } catch {
                        /* noop */
                      }
                    });
                  }}
                  className="capitalize"
                >
                  {user.activeRole === r ? '✓ ' : ''}
                  {r}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href={`/${root}/profile`} className="flex items-center gap-2">
              <IconUserCircle className="size-4" />
              <span>Profile</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive">
          {isLoggingOut ? <Loader className="size-4 animate-spin" /> : <IconLogout className="size-4" />}
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TypeIcon({ type }: { type?: string }) {
  const base = 'mt-0.5 rounded-full p-1.5';

  if (type === 'warning') return <IconAlertTriangle className={`${base} text-amber-600`} />;
  if (type === 'success') return <IconCircleCheck className={`${base} text-emerald-600`} />;

  return <IconInfoCircle className={`${base} text-blue-600`} />;
}
