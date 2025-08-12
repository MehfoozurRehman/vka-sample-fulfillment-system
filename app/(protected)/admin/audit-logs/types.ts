import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export type AuditRow = NonNullable<ReturnType<typeof useQuery<typeof api.audit.list>>>[number];
