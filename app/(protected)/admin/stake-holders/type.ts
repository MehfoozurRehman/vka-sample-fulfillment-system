import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export type StakeholderType = NonNullable<ReturnType<typeof useQuery<typeof api.stakeholder.getStakeholders>>>[number];
