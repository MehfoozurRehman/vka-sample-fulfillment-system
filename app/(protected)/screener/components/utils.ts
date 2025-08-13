import type { Id } from '@/convex/_generated/dataModel';

export interface PendingRow {
  id: Id<'requests'>;
  requestId: string;
  company: string;
  vip: boolean;
  products: number;
  applicationType: string;
  projectName: string;
  createdAt: number;
  createdAtFmt: string;
}

export function computeStats(rows: PendingRow[]) {
  const total = rows.length;

  const vip = rows.filter((r) => r.vip).length;

  const avgItems = total ? Math.round(rows.reduce((s, r) => s + r.products, 0) / total) : 0;

  const now = Date.now();

  let over24 = 0;

  let over48 = 0;

  rows.forEach((r) => {
    const age = now - r.createdAt;

    if (age > 48 * 3600 * 1000) over48++;
    else if (age > 24 * 3600 * 1000) over24++;
  });
  const under24 = total - over24 - over48;

  return { total, vip, avgItems, under24, over24, over48 };
}
