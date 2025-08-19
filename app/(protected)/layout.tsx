import { AuthProvider } from '@/providers/auth';
import { TOKEN_COOKIE_NAME } from '@/constants';
import { api } from '@/convex/_generated/api';
import { cookies } from 'next/headers';
import { preloadQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { removeToken } from '@/actions/remove-token';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value || null;

  if (!token) {
    return redirect('/');
  }

  try {
    const userQuery = await preloadQuery(api.auth.getUser, { userId: token });
    return <AuthProvider userQuery={userQuery}>{children}</AuthProvider>;
  } catch {
    await removeToken();
  }
}
