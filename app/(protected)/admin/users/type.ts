import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export type DataType = NonNullable<ReturnType<typeof useQuery<typeof api.user.getUsers>>>[number];
