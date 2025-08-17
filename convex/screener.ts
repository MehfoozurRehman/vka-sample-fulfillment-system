import { Doc, Id } from './_generated/dataModel';
import { mutation, query, type DatabaseReader, type DatabaseWriter } from './_generated/server';

import dayjs from 'dayjs';
import { v } from 'convex/values';
import { sendInternalNotifications } from '@/utils/sendInternalNotifications';
import { api, internal } from './_generated/api';
import { renderRequestApprovedHtml } from '../emails/RequestApproved';
import { renderOrderReadyHtml } from '../emails/OrderReady';
import { renderRequestInfoRequestedHtml } from '../emails/RequestInfoRequested';
import { renderRequestInfoRespondedHtml } from '../emails/RequestInfoResponded';
import { renderRequestRejectedHtml } from '../emails/RequestRejected';

function uniqEmails(emails: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      emails
        .filter(Boolean)
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => /.+@.+\..+/.test(e)),
    ),
  );
}

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

export const claim = mutation({
  args: { id: v.id('requests'), screenerEmail: v.string() },
  handler: async (ctx, { id, screenerEmail }) => {
    const user = await assertScreener(ctx, screenerEmail);
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Only pending requests can be claimed');
    if (req.claimedBy && req.claimedBy !== screenerEmail) throw new Error('Request already claimed by another screener');
    const now = Date.now();
    await ctx.db.patch(id, { claimedBy: screenerEmail, claimedAt: now, updatedAt: now });
    await ctx.db.insert('auditLogs', {
      userId: user._id,
      action: 'claimRequest',
      table: 'requests',
      recordId: id,
      changes: { claimedBy: screenerEmail },
      timestamp: now,
    });
    return { ok: true } as const;
  },
});

export const approve = mutation({
  args: { id: v.id('requests'), reviewedBy: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { id, reviewedBy, notes }) => {
    const reviewer = await assertScreener(ctx, reviewedBy);
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Already reviewed');
    if (req.claimedBy && req.claimedBy !== reviewedBy) throw new Error('This request is claimed by another screener');

    const now = Date.now();
    await ctx.db.patch(id, { status: 'Approved', reviewedBy, reviewDate: now, reviewNotes: notes, updatedAt: now });

    let orderId = 'ORD-00001';
    const existing = await ctx.db.query('orders').collect();
    let max = 0;
    for (const o of existing) {
      const m = /^ORD-(\d{5})$/.exec(o.orderId || '');
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
    orderId = `ORD-${String(max + 1).padStart(5, '0')}`;

    const newOrderId = await ctx.db.insert('orders', {
      orderId,
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

    const requesterUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
      .unique();
    if (requesterUser) {
      await sendInternalNotifications(ctx, reviewer._id, 'request.approved', `Request ${req.requestId} approved.`, [requesterUser._id]);
    }
    const allUsers = await ctx.db.query('users').collect();
    const packers = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('packer')) || u.activeRole === 'packer')) as { _id: Id<'users'> }[];
    if (packers.length) {
      await sendInternalNotifications(
        ctx,
        reviewer._id,
        'order.ready',
        `Order for request ${req.requestId} is ready for packing.`,
        packers.map((p) => p._id),
      );
    }

    try {
      const stakeholder = await ctx.db.get(req.companyId);
      const packerEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('packer')) || u.activeRole === 'packer')).map((u) => u.email);
      const adminEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin')).map((u) => u.email);

      const to = uniqEmails([req.email]);
      const cc = uniqEmails([requesterUser?.email, stakeholder?.salesRepEmail, ...packerEmails, ...(stakeholder?.vipFlag ? adminEmails : [])]);

      const subject = `VKA Sample Request [${req.requestId}] Approved`;
      const text = `Hello,\n\nYour sample request ${req.requestId} has been approved and is moving to packing.\n\nThank you,\nVKA`;
      const html = await renderRequestApprovedHtml({ requestId: req.requestId });

      await ctx.runMutation(api.email.sendAndRecordEmail, {
        createdBy: reviewer._id,
        type: 'request.approved.email',
        from: 'VKA <no-reply@vkaff.com>',
        to,
        cc,
        subject,
        text,
        html,
        related: { requestId: id, stakeholderId: req.companyId },
      });
    } catch {}

    try {
      const stakeholder = await ctx.db.get(req.companyId);
      const packerUsers = await ctx.db.query('users').collect();
      const packerEmails = packerUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('packer')) || u.activeRole === 'packer')).map((u) => u.email);
      const requesterUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
        .unique();

      const to = uniqEmails(packerEmails);
      const cc = uniqEmails([requesterUser?.email, stakeholder?.salesRepEmail]);
      const subject = `VKA Order [${orderId}] Ready to Pack`;
      const text = `Hello,\n\nOrder ${orderId} from request ${req.requestId} is ready for packing.\n\nThank you,\nVKA`;
      const html = await renderOrderReadyHtml({ orderId, requestId: req.requestId });

      await ctx.runMutation(api.email.sendAndRecordEmail, {
        createdBy: reviewer._id,
        type: 'order.ready.email',
        from: 'VKA <no-reply@vkaff.com>',
        to,
        cc,
        subject,
        text,
        html,
        related: { orderId: newOrderId, requestId: id, stakeholderId: req.companyId },
      });
    } catch {}

    return { ok: true } as const;
  },
});

