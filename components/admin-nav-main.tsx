'use client';

import Link from 'next/link';
import { type Icon } from '@tabler/icons-react';

import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';

export function NavMain({ items }: { items: { title: string; url: string; icon?: Icon }[] }) {
  const pathname = usePathname();

  const isActive = (url: string) => (url === '/admin' ? pathname === url : pathname === url || pathname.startsWith(url + '/'));

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} className={'cursor-pointer' + (isActive(item.url) ? ' bg-accent text-accent-foreground' : '')}>
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
