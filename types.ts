import { useQuery } from 'convex/react';
import { api } from './convex/_generated/api';

export type AuthUser = NonNullable<ReturnType<typeof useQuery<typeof api.auth.getUser>>>;
