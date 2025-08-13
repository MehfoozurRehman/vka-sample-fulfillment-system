import { useQuery } from 'convex/react';
import { api } from './convex/_generated/api';

export type User = NonNullable<ReturnType<typeof useQuery<typeof api.auth.getUser>>> & { roles?: string[]; activeRole?: string };
