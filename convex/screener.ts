import { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

import dayjs from 'dayjs';
import { v } from 'convex/values';

// Types
type UserDoc = Doc<'users'>;
type RequestDoc = Doc<'requests'>;
type StakeholderDoc = Doc<'stakeholders'>;

// Minimal context type (Convex supplies a db with query/insert/patch)
interface DbLike {
  query: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  get: (id: any) => Promise<unknown>; // eslint-disable-line @typescript-eslint/no-explicit-any
  insert: (table: string, value: unknown) => Promise<unknown>;
  patch: (id: any, value: unknown) => Promise<void>; // eslint-disable-line @typescript-eslint/no-explicit-any
}
interface Ctx {
  db: DbLike;
}

// Helper: fetch user and ensure role
async function assertScreener(ctx: Ctx, email: string): Promise<UserDoc> {
  const user = (await ctx.db
    .query('users')
    .withIndex('by_email', (q: unknown) => (q as any).eq('email', email)) // eslint-disable-line @typescript-eslint/no-explicit-any
    .unique()) as UserDoc | null;
  if (!user || (user as any).deletedAt) throw new Error('User not found'); // eslint-disable-line @typescript-eslint/no-explicit-any
  const roles: string[] = (user as any).roles || [(user as any).activeRole].filter(Boolean); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!roles.includes('screener')) throw new Error('Not authorized');
  return user;
}

export const pending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 50, 100);
    const recent = (await ctx.db.query('requests').withIndex('by_createdAt').order('desc').collect()) as RequestDoc[];
    const pending = recent.filter((r: RequestDoc) => !(r as any).deletedAt && r.status.toLowerCase().includes('pending')).slice(0, max); // eslint-disable-line @typescript-eslint/no-explicit-any

    const stakeholderIds = Array.from(new Set(pending.map((r) => r.companyId as Id<'stakeholders'>)));
    const stakeholders = (await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)))) as (StakeholderDoc | null)[];
    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [(s as StakeholderDoc)._id, s as StakeholderDoc]));

    return pending.map((r) => {
      const st = stakeholderMap.get(r.companyId as Id<'stakeholders'>);
      return {
        id: (r as any)._id, // eslint-disable-line @typescript-eslint/no-explicit-any
        requestId: r.requestId,
        company: st?.companyName || 'Unknown',
        vip: !!st?.vipFlag,
        products: r.productsRequested.length,
        applicationType: r.applicationType,
        projectName: r.projectName,
        createdAt: (r as any).createdAt, // eslint-disable-line @typescript-eslint/no-explicit-any
        createdAtFmt: dayjs((r as any).createdAt).format('YYYY-MM-DD HH:mm'), // eslint-disable-line @typescript-eslint/no-explicit-any
      } as const;
    });
  },
});

export const detail = query({
  args: { id: v.id('requests') },
  handler: async (ctx, { id }) => {
    const r = (await ctx.db.get(id)) as RequestDoc | null;
    if (!r || (r as any).deletedAt) return null; // eslint-disable-line @typescript-eslint/no-explicit-any
    const stakeholder = (await ctx.db.get((r as any).companyId)) as StakeholderDoc | null; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Enrich requested products with product metadata
    const productsDetailed = await Promise.all(
      (r.productsRequested || []).map(async (item) => {
        const prod = await ctx.db.get(item.productId);
        return {
          id: item.productId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          productId: prod ? (prod as any).productId : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: prod ? (prod as any).productName : undefined,
          quantity: item.quantity,
          notes: item.notes,
        } as const;
      }),
    );

    const companyReqs = (await ctx.db
      .query('requests')
      .withIndex('by_companyId', (q: unknown) => (q as any).eq('companyId', (r as any).companyId)) // eslint-disable-line @typescript-eslint/no-explicit-any
      .collect()) as RequestDoc[];
    const activeCompanyReqs = companyReqs.filter((x) => !(x as any).deletedAt).sort((a, b) => (b as any).createdAt - (a as any).createdAt); // eslint-disable-line @typescript-eslint/no-explicit-any
    const lastFive = activeCompanyReqs.slice(0, 5).map((x) => ({
      id: (x as any)._id, // eslint-disable-line @typescript-eslint/no-explicit-any
      requestId: x.requestId,
      status: x.status,
      createdAt: (x as any).createdAt, // eslint-disable-line @typescript-eslint/no-explicit-any
      createdAtFmt: dayjs((x as any).createdAt).format('YYYY-MM-DD'), // eslint-disable-line @typescript-eslint/no-explicit-any
      products: x.productsRequested.length,
    }));
    const totalSamples12mo = activeCompanyReqs
      .filter((x) => (x as any).createdAt >= Date.now() - 365 * 24 * 60 * 60 * 1000) // eslint-disable-line @typescript-eslint/no-explicit-any
      .reduce((sum, x) => sum + x.productsRequested.reduce((s, p) => s + p.quantity, 0), 0);

    return { request: r, stakeholder, productsDetailed, lastFive, totalSamples12mo } as const;
  },
});

