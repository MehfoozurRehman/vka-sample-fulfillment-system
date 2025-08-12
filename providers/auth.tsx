'use client';

import { Preloaded, usePreloadedQuery } from 'convex/react';
import { createContext, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { User } from '@/types';
import { api } from '@/convex/_generated/api';

export const AuthContext = createContext<User | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  userQuery: Preloaded<typeof api.auth.getUser>;
}

export function AuthProvider({ children, userQuery }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false);
  const root = (pathname.split('/')[1] || '').toLowerCase();

  const user = usePreloadedQuery(userQuery);

  const contextValue = useMemo(() => user, [user]);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }

    if (user.role && root !== user.role) {
      if (!redirectingRef.current) {
        redirectingRef.current = true;
        router.replace(`/${user.role}`);
        setTimeout(() => {
          redirectingRef.current = false;
        }, 300);
      }
    }
  }, [user, root, router]);

  const showOverlay = !!user && root !== user.role;

  return (
    <AuthContext value={contextValue}>
      {showOverlay && (
        <div suppressHydrationWarning className="pointer-events-none fixed inset-0 z-50 flex h-screen flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-sm">
          <svg className="size-6 animate-spin text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )}
      {children}
    </AuthContext>
  );
}
