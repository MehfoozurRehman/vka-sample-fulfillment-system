'use client';

import { ChevronLeft, Loader } from 'lucide-react';
import { IconAlertTriangle, IconBell, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from './ui/button';
import ClickAwayListener from 'react-click-away-listener';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from './theme-button';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { motion } from 'motion/react';
import { useAuth } from '@/hooks/use-user';
import { useMutation } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

export function SiteHeader() {
  const router = useRouter();

  const pathname = usePathname();

  const pageName = pathname
    .split('/')
    .filter((segment) => segment && segment !== 'admin')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' / ');

  const isRoot = pathname.split('/').length === 2;

  const root = pathname.split('/')[1] || '';
  const isAdmin = root === 'admin';

  const previousPath = pathname.split('/').slice(0, -1).join('/');

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        {!isRoot && (
          <Button onClick={() => router.push(previousPath)} data-slot="back-button" variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Go back</span>
          </Button>
        )}
        <h1 className="text-base font-medium">{pageName}</h1>
        <div className="ml-auto flex items-center gap-2">
          {!isAdmin && <Notifications />}
          <ThemeToggle />
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

  const markAsRead = useMutation(api.notification.markAsRead);
  const markAllAsRead = useMutation(api.notification.markAllAsRead);
  const [isActing, startTransition] = useTransition();

  const unreadCount = data?.length ?? 0;

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
            className="absolute right-0 mt-2 w-100 rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-sm font-medium">Notifications</div>
              <Button
                variant="ghost"
                size="sm"
                disabled={unreadCount === 0 || isPending || isActing}
                onClick={() =>
                  startTransition(async () => {
                    await markAllAsRead({ userId: user.id });
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
                  {data!.map((n) => (
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

function TypeIcon({ type }: { type?: string }) {
  const base = 'mt-0.5 rounded-full p-1.5';
  if (type === 'warning') return <IconAlertTriangle className={`${base} text-amber-600`} />;
  if (type === 'success') return <IconCircleCheck className={`${base} text-emerald-600`} />;
  return <IconInfoCircle className={`${base} text-blue-600`} />;
}