export const reject = mutation({
  args: { id: v.id('requests'), reviewedBy: v.string(), reason: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, { id, reviewedBy, reason, notes }) => {
    const reviewer = await assertScreener(ctx, reviewedBy);
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Already reviewed');
    if (req.claimedBy && req.claimedBy !== reviewedBy) throw new Error('This request is claimed by another screener');
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

    const requesterUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
      .unique();
    if (requesterUser) {
      await sendInternalNotifications(ctx, reviewer._id, 'request.rejected', `Request ${req.requestId} rejected: ${reason}`, [requesterUser._id]);
    }

    try {
      const stakeholder = await ctx.db.get(req.companyId);
      const allUsers = await ctx.db.query('users').collect();
      const adminEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin')).map((u) => u.email);

      const to = uniqEmails([req.email]);
      const cc = uniqEmails([requesterUser?.email, stakeholder?.salesRepEmail, ...(stakeholder?.vipFlag ? adminEmails : [])]);
      const subject = `VKA Sample Request [${req.requestId}] Status Update`;
      const text = `Hello,\n\nWe are sorry to inform you that request ${req.requestId} was rejected.\nReason: ${reason}\n\nThank you,\nVKA`;
      const html = await renderRequestRejectedHtml({ requestId: req.requestId, reason });

      await ctx.runMutation(api.email.sendAndRecordEmail, {
        createdBy: reviewer._id,
        type: 'request.rejected.email',
        from: 'VKA <no-reply@vkaff.com>',
        to,
        cc,
        subject,
        text,
        html,
        related: { requestId: id, stakeholderId: req.companyId },
      });
    } catch {}

    return { ok: true } as const;
  },
});

export const requestInfo = mutation({
  args: { id: v.id('requests'), screenerEmail: v.string(), message: v.string() },
  handler: async (ctx, { id, screenerEmail, message }) => {
    const reviewer = await assertScreener(ctx, screenerEmail);
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Cannot request info after decision');
    if (req.claimedBy && req.claimedBy !== screenerEmail) throw new Error('This request is claimed by another screener');
    const now = Date.now();
    await ctx.db.patch(id, {
      status: 'Pending Info',
      infoRequestedBy: screenerEmail,
      infoRequestedAt: now,
      infoRequestMessage: message,
      updatedAt: now,
    });
    await ctx.db.insert('auditLogs', {
      userId: reviewer._id,
      action: 'requestInfo',
      table: 'requests',
      recordId: id,
      changes: { status: 'Pending Info', message },
      timestamp: now,
    });

    const requesterUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
      .unique();
    if (requesterUser) {
      await sendInternalNotifications(ctx, reviewer._id, 'request.infoRequested', `Additional info requested for ${req.requestId}: ${message}`, [requesterUser._id]);
    }

    try {
      const stakeholder = await ctx.db.get(req.companyId);
      const allUsers = await ctx.db.query('users').collect();
      const adminEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin')).map((u) => u.email);

      const requester = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
        .unique();

      const to = uniqEmails([requester?.email]);
      const cc = uniqEmails([stakeholder?.salesRepEmail, ...(stakeholder?.vipFlag ? adminEmails : [])]);
      const subject = `VKA Sample Request [${req.requestId}] – Additional Information Requested`;
      const text = `Hello ${requester?.name ?? ''},\n\nAdditional information has been requested for ${req.requestId}:\n${message}\n\nPlease reply at your earliest convenience.\n\nThank you,\nVKA`;
      const html = await renderRequestInfoRequestedHtml({ requestId: req.requestId, message, requesterName: requester?.name });

      await ctx.runMutation(api.email.sendAndRecordEmail, {
        createdBy: reviewer._id,
        type: 'request.infoRequested.email',
        from: 'VKA <no-reply@vkaff.com>',
        to,
        cc,
        subject,
        text,
        html,
        related: { requestId: id, stakeholderId: req.companyId },
      });

      await ctx.scheduler.runAfter(60_000, internal.email.retryPendingEmails, { limit: 50 });
    } catch {}

    return { ok: true } as const;
  },
});

