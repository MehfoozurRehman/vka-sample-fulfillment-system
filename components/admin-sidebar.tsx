'use client';

import * as React from 'react';

import { IconChartBar, IconDashboard, IconFolder, IconHelp, IconListDetails, IconUsers } from '@tabler/icons-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

import { GalleryVerticalEnd } from 'lucide-react';
import Link from 'next/link';
import { NavMain } from '@/components/admin-nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/admin',
      icon: IconDashboard,
    },
    {
      title: 'Analytics',
      url: '/admin/anaytics',
      icon: IconChartBar,
    },
    {
      title: 'Products',
      url: '/admin/products',
      icon: IconFolder,
    },
    {
      title: 'Stake Holders',
      url: '/admin/stake-holders',
      icon: IconUsers,
    },
    {
      title: 'Users',
      url: '/admin/users',
      icon: IconUsers,
    },
    {
      title: 'Audit Logs',
      url: '/admin/audit-logs',
      icon: IconListDetails,
    },
  ],
  navSecondary: [
    {
      title: 'Get Help',
      url: '/admin/help',
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/admin">
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <span className="text-base font-semibold">VKA Sample Fulfillment</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
