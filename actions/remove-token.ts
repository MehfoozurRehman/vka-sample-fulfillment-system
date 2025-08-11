'use server';

import { TOKEN_COOKIE_NAME } from '../../remotion/constants';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function removeToken() {
  const cookie = await cookies();

  const token = cookie.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return;
  }

  cookie.set(TOKEN_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
  });

  redirect('/');
}
