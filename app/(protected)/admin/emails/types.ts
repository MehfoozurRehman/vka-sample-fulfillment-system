import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export type EmailRow = NonNullable<ReturnType<typeof useQuery<typeof api.email.list>>>[number];

export type EmailStats = NonNullable<ReturnType<typeof useQuery<typeof api.email.stats>>>;
