import AuthProvider from '@/providers/auth';
import React from 'react';
import { TOKEN_COOKIE_NAME } from '@/constants';
import { api } from '@/convex/_generated/api';
import { cookies } from 'next/headers';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookie = await cookies();

  const token = cookie.get(TOKEN_COOKIE_NAME)?.value || null;

  if (!token) {
    return redirect('/');
  }

  const user = await fetchQuery(api.auth.getUser, { userId: token });

  if (!user) {
    return redirect('/');
  }

  return <AuthProvider user={user}>{children}</AuthProvider>;
}
