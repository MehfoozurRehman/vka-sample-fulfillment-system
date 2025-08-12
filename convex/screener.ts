import { Doc, Id } from './_generated/dataModel';
import { mutation, query, type DatabaseReader, type DatabaseWriter } from './_generated/server';

import dayjs from 'dayjs';
import { v } from 'convex/values';

// Helper: fetch user and ensure role
async function assertScreener(ctx: { db: DatabaseReader | DatabaseWriter }, email: string): Promise<Doc<'users'>> {
  const user = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique();
  if (!user || user.deletedAt) throw new Error('User not found');
  const roles = user.roles || [];
  const activeRole = user.activeRole || roles[0];
  const effectiveRoles = roles.length ? roles : activeRole ? [activeRole] : [];
  if (!effectiveRoles.includes('screener')) throw new Error('Not authorized');
  return user;
}

/* ------------------------------ pending list ------------------------------ */
export const pending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 50, 100);
    const recent = await ctx.db
      .query('requests')
      .withIndex('by_createdAt')
      .order('desc')
      .collect();

    const pendingReqs = recent
      .filter((r) => !r.deletedAt && r.status.toLowerCase().includes('pending'))
      .slice(0, max);

    const stakeholderIds = Array.from(new Set(pendingReqs.map((r) => r.companyId)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map<Id<'stakeholders'>, Doc<'stakeholders'>>(
      stakeholders.filter(Boolean).map((s) => [s!._id, s!]),
    );

    return pendingReqs.map((r) => {
      const st = stakeholderMap.get(r.companyId);
      return {
        id: r._id,
        requestId: r.requestId,
        company: st?.companyName || 'Unknown',
        vip: !!st?.vipFlag,
        products: r.productsRequested.length,
        applicationType: r.applicationType,
        projectName: r.projectName,
        createdAt: r.createdAt,
        createdAtFmt: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
      };
    });
  },
});

/* ------------------------------- detail view ------------------------------ */
export const detail = query({
  args: { id: v.id('requests') },
  handler: async (ctx, { id }) => {
    const r = await ctx.db.get(id);
    if (!r || r.deletedAt) return null;
    const stakeholder = await ctx.db.get(r.companyId);

    const productsDetailed = await Promise.all(
      (r.productsRequested || []).map(async (item) => {
        const prod = await ctx.db.get(item.productId);
        return {
          id: item.productId,
            productId: prod?.productId,
            name: prod?.productName,
            quantity: item.quantity,
            notes: item.notes,
        } as const;
      }),
    );

    const companyReqs = await ctx.db
      .query('requests')
      .withIndex('by_companyId', (q) => q.eq('companyId', r.companyId))
      .collect();

    const activeCompanyReqs = companyReqs
      .filter((x) => !x.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt);

    const lastFive = activeCompanyReqs.slice(0, 5).map((x) => ({
      id: x._id,
      requestId: x.requestId,
      status: x.status,
      createdAt: x.createdAt,
      createdAtFmt: dayjs(x.createdAt).format('YYYY-MM-DD'),
      products: x.productsRequested.length,
    }));

    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const totalSamples12mo = activeCompanyReqs
      .filter((x) => x.createdAt >= oneYearAgo)
      .reduce(
        (sum, x) => sum + x.productsRequested.reduce((s, p) => s + p.quantity, 0),
        0,
      );

    return { request: r, stakeholder, productsDetailed, lastFive, totalSamples12mo } as const;
  },
});

/* ------------------------------ approve flow ------------------------------ */
export const approve = mutation({
  args: { id: v.id('requests'), reviewedBy: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { id, reviewedBy, notes }) => {
    const reviewer = await assertScreener(ctx, reviewedBy);
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
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
      userId: reviewer._id,
      action: 'approveRequest',
      table: 'requests',
      recordId: id,
      changes: { status: 'Approved' },
      timestamp: now,
    });
    await ctx.db.insert('auditLogs', {
      userId: reviewer._id,
      action: 'createOrder',
      table: 'orders',
      recordId: String(newOrderId),
      changes: { requestId: id },
      timestamp: now,
    });

    return { ok: true } as const;
  },
});

/* ------------------------------- reject flow ------------------------------ */
export const reject = mutation({
  args: { id: v.id('requests'), reviewedBy: v.string(), reason: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { id, reviewedBy, reason, notes }) => {
    const reviewer = await assertScreener(ctx, reviewedBy);
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Already reviewed');
    const now = Date.now();
    await ctx.db.patch(id, {
      status: 'Rejected',
      reviewedBy,
      reviewDate: now,
      rejectionReason: reason,
      reviewNotes: notes,
      updatedAt: now,
    });

    await ctx.db.insert('auditLogs', {
      userId: reviewer._id,
      action: 'rejectRequest',
      table: 'requests',
      recordId: id,
      changes: { status: 'Rejected', reason },
      timestamp: now,
    });

    return { ok: true } as const;
  },
});

/* --------------------------------- metrics -------------------------------- */
export const metrics = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const range = Math.min(Math.max(days ?? 90, 7), 180); // clamp 7-180
    const startTs = Date.now() - range * 24 * 60 * 60 * 1000;

    const [requests, stakeholders] = await Promise.all([
      ctx.db
        .query('requests')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db.query('stakeholders').collect(),
    ]);

    const stakeholderMap = new Map<Id<'stakeholders'>, Doc<'stakeholders'>>(stakeholders.map((s) => [s._id, s]));

    const now = Date.now();
    const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

    interface Daily { date: string; approved: number; rejected: number; pending: number }
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

    requests.forEach((r) => {
      if (r.deletedAt) return;
      const statusLower = r.status.toLowerCase();
      const createdAt = r.createdAt;
      const ageMs = now - createdAt;

      if (statusLower.includes('pending')) {
        totalPending += 1;
        totalItemsPending += r.productsRequested.reduce((s, p) => s + p.quantity, 0);
        if (ageMs > 48 * 3600 * 1000) pendingOver48 += 1;
        else if (ageMs > 24 * 3600 * 1000) pending24to48 += 1;
        else pendingUnder24 += 1;
        const st = stakeholderMap.get(r.companyId);
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

    requests.forEach((r) => {
      if (r.deletedAt) return;
      const st = stakeholderMap.get(r.companyId);
      const key = String(r.companyId);
      if (r.status.toLowerCase().includes('pending')) {
        if (!companyPendingCount[key]) companyPendingCount[key] = { company: st?.companyName || 'Unknown', count: 0, vip: !!st?.vipFlag };
        companyPendingCount[key].count += 1;
      }
      if (now - r.createdAt <= THIRTY_DAYS) {
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
