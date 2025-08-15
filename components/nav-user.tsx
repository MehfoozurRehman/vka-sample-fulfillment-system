'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IconDotsVertical, IconLogout, IconUserCircle } from '@tabler/icons-react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

import Link from 'next/link';
import { Loader } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { removeToken } from '@/actions/remove-token';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';
import { useAuth } from '@/hooks/use-user';
import { useMutation } from 'convex/react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function NavUser() {
  const user = useAuth();

  const { isMobile } = useSidebar();

  const pathname = usePathname();

  const router = useRouter();

  const setActiveRole = useMutation(api.user.setActiveRole);

  const root = pathname.split('/')[1] || '';

  const [isLoggingOut, startLogout] = useTransition();

  const logout = async () => {
    startLogout(async () => {
      await removeToken();
    });
  };

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n.charAt(0))
        .join('')
        .toUpperCase()
    : '';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.picture} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.picture} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user.roles && user.roles.length > 1 && (
              <>
                <DropdownMenuLabel className="text-xs uppercase tracking-wide opacity-70">Switch Role</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {user.roles.map((r) => (
                    <DropdownMenuItem
                      key={r}
                      disabled={user.activeRole === r || isLoggingOut}
                      onClick={async () => {
                        if (user.activeRole === r) return;

                        try {
                          await setActiveRole({ userId: user.id, role: r });
                          router.push(`/${r}`);
                          toast.success(`Switched to ${r}`);
                        } catch (e) {
                          toastError(e);
                        }
                      }}
                    >
                      {r === user.activeRole ? '✓ ' : ''}
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuGroup>
              <Link href={`/${root}/profile`}>
                <DropdownMenuItem>
                  <IconUserCircle />
                  Account
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              {isLoggingOut ? <Loader className="mr-2 animate-spin size-4" /> : <IconLogout />}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