export const respondInfo = mutation({
  args: { id: v.id('requests'), requesterEmail: v.string(), message: v.string() },
  handler: async (ctx, { id, requesterEmail, message }) => {
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending info')) throw new Error('Not awaiting info');
    if (req.requestedBy !== requesterEmail) throw new Error('Not request owner');
    const now = Date.now();
    await ctx.db.patch(id, {
      status: 'Pending Review',
      infoResponseAt: now,
      infoResponseMessage: message,
      updatedAt: now,
    });
    const owner = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', requesterEmail))
      .unique();
    if (owner) {
      await ctx.db.insert('auditLogs', {
        userId: owner._id,
        action: 'respondInfo',
        table: 'requests',
        recordId: id,
        changes: { status: 'Pending Review' },
        timestamp: now,
      });
    }

    const allUsers = await ctx.db.query('users').collect();
    const screeners = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')) as { _id: Id<'users'> }[];
    if (owner && screeners.length) {
      await sendInternalNotifications(
        ctx,
        owner._id,
        'request.infoResponded',
        `Requester responded with additional info for ${req.requestId}.`,
        screeners.map((s) => s._id),
      );
    }

    try {
      const stakeholder = await ctx.db.get(req.companyId);
      const screenersEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')).map((u) => u.email);
      const to = uniqEmails(screenersEmails);
      const cc = uniqEmails([stakeholder?.salesRepEmail]);
      const subject = `VKA Sample Request [${req.requestId}] – Information Provided`;
      const text = `Hello,\n\nThe requester has provided additional information for ${req.requestId}:\n${message}\n\nThank you,\nVKA`;
      const html = await renderRequestInfoRespondedHtml({ requestId: req.requestId, message });

      await ctx.runMutation(api.email.sendAndRecordEmail, {
        createdBy: owner?._id ?? (screeners[0]?._id as Id<'users'>),
        type: 'request.infoResponded.email',
        from: 'VKA <no-reply@vkaff.com>',
        to,
        cc,
        subject,
        text,
        html,
        related: { requestId: id, stakeholderId: req.companyId },
      });
    } catch {}

    return { ok: true } as const;
  },
});

export const metrics = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const range = Math.min(Math.max(days ?? 90, 7), 180);
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

    const dailyMap: Record<string, { date: string; approved: number; rejected: number; pending: number }> = {};

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

export const pending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 50, 100);
    const recent = await ctx.db.query('requests').withIndex('by_createdAt').order('desc').collect();

    const pendingReqs = recent.filter((r) => !r.deletedAt && r.status.toLowerCase().includes('pending')).slice(0, max);

    const stakeholderIds = Array.from(new Set(pendingReqs.map((r) => r.companyId)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map<Id<'stakeholders'>, Doc<'stakeholders'>>(stakeholders.filter(Boolean).map((s) => [s!._id, s!]));

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
        status: r.status,
      };
    });
  },
});

