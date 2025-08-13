'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter, useSearchParams } from 'next/navigation';

import { Loader } from 'lucide-react';
import { RoleType } from '@/constants';
import { api } from '@/convex/_generated/api';
import { cn } from '@/lib/utils';
import { saveToken } from '@/actions/save-token';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';
import { useGoogleLogin } from '@react-oauth/google';
import { useMutation } from 'convex/react';
import { useTransition } from 'react';

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const inviteId = searchParams.get('invite') || null;

  const login = useMutation(api.auth.login);

  const acceptInvite = useMutation(api.auth.acceptInvite);

  const loginCallback = useGoogleLogin({
    onSuccess: async (res) => {
      startTransition(async () => {
        try {
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
              Authorization: `Bearer ${res.access_token}`,
            },
          });

          const gInfo = await userInfoResponse.json();

          if (gInfo && gInfo.email && gInfo.sub) {
            let data: { id: string; activeRole: RoleType } | null = null;

            if (inviteId) {
              data = await acceptInvite({
                picture: gInfo.picture,
                googleId: gInfo.sub,
                inviteId,
              });
            } else {
              data = await login({
                googleId: gInfo.sub,
              });
            }

            if (!data) {
              toast.error('Login failed');

              return;
            }

            await saveToken(data.id);

            if (inviteId) {
              toast.success(`Welcome, ${gInfo.name}! Your invite has been accepted.`);
            } else {
              toast.success(`Welcome back, ${gInfo.name}!`);
            }

            router.replace(`/${data.activeRole}`);
          } else {
            toast.error('Failed to fetch Google user info.');
          }
        } catch (error) {
          toastError(error);
        }
      });
    },
  });

  const [isPending, startTransition] = useTransition();

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Login with your Google account</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <div className="grid gap-6">
              <div className="flex justify-center w-full">
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-2 rounded-full bg-black text-white hover:bg-gray-900 transition-colors disabled:opacity-50 cursor-pointer"
                  disabled={isPending}
                  onClick={() => loginCallback()}
                >
                  {isPending ? (
                    <Loader className="animate-spin" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 48 48" className="mr-2" aria-hidden="true">
                      <g>
                        <path
                          fill="#4285F4"
                          d="M44.5 20H24v8.5h11.7C34.7 32.9 30.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 2.9l6.2-6.2C34.5 6.7 29.5 4.5 24 4.5 13.5 4.5 5 13 5 24s8.5 19.5 19 19.5c9.5 0 18-7.7 18-19.5 0-1.3-.1-2.7-.5-4z"
                        />
                        <path fill="#34A853" d="M6.3 14.7l7 5.1C15.6 16.1 19.5 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.2-6.2C34.5 6.7 29.5 4.5 24 4.5c-7.2 0-13.3 4.1-16.7 10.2z" />
                        <path fill="#FBBC05" d="M24 44.5c5.5 0 10.5-1.8 14.3-4.9l-6.6-5.4c-2 1.4-4.6 2.3-7.7 2.3-6.1 0-11.3-3.9-13.2-9.2l-7 5.4C7.7 40.4 15.1 44.5 24 44.5z" />
                        <path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-1.1 3.1-4.1 5.5-7.7 5.5-6.1 0-11.3-3.9-13.2-9.2l-7 5.4C7.7 40.4 15.1 44.5 24 44.5c9.5 0 18-7.7 18-19.5 0-1.3-.1-2.7-.5-4z" />
                      </g>
                    </svg>
                  )}
                  Continue with Google
                </button>
              </div>
              <div className="text-center text-sm">Login with your Google account to continue using Clipout.</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
