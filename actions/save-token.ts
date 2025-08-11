'use server';

import { TOKEN_COOKIE_NAME } from '@/constants';
import { cookies } from 'next/headers';

export async function saveToken(userId: string) {
  const cookie = await cookies();

  cookie.set(TOKEN_COOKIE_NAME, userId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}
