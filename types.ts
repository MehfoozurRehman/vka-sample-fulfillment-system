import { useQuery } from 'convex/react';
import { api } from './convex/_generated/api';

export interface GoogleLoginResponse {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

export type User = NonNullable<ReturnType<typeof useQuery<typeof api.auth.getUser>>>;
