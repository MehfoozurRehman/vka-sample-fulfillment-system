'use client';

import { createContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { Loader } from 'lucide-react';
import { User } from '@/types';

export const AuthContext = createContext<User | null>(null);

export default function AuthProvider({ children, user }: { children: React.ReactNode; user: User }) {
  const router = useRouter();

  const pathname = usePathname();

  const root = pathname.split('/')[1];

  useEffect(() => {
    if (pathname !== `/${user.role}` && root !== user.role) {
      router.push(`/${user.role}`);
    }
  }, [pathname, user.role, root, router]);

  return (
    <AuthContext value={user}>
      {root !== user.role && (
        <div suppressHydrationWarning className="flex flex-col gap-4 items-center justify-center h-screen position-fixed top-0 left-0 right-0 bg-background">
          <Loader className="animate-spin" />
        </div>
      )}
      {children}
    </AuthContext>
  );
}