export const recentDecisions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 200, 500);
    const recent = await ctx.db.query('requests').withIndex('by_createdAt').order('desc').collect();
    const decided = recent.filter((r) => !r.deletedAt && ['approved', 'rejected'].includes(r.status.toLowerCase())).slice(0, max);
    const stakeholderIds = Array.from(new Set(decided.map((r) => r.companyId)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map<Id<'stakeholders'>, Doc<'stakeholders'>>(stakeholders.filter(Boolean).map((s) => [s!._id, s!]));
    return decided.map((r) => {
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
        status: r.status,
        reviewedBy: r.reviewedBy,
        reviewDate: r.reviewDate,
        reviewDateFmt: r.reviewDate ? dayjs(r.reviewDate).format('YYYY-MM-DD HH:mm') : null,
        rejectionReason: r.rejectionReason,
      } as const;
    });
  },
});

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
          productId: prod?.productName,
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

    const activeCompanyReqs = companyReqs.filter((x) => !x.deletedAt).sort((a, b) => b.createdAt - a.createdAt);

    const lastFive = activeCompanyReqs.slice(0, 5).map((x) => ({
      id: x._id,
      requestId: x.requestId,
      status: x.status,
      createdAt: x.createdAt,
      createdAtFmt: dayjs(x.createdAt).format('YYYY-MM-DD'),
      products: x.productsRequested.length,
    }));

    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const totalSamples12mo = activeCompanyReqs.filter((x) => x.createdAt >= oneYearAgo).reduce((sum, x) => sum + x.productsRequested.reduce((s, p) => s + p.quantity, 0), 0);

    let approved = 0;
    let rejected = 0;
    let pending = 0;
    const priorNotes: Array<{
      requestId: string;
      status: string;
      reviewDate?: number;
      reviewDateFmt?: string | null;
      reviewNotes?: string;
      rejectionReason?: string;
    }> = [];
    const productFreq: Record<string, { name: string; count: number }> = {};

    for (const req of activeCompanyReqs) {
      const statusLower = req.status.toLowerCase();
      if (statusLower === 'approved') approved++;
      else if (statusLower === 'rejected') rejected++;
      else if (statusLower.includes('pending')) pending++;
      if (req.reviewNotes || req.rejectionReason) {
        priorNotes.push({
          requestId: req.requestId,
          status: req.status,
          reviewDate: req.reviewDate,
          reviewDateFmt: req.reviewDate ? dayjs(req.reviewDate).format('YYYY-MM-DD') : null,
          reviewNotes: req.reviewNotes,
          rejectionReason: req.rejectionReason,
        });
      }
      for (const pr of req.productsRequested) {
        const prod = await ctx.db.get(pr.productId);
        const key = prod?.productName || 'Unknown';
        if (!productFreq[key]) productFreq[key] = { name: key, count: 0 };
        productFreq[key].count += 1;
      }
    }

    const frequentProductsTop = Object.values(productFreq)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      request: r,
      requester: r.requestedBy,
      stakeholder,
      productsDetailed,
      lastFive,
      totalSamples12mo,
      decisionCounts: { approved, rejected, pending },
      priorNotes,
      frequentProductsTop,
    } as const;
  },
});

export const searchCustomer = query({
  args: { partial: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { partial, limit }) => {
    const q = partial.trim().toLowerCase();
    if (!q) return [] as { id: Id<'stakeholders'>; companyName: string; vipFlag: boolean; requestCount: number }[];
    const max = Math.min(limit ?? 20, 50);
    const stakeholders = await ctx.db.query('stakeholders').collect();
    const matched = stakeholders.filter((s) => !s.deletedAt && s.companyName.toLowerCase().includes(q)).slice(0, max);
    const allRequests = await ctx.db.query('requests').collect();
    const summary = matched.map((m) => {
      const reqs = allRequests.filter((r) => !r.deletedAt && r.companyId === m._id);
      return {
        id: m._id,
        companyName: m.companyName,
        vipFlag: m.vipFlag,
        requestCount: reqs.length,
      };
    });
    return summary;
  },
});

