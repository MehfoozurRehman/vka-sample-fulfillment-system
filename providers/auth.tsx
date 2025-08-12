'use client';

import { createContext, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Id } from '@/convex/_generated/dataModel';
import { Loader } from 'lucide-react';
import { User } from '@/types';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export const AuthContext = createContext<User | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
  user: User | null;
}

export function AuthProvider({ children, user: userProp }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const redirectingRef = useRef(false);
  const root = (pathname.split('/')[1] || '').toLowerCase();

  const userClient = useQuery(api.auth.getUser, { userId: userProp?.id as Id<'users'> });

  const user = userClient ?? userProp;

  const contextValue = useMemo(() => user, [user]);

  useEffect(() => {
    if (!user) return;

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
          <Loader className="size-6 animate-spin" />
        </div>
      )}
      {children}
    </AuthContext>
  );
}
