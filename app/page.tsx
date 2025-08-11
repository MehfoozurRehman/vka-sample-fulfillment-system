import { GAuthProvider } from '@/providers/gauth';
import { GalleryVerticalEnd } from 'lucide-react';
import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import { TOKEN_COOKIE_NAME } from '@/constants';
import { api } from '@/convex/_generated/api';
import { cookies } from 'next/headers';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const cookie = await cookies();

  const token = cookie.get(TOKEN_COOKIE_NAME)?.value || null;

  if (token) {
    const user = await fetchQuery(api.auth.checkUserRole, { userId: token });

    if (user) {
      return redirect(`/${user.role}`);
    }
  }

  return (
    <GAuthProvider>
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Link href="/" className="flex items-center gap-2 self-center font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            VKA Sample Fulfillment
          </Link>
          <LoginForm />
        </div>
      </div>
    </GAuthProvider>
  );
}