export const customerOverview = query({
  args: { stakeholderId: v.id('stakeholders') },
  handler: async (ctx, { stakeholderId }) => {
    const stakeholder = await ctx.db.get(stakeholderId);
    if (!stakeholder || stakeholder.deletedAt) return null;
    const reqs = await ctx.db
      .query('requests')
      .withIndex('by_companyId', (q) => q.eq('companyId', stakeholderId))
      .collect();
    const active = reqs.filter((r) => !r.deletedAt);
    active.sort((a, b) => a.createdAt - b.createdAt);
    const first = active[0];
    const firstDate = first ? dayjs(first.createdAt).format('MMM YYYY') : null;
    let totalSamples = 0;
    let approved = 0;
    let rejected = 0;
    const productCounts: Record<string, { name: string; count: number }> = {};
    for (const r of active) {
      const statusLower = r.status.toLowerCase();
      if (statusLower === 'approved') approved++;
      else if (statusLower === 'rejected') rejected++;
      for (const p of r.productsRequested) {
        totalSamples += p.quantity;
        const prod = await ctx.db.get(p.productId);
        const key = prod?.productName || 'Unknown';
        if (!productCounts[key]) productCounts[key] = { name: key, count: 0 };
        productCounts[key].count += 1;
      }
    }
    const rejectionRate = approved + rejected > 0 ? rejected / (approved + rejected) : 0;
    const recent = [...active]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((r) => ({
        id: r._id,
        requestId: r.requestId,
        createdAt: r.createdAt,
        dateFmt: dayjs(r.createdAt).format('MMM D, YYYY'),
        products: r.productsRequested.length,
        status: r.status,
        rejectionReason: r.rejectionReason,
      }));
    const freq = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return {
      stakeholder: { id: stakeholder._id, companyName: stakeholder.companyName, vipFlag: stakeholder.vipFlag },
      firstRequest: firstDate,
      totalRequests: active.length,
      totalSamples,
      rejectionRate,
      recent,
      frequentProducts: freq,
    } as const;
  },
});

export const customerFrequentProducts = query({
  args: { stakeholderId: v.id('stakeholders'), from: v.number(), to: v.number() },
  handler: async (ctx, { stakeholderId, from, to }) => {
    const reqs = await ctx.db
      .query('requests')
      .withIndex('by_companyId', (q) => q.eq('companyId', stakeholderId))
      .collect();
    const filtered = reqs.filter((r) => !r.deletedAt && r.createdAt >= from && r.createdAt <= to);
    const productCounts: Record<string, { name: string; count: number }> = {};
    for (const r of filtered) {
      for (const p of r.productsRequested) {
        const prod = await ctx.db.get(p.productId);
        const key = prod?.productName || 'Unknown';
        if (!productCounts[key]) productCounts[key] = { name: key, count: 0 };
        productCounts[key].count += 1;
      }
    }
    return Object.values(productCounts).sort((a, b) => b.count - a.count);
  },
});