export const approve = mutation({
  args: { id: v.id('requests'), reviewedBy: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { id, reviewedBy, notes }) => {
    const reviewer = await assertScreener(ctx as Ctx, reviewedBy);
    const req = (await ctx.db.get(id)) as RequestDoc | null;
    if (!req || (req as any).deletedAt) throw new Error('Request not found'); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Already reviewed');

    const now = Date.now();
    await ctx.db.patch(id, { status: 'Approved', reviewedBy, reviewDate: now, reviewNotes: notes, updatedAt: now });

    const newOrderId = await ctx.db.insert('orders', {
      orderId: 'AUTO',
      requestId: id,
      status: 'Ready',
      documentsConfirmed: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('auditLogs', {
      userId: (reviewer as any)._id, // eslint-disable-line @typescript-eslint/no-explicit-any
      action: 'approveRequest',
      table: 'requests',
      recordId: id,
      changes: { status: 'Approved' },
      timestamp: now,
    });
    await ctx.db.insert('auditLogs', {
      userId: (reviewer as any)._id, // eslint-disable-line @typescript-eslint/no-explicit-any
      action: 'createOrder',
      table: 'orders',
      recordId: String(newOrderId),
      changes: { requestId: id },
      timestamp: now,
    });

    return { ok: true } as const;
  },
});

export const reject = mutation({
  args: { id: v.id('requests'), reviewedBy: v.string(), reason: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { id, reviewedBy, reason, notes }) => {
    const reviewer = await assertScreener(ctx as Ctx, reviewedBy);
    const req = (await ctx.db.get(id)) as RequestDoc | null;
    if (!req || (req as any).deletedAt) throw new Error('Request not found'); // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Already reviewed');
    const now = Date.now();
    await ctx.db.patch(id, { status: 'Rejected', reviewedBy, reviewDate: now, rejectionReason: reason, reviewNotes: notes, updatedAt: now });

    await ctx.db.insert('auditLogs', {
      userId: (reviewer as any)._id, // eslint-disable-line @typescript-eslint/no-explicit-any
      action: 'rejectRequest',
      table: 'requests',
      recordId: id,
      changes: { status: 'Rejected', reason },
      timestamp: now,
    });

    return { ok: true } as const;
  },
});

export const metrics = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const range = Math.min(Math.max(days ?? 90, 7), 180); // clamp 7-180
    const startTs = Date.now() - range * 24 * 60 * 60 * 1000;

    const [requests, stakeholders] = (await Promise.all([
      ctx.db
        .query('requests')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex('by_createdAt', (q: unknown) => (q as any).gte('createdAt', startTs))
        .collect(),
      ctx.db.query('stakeholders').collect(),
    ])) as [RequestDoc[], StakeholderDoc[]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stakeholderMap = new Map((stakeholders as StakeholderDoc[]).map((s) => [(s as any)._id, s] as [Id<'stakeholders'>, StakeholderDoc]));

    const now = Date.now();
    const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

    interface Daily {
      date: string;
      approved: number;
      rejected: number;
      pending: number;
    }
    const dailyMap: Record<string, Daily> = {};

    let approved30 = 0;
    let rejected30 = 0;

    let pendingUnder24 = 0;
    let pending24to48 = 0;
    let pendingOver48 = 0;
    let totalPending = 0;
    let vipPending = 0;
    let totalItemsPending = 0;

    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    (requests as RequestDoc[]).forEach((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((r as any).deletedAt) return;
      const statusLower = r.status.toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdAt = (r as any).createdAt as number;
      const ageMs = now - createdAt;

      if (statusLower.includes('pending')) {
        totalPending += 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        totalItemsPending += r.productsRequested?.reduce?.((s: number, p: any) => s + (p.quantity || 0), 0) || 0;
        if (ageMs > 48 * 3600 * 1000) pendingOver48 += 1;
        else if (ageMs > 24 * 3600 * 1000) pending24to48 += 1;
        else pendingUnder24 += 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const st = stakeholderMap.get((r as any).companyId);
        if (st?.vipFlag) vipPending += 1;
      }

      const key = dayKey(createdAt);
      if (!dailyMap[key]) dailyMap[key] = { date: key, approved: 0, rejected: 0, pending: 0 };
      if (statusLower === 'approved') dailyMap[key].approved += 1;
      else if (statusLower === 'rejected') dailyMap[key].rejected += 1;
      else if (statusLower.includes('pending')) dailyMap[key].pending += 1;

      if (now - createdAt <= THIRTY_DAYS) {
        if (statusLower === 'approved') approved30 += 1;
        else if (statusLower === 'rejected') rejected30 += 1;
      }
    });

    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const approvalRate30d = approved30 + rejected30 > 0 ? approved30 / (approved30 + rejected30) : 0;

    const companyPendingCount: Record<string, { company: string; count: number; vip: boolean }> = {};
    const companyVolume30d: Record<string, { company: string; count: number; vip: boolean }> = {};
    (requests as RequestDoc[]).forEach((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((r as any).deletedAt) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const st = stakeholderMap.get((r as any).companyId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const key = String((r as any).companyId);
      if (r.status.toLowerCase().includes('pending')) {
        if (!companyPendingCount[key]) companyPendingCount[key] = { company: st?.companyName || 'Unknown', count: 0, vip: !!st?.vipFlag };
        companyPendingCount[key].count += 1;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (now - (r as any).createdAt <= THIRTY_DAYS) {
        if (!companyVolume30d[key]) companyVolume30d[key] = { company: st?.companyName || 'Unknown', count: 0, vip: !!st?.vipFlag };
        companyVolume30d[key].count += 1;
      }
    });

    const topPending = Object.values(companyPendingCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topVolume30d = Object.values(companyVolume30d)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const avgItemsPending = totalPending ? Math.round(totalItemsPending / totalPending) : 0;

    return {
      rangeDays: range,
      daily,
      approvalRate30d,
      approved30,
      rejected30,
      ageBuckets: { under24: pendingUnder24, between24and48: pending24to48, over48: pendingOver48 },
      totals: { totalPending, vipPending, avgItemsPending },
      topPending,
      topVolume30d,
    } as const;
  },
});
