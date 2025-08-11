'use server';

import { TOKEN_COOKIE_NAME } from '../../remotion/constants';
import { cookies } from 'next/headers';

export async function saveToken(userDetails: { email: string; name: string; picture: string; id: string }) {
  const { id } = userDetails;

  const cookie = await cookies();

  cookie.set(TOKEN_COOKIE_NAME, id, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}