export const reports = query({
  args: {
    report: v.string(),
    from: v.number(),
    to: v.number(),
    stakeholderId: v.optional(v.id('stakeholders')),
  },
  handler: async (ctx, { report, from, to, stakeholderId }) => {
    const all = await ctx.db
      .query('requests')
      .withIndex('by_createdAt', (q) => q.gte('createdAt', from))
      .collect();
    const data = all.filter((r) => !r.deletedAt && r.createdAt <= to);
    const lower = report.toLowerCase();

    if (lower === 'pendingrequestsbyage') {
      const now = Date.now();
      let under24 = 0;
      let between24and48 = 0;
      let over48 = 0;
      data.forEach((r) => {
        if (!r.status.toLowerCase().includes('pending')) return;
        const age = now - r.createdAt;
        if (age > 48 * 3600 * 1000) over48++;
        else if (age > 24 * 3600 * 1000) between24and48++;
        else under24++;
      });
      return { type: report, under24, between24and48, over48 } as const;
    }
    if (lower === 'top10customersthismonth' || lower === 'topcustomers') {
      const companyCounts: Record<string, { companyId: Id<'stakeholders'>; count: number }> = {};
      for (const r of data) {
        if (!companyCounts[r.companyId as string]) companyCounts[r.companyId as string] = { companyId: r.companyId, count: 0 };
        companyCounts[r.companyId as string].count++;
      }
      const stakeholders = await Promise.all(Object.values(companyCounts).map((c) => ctx.db.get(c.companyId)));
      const arr = Object.values(companyCounts)
        .map((c) => ({ company: stakeholders.find((s) => s?._id === c.companyId)?.companyName || 'Unknown', count: c.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      return { type: report, top: arr } as const;
    }
    if (lower === 'productsrequestedthisweek' || lower === 'productsrequested') {
      const productCounts: Record<string, { name: string; count: number }> = {};
      for (const r of data) {
        for (const p of r.productsRequested) {
          const prod = await ctx.db.get(p.productId);
          const key = prod?.productName || 'Unknown';
          if (!productCounts[key]) productCounts[key] = { name: key, count: 0 };
          productCounts[key].count += p.quantity;
        }
      }
      const arr = Object.values(productCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 25);
      return { type: report, products: arr } as const;
    }
    if (lower === 'rejectionreasonssummary') {
      const reasons: Record<string, number> = {};
      data.forEach((r) => {
        if (r.status.toLowerCase() === 'rejected' && r.rejectionReason) {
          const key = r.rejectionReason.trim();
          reasons[key] = (reasons[key] || 0) + 1;
        }
      });
      const arr = Object.entries(reasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
      return { type: report, reasons: arr } as const;
    }
    if (lower === 'averageprocessingtime') {
      let total = 0;
      let count = 0;
      data.forEach((r) => {
        if (['approved', 'rejected'].includes(r.status.toLowerCase()) && r.reviewDate) {
          total += r.reviewDate - r.createdAt;
          count++;
        }
      });
      const avgMs = count ? total / count : 0;
      return { type: report, averageMs: avgMs, averageHours: avgMs / 3600000 } as const;
    }
    if (lower === 'customerrequesthistory' && stakeholderId) {
      const arr = data
        .filter((r) => r.companyId === stakeholderId)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((r) => ({
          requestId: r.requestId,
          createdAt: r.createdAt,
          date: dayjs(r.createdAt).format('YYYY-MM-DD'),
          status: r.status,
          products: r.productsRequested.length,
          rejectionReason: r.rejectionReason,
        }));
      return { type: report, history: arr } as const;
    }

    return { type: report, message: 'Unknown report type or insufficient parameters' } as const;
  },
});

export const exportRequests = query({
  args: {
    all: v.optional(v.boolean()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    stakeholderId: v.optional(v.id('stakeholders')),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { all, from, to, stakeholderId, status }) => {
    let reqs = await ctx.db.query('requests').collect();
    reqs = reqs.filter((r) => !r.deletedAt);
    if (!all) {
      if (from) reqs = reqs.filter((r) => r.createdAt >= from);
      if (to) reqs = reqs.filter((r) => r.createdAt <= to);
    }
    if (stakeholderId) reqs = reqs.filter((r) => r.companyId === stakeholderId);
    if (status) reqs = reqs.filter((r) => r.status.toLowerCase().includes(status.toLowerCase()));

    const stakeholders = await ctx.db.query('stakeholders').collect();
    const stakeholderName = (id: Id<'stakeholders'>) => stakeholders.find((s) => s._id === id)?.companyName || '';

    const rows = [
      ['RequestID', 'Company', 'CreatedAt', 'Status', 'ReviewedBy', 'ReviewDate', 'RejectionReason', 'ApplicationType', 'ProjectName', 'ItemsCount', 'TotalQuantity'],
      ...reqs.map((r) => [
        r.requestId,
        stakeholderName(r.companyId),
        dayjs(r.createdAt).toISOString(),
        r.status,
        r.reviewedBy || '',
        r.reviewDate ? dayjs(r.reviewDate).toISOString() : '',
        r.rejectionReason || '',
        r.applicationType,
        r.projectName,
        String(r.productsRequested.length),
        String(r.productsRequested.reduce((s, p) => s + p.quantity, 0)),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const filename = `requests_export_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
    return { filename, csv } as const;
  },
});

export const listCustomers = query({
  args: {},
  handler: async (ctx) => {
    const stakeholders = await ctx.db.query('stakeholders').collect();
    const activeStakeholders = stakeholders.filter((s) => !s.deletedAt);
    const allRequests = await ctx.db.query('requests').collect();
    return activeStakeholders.map((s) => {
      const count = allRequests.filter((r) => !r.deletedAt && r.companyId === s._id).length;
      return { id: s._id, companyName: s.companyName, vipFlag: s.vipFlag, requestCount: count };
    });
  },
});

export const myHistory = query({
  args: { email: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { email, limit }) => {
    const cap = Math.min(limit ?? 300, 800);
    const reviewed = await ctx.db
      .query('requests')
      .withIndex('by_reviewedBy', (q) => q.eq('reviewedBy', email))
      .order('desc')
      .collect();
    const filtered = reviewed.filter((r) => !r.deletedAt && r.reviewDate).slice(0, cap);
    return filtered.map((r) => ({
      id: r._id,
      requestId: r.requestId,
      status: r.status,
      reviewDate: r.reviewDate,
      reviewDateFmt: r.reviewDate ? dayjs(r.reviewDate).format('YYYY-MM-DD HH:mm') : null,
    }));
  },
});
