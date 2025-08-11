'use server';

import { Id } from '@/convex/_generated/dataModel';
import { TOKEN_COOKIE_NAME } from '@/constants';
import { api } from '@/convex/_generated/api';
import { cookies } from 'next/headers';
import { fetchMutation } from 'convex/nextjs';
import { redirect } from 'next/navigation';

export async function removeToken() {
  const cookie = await cookies();

  const token = cookie.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return;
  }

  await fetchMutation(api.audit.addAuditLog, {
    action: 'logout',
    table: 'users',
    userId: token as Id<'users'>,
  });

  cookie.set(TOKEN_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
  });

  redirect('/');
}
