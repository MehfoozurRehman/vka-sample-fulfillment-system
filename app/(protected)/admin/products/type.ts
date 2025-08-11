import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export type ProductType = NonNullable<ReturnType<typeof useQuery<typeof api.product.list>>>[number];
