import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export type RecentRequestsType = NonNullable<ReturnType<typeof useQuery<typeof api.request.recent>>>;
