'use client';

import { usePathname, useRouter } from 'next/navigation';

import { Button } from './ui/button';
import { ChevronLeft } from 'lucide-react';
import ClickAwayListener from 'react-click-away-listener';
import { IconBell } from '@tabler/icons-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from './theme-button';
import { useState } from 'react';

export function SiteHeader() {
  const router = useRouter();

  const pathname = usePathname();

  const pageName = pathname
    .split('/')
    .filter((segment) => segment && segment !== 'admin')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' / ');

  const isRoot = pathname.split('/').length === 2;

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
          <Notifications />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Notifications() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <div className="relative">
        <Button variant="outline" size="icon" className="relative" onClick={() => setIsOpen(!isOpen)}>
          <IconBell />
          <span className="sr-only">Notifications</span>
          <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
        </Button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-md bg-white shadow-lg">
            <div className="p-4">No new notifications</div>
          </div>
        )}
      </div>
    </ClickAwayListener>
  );
}
