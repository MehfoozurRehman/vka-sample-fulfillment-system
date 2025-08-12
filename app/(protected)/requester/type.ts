import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export type RequestRow = {
  id: string;
  requestId: string;
  company: string;
  contactName: string;
  applicationType: string;
  products: number;
  status: string;
  stage: string;
  createdAt: string;
};

export type RecentRequestsType = NonNullable<ReturnType<typeof useQuery<typeof api.request.recent>>>;
