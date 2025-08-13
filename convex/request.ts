import { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

import { api } from './_generated/api';
import dayjs from 'dayjs';
import { renderRequestSubmittedHtml } from '../emails/RequestSubmitted';
import { sendInternalNotifications } from '@/utils/sendInternalNotifications';
import { v } from 'convex/values';

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

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type ReqDoc = Doc<'requests'>;
type OrderDoc = Doc<'orders'>;
type StakeholderDoc = Doc<'stakeholders'>;
type UserDoc = Doc<'users'>;

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 10, 50);

    const requests = (await ctx.db.query('requests').withIndex('by_createdAt').order('desc').collect()).filter((r) => !r.deletedAt).slice(0, max) as ReqDoc[];

    const stakeholderIds = Array.from(new Set(requests.map((r) => r.companyId as Id<'stakeholders'>)));

    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));

    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [s!._id, s! as StakeholderDoc]));

    const orderByRequestId = new Map<Id<'requests'>, OrderDoc>();

    for (const r of requests) {
      const order = (await ctx.db
        .query('orders')
        .withIndex('by_requestId', (q) => q.eq('requestId', r._id))
        .first()) as OrderDoc | null;
      if (order) orderByRequestId.set(r._id, order);
    }

    const users = (await ctx.db.query('users').collect()) as UserDoc[];

    const userByEmail = new Map(users.map((u) => [u.email, u]));

    function deriveStage(r: ReqDoc, order: OrderDoc | undefined): string {
      if (order) {
        const status = (order.status || '').toLowerCase();
        if (status.includes('ship') || status.includes('complete') || order.shippedDate) return 'Shipped';
        if (status.includes('pack') || order.packedDate) return 'Packed';
        return 'Order Processing';
      }
      if (r.reviewedBy) return 'Reviewed';
      return 'Submitted';
    }

    function assignedTo(r: ReqDoc, order: OrderDoc | undefined): string | null {
      const email = order?.shippedBy || order?.packedBy || r.reviewedBy || r.requestedBy || null;
      if (!email) return null;
      const u = userByEmail.get(email);
      return u?.name ? `${u.name} (${email})` : email;
    }

    return requests.map((r) => {
      const order = orderByRequestId.get(r._id);
      const stage = deriveStage(r, order);
      const assignee = assignedTo(r, order);
      const stakeholder = stakeholderMap.get(r.companyId as Id<'stakeholders'>);
      return {
        id: r._id,
        requestId: r.requestId,
        company: stakeholder?.companyName || 'Unknown',
        contactName: r.contactName,
        applicationType: r.applicationType,
        products: r.productsRequested?.length || 0,
        status: r.status,
        stage,
        assignedTo: assignee,
        createdAt: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      } as const;
    });
  },
});

export const nextId = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query('requests').collect();
    const prefix = 'REQ-';
    const width = 5;
    let maxNum = 0;
    for (const r of items) {
      const m = /^REQ-(\d{5})$/.exec(r.requestId || '');
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    const next = maxNum + 1;
    const padded = String(next).padStart(width, '0');
    return `${prefix}${padded}`;
  },
});

export const add = mutation({
  args: {
    userId: v.id('users'),
    requestId: v.string(),
    companyId: v.id('stakeholders'),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    applicationType: v.string(),
    projectName: v.string(),
    productsRequested: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
    requestedBy: v.string(),
  },
  handler: async (ctx, args) => {
    let requestId = (args.requestId || '').trim();
    if (!requestId || requestId.toUpperCase() === 'AUTO') {
      const all = await ctx.db.query('requests').collect();
      const prefix = 'REQ-';
      const width = 5;
      let maxNum = 0;
      for (const r of all) {
        const m = /^REQ-(\d{5})$/.exec(r.requestId || '');
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      const next = maxNum + 1;
      const padded = String(next).padStart(width, '0');
      requestId = `${prefix}${padded}`;
    }

    const duplicateId = await ctx.db
      .query('requests')
      .withIndex('by_requestId', (q) => q.eq('requestId', requestId))
      .unique();
    if (duplicateId) throw new Error('Request with this ID already exists');

    const dayKey = dayjs().format('YYYYMMDD');
    const sortedProductIds = [...args.productsRequested.map((p) => String(p.productId))].sort();
    const raw = `${args.companyId}|${sortedProductIds.join(',')}|${dayKey}`;
    const duplicateHash = await sha256Hex(raw);

    const existingSameDay = await ctx.db
      .query('requests')
      .withIndex('by_duplicateHash', (q) => q.eq('duplicateHash', duplicateHash))
      .first();
    if (existingSameDay && !existingSameDay.deletedAt) {
      throw new Error('Duplicate request (same company & products already submitted today)');
    }

    const now = Date.now();
    const id = await ctx.db.insert('requests', {
      requestId,
      timestamp: now,
      companyId: args.companyId,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      country: args.country,
      applicationType: args.applicationType,
      projectName: args.projectName,
      productsRequested: args.productsRequested,
      status: 'Pending Review',
      requestedBy: args.requestedBy,
      duplicateHash,
      createdAt: now,
      updatedAt: now,
    });

    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.requestedBy))
      .unique();

    if (!user) throw new Error('User not found for requestedBy email');

    await ctx.db.insert('auditLogs', {
      userId: user._id,
      action: 'addRequest',
      table: 'requests',
      recordId: id,
      changes: { requestId, duplicateHash },
      timestamp: now,
    });

    const allUsers = await ctx.db.query('users').collect();
    const screenerUsers = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')) as { _id: Id<'users'> }[];
    if (screenerUsers.length) {
      await sendInternalNotifications(
        ctx,
        user._id,
        'request.created',
        `New request ${requestId} submitted by ${user.name || user.email}`,
        screenerUsers.map((u) => u._id),
      );
    }

    try {
      const stakeholder = await ctx.db.get(args.companyId);
      const screenerEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')).map((u) => u.email);
      const adminEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin')).map((u) => u.email);

      const to = uniqEmails([args.email]);
      const cc = uniqEmails([user.email, stakeholder?.salesRepEmail, ...screenerEmails, ...(stakeholder?.vipFlag ? adminEmails : [])]);

      const subject = `VKA Sample Request [${requestId}] Received`;
      const text = `Hello,

We have received your sample request ${requestId} for ${stakeholder?.companyName ?? 'your company'}.

Products:
${args.productsRequested.map((p) => `- ${String(p.productId)} x ${p.quantity}${p.notes ? ` (${p.notes})` : ''}`).join('\n')}

We will notify you once it is reviewed.

Thank you,
VKA`;
      const html = await renderRequestSubmittedHtml({
        requestId,
        companyName: stakeholder?.companyName,
        products: await Promise.all(
          args.productsRequested.map(async (p) => {
            const prod = await ctx.db.get(p.productId);
            return { name: prod?.productName || String(p.productId), quantity: p.quantity, notes: p.notes };
          }),
        ),
      });

      await ctx.runMutation(api.email.sendAndRecordEmail, {
        createdBy: user._id,
        type: 'request.submitted.email',
        from: 'VKA <no-reply@vkaff.com>',
        to,
        cc,
        subject,
        text,
        html,
        related: { requestId: id, stakeholderId: args.companyId },
      });
    } catch {}

    return { id, requestId } as const;
  },
});

export const suggestions = query({
  args: {},
  handler: async (ctx) => {
    const reqs = await ctx.db.query('requests').collect();

    const applicationTypes = Array.from(new Set(reqs.filter((r) => !r.deletedAt && typeof r.applicationType === 'string' && r.applicationType.trim()).map((r) => r.applicationType.trim()))).sort(
      (a, b) => a.localeCompare(b),
    );

    const projectNames = Array.from(new Set(reqs.filter((r) => !r.deletedAt && typeof r.projectName === 'string' && r.projectName.trim()).map((r) => r.projectName.trim()))).sort((a, b) =>
      a.localeCompare(b),
    );

    return { applicationTypes, projectNames } as const;
  },
});

export const update = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('requests'),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    applicationType: v.string(),
    projectName: v.string(),
    productsRequested: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { id, ...rest }) => {
    const req = await ctx.db.get(id);

    if (!req || req.deletedAt) throw new Error('Request not found');

    if (req.reviewedBy) throw new Error('Cannot edit a reviewed request');

    const existingOrder = await ctx.db
      .query('orders')
      .withIndex('by_requestId', (q) => q.eq('requestId', id))
      .first();

    if (existingOrder) throw new Error('Cannot edit once order exists');

    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });

    const actorUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
      .unique();

    if (!actorUser) throw new Error('No actor user found');

    await ctx.db.insert('auditLogs', {
      userId: actorUser._id,
      action: 'updateRequest',
      table: 'requests',
      recordId: id,
      changes: rest,
      timestamp: Date.now(),
    });

    if (req.status.toLowerCase().includes('pending')) {
      const allUsers = await ctx.db.query('users').collect();
      const screeners = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')) as { _id: Id<'users'> }[];
      if (screeners.length) {
        await sendInternalNotifications(
          ctx,
          actorUser._id,
          'request.updated',
          `Request ${req.requestId} updated by ${actorUser.name || actorUser.email}`,
          screeners.map((s) => s._id),
        );
      }
    }
    return { ok: true } as const;
  },
});

export const getOne = query({
  args: { id: v.id('requests') },
  handler: async (ctx, { id }) => {
    const r = await ctx.db.get(id);
    if (!r || r.deletedAt) return null;
    return r;
  },
});

export const remove = mutation({
  args: { userId: v.id('users'), id: v.id('requests') },
  handler: async (ctx, { id }) => {
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (req.reviewedBy) throw new Error('Cannot delete a reviewed request');

    const existingOrder = await ctx.db
      .query('orders')
      .withIndex('by_requestId', (q) => q.eq('requestId', id))
      .first();
    if (existingOrder) throw new Error('Cannot delete once order exists');

    const now = Date.now();
    await ctx.db.patch(id, { deletedAt: now });

    const actorUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
      .unique();
    if (!actorUser) throw new Error('No actor user found');

    await ctx.db.insert('auditLogs', {
      userId: actorUser._id,
      action: 'deleteRequest',
      table: 'requests',
      recordId: id,
      changes: { deletedAt: now },
      timestamp: now,
    });

    if (req.status.toLowerCase().includes('pending')) {
      const allUsers = await ctx.db.query('users').collect();
      const screeners = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')) as { _id: Id<'users'> }[];
      if (screeners.length) {
        await sendInternalNotifications(
          ctx,
          actorUser._id,
          'request.deleted',
          `Request ${req.requestId} deleted by ${actorUser.name || actorUser.email}`,
          screeners.map((s) => s._id),
        );
      }
    }
    return { ok: true } as const;
  },
});

export const orderSummary = query({
  args: { requestId: v.id('requests') },
  handler: async (ctx, { requestId }) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_requestId', (q) => q.eq('requestId', requestId))
      .first();
    if (!order || order.deletedAt) return null;
    return {
      id: order._id,
      orderId: order.orderId,
      status: order.status,
      packedDate: order.packedDate,
      shippedDate: order.shippedDate,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      updatedAt: order.updatedAt,
    } as const;
  },
});

export const my = query({
  args: { email: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { email, limit }) => {
    const cap = Math.min(limit ?? 200, 500);
    const items = await ctx.db
      .query('requests')
      .withIndex('by_requestedBy', (q) => q.eq('requestedBy', email))
      .order('desc')
      .collect();
    const trimmed = items.filter((r) => !r.deletedAt).slice(0, cap) as ReqDoc[];

    const orders = await Promise.all(
      trimmed.map((r) =>
        ctx.db
          .query('orders')
          .withIndex('by_requestId', (q) => q.eq('requestId', r._id))
          .first(),
      ),
    );
    const orderByRequestId = new Map<Id<'requests'>, OrderDoc>();
    trimmed.forEach((r, i) => {
      const o = orders[i] as OrderDoc | null;
      if (o) orderByRequestId.set(r._id, o);
    });

    const stakeholderIds = Array.from(new Set(trimmed.map((r) => r.companyId as Id<'stakeholders'>)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [s!._id, s! as StakeholderDoc]));

    const users = (await ctx.db.query('users').collect()) as UserDoc[];
    const userByEmail = new Map(users.map((u) => [u.email, u]));

    function deriveStage(r: ReqDoc, order: OrderDoc | undefined): string {
      if (order) {
        const status = (order.status || '').toLowerCase();
        if (status.includes('ship') || status.includes('complete') || order.shippedDate) return 'Shipped';
        if (status.includes('pack') || order.packedDate) return 'Packed';
        return 'Order Processing';
      }
      if (r.reviewedBy) return 'Reviewed';
      return 'Submitted';
    }

    function assignedTo(r: ReqDoc, order: OrderDoc | undefined): string | null {
      const email = order?.shippedBy || order?.packedBy || r.reviewedBy || r.requestedBy || null;
      if (!email) return null;
      const u = userByEmail.get(email);
      return u?.name ? `${u.name} (${email})` : email;
    }

    return trimmed.map((r) => {
      const order = orderByRequestId.get(r._id);
      const stage = deriveStage(r, order);
      const assignee = assignedTo(r, order);
      const stakeholder = stakeholderMap.get(r.companyId as Id<'stakeholders'>);
      return {
        id: r._id,
        requestId: r.requestId,
        company: stakeholder?.companyName || 'Unknown',
        contactName: r.contactName,
        applicationType: r.applicationType,
        products: r.productsRequested?.length || 0,
        status: r.status,
        stage,
        assignedTo: assignee,
        createdAt: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      } as const;
    });
  },
});

export const myHistory = query({
  args: { email: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { email, limit }) => {
    const cap = Math.min(limit ?? 500, 1000);
    const reqs = await ctx.db
      .query('requests')
      .withIndex('by_requestedBy', (q) => q.eq('requestedBy', email))
      .order('desc')
      .collect();
    const relevant = reqs.filter((r) => !r.deletedAt).slice(0, cap) as ReqDoc[];

    const requestIds = relevant.map((r) => r._id as Id<'requests'>);

    const ordersByReqId: Record<string, OrderDoc> = {};
    for (const id of requestIds) {
      const o = (await ctx.db
        .query('orders')
        .withIndex('by_requestId', (q) => q.eq('requestId', id))
        .first()) as OrderDoc | null;
      if (o && !o.deletedAt) ordersByReqId[String(id)] = o;
    }

    const stakeholderIds = Array.from(new Set(relevant.map((r) => r.companyId as Id<'stakeholders'>)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [s!._id, s! as StakeholderDoc]));

    function deriveStage(r: ReqDoc, order: OrderDoc | undefined): string {
      if (order) {
        const status = (order.status || '').toLowerCase();
        if (status.includes('ship') || status.includes('complete') || order.shippedDate) return 'Shipped';
        if (status.includes('pack') || order.packedDate) return 'Packed';
        return 'Order Processing';
      }
      if (r.reviewedBy) return 'Reviewed';
      return 'Submitted';
    }

    return relevant.map((r) => {
      const o = ordersByReqId[String(r._id)];
      const stage = deriveStage(r, o);
      const stakeholder = stakeholderMap.get(r.companyId as Id<'stakeholders'>);
      return {
        requestId: r.requestId,
        status: r.status,
        createdAt: r.createdAt,
        reviewDate: r.reviewDate,
        packedDate: o?.packedDate,
        shippedDate: o?.shippedDate,
        id: r._id,
        company: stakeholder?.companyName || 'Unknown',
        stage,
      } as const;
    });
  },
});

export const timeline = query({
  args: { id: v.id('requests') },
  handler: async (ctx, { id }) => {
    const req = await ctx.db.get(id);
    if (!req) return [];
    const order = await ctx.db
      .query('orders')
      .withIndex('by_requestId', (q) => q.eq('requestId', id))
      .first();

    const events: Array<{ ts: number; type: string; actor?: string; details?: unknown }> = [];

    events.push({ ts: req.createdAt, type: 'request.created', actor: req.requestedBy, details: { requestId: req.requestId } });
    if (req.infoRequestedAt) events.push({ ts: req.infoRequestedAt, type: 'request.infoRequested', actor: req.infoRequestedBy, details: { message: req.infoRequestMessage } });
    if (req.infoResponseAt) events.push({ ts: req.infoResponseAt, type: 'request.infoResponded', actor: req.requestedBy, details: { message: req.infoResponseMessage } });
    if (req.reviewDate) {
      const typ = req.status.toLowerCase() === 'approved' ? 'request.approved' : req.status.toLowerCase() === 'rejected' ? 'request.rejected' : 'request.reviewed';
      events.push({ ts: req.reviewDate, type: typ, actor: req.reviewedBy, details: { rejectionReason: req.rejectionReason } });
    }
    if (order) {
      if (order.packedDate) events.push({ ts: order.packedDate, type: 'order.packed', actor: order.packedBy, details: { orderId: order.orderId } });
      if (order.shippedDate) events.push({ ts: order.shippedDate, type: 'order.shipped', actor: order.shippedBy, details: { carrier: order.carrier, trackingNumber: order.trackingNumber } });
    }

    const audits = await ctx.db
      .query('auditLogs')
      .withIndex('by_table', (q) => q.eq('table', 'requests'))
      .collect();
    const auditsOrders = await ctx.db
      .query('auditLogs')
      .withIndex('by_table', (q) => q.eq('table', 'orders'))
      .collect();
    const allAudit = [...audits, ...auditsOrders].filter((a) => a.recordId === String(id) || a.changes?.requestId === id);

    const userIds = Array.from(new Set(allAudit.map((a) => a.userId))).filter(Boolean) as Id<'users'>[];
    const users = await Promise.all(userIds.map((uid) => ctx.db.get(uid)));
    const userDisplayById = new Map<string, string>();
    users.forEach((u, i) => {
      if (!u) return;
      const key = String(userIds[i]);
      userDisplayById.set(key, u.email);
    });

    for (const a of allAudit) {
      const actorReadable = userDisplayById.get(String(a.userId)) || String(a.userId);
      events.push({ ts: a.timestamp, type: `audit.${a.action}`, actor: actorReadable, details: a.changes });
    }

    events.sort((a, b) => a.ts - b.ts);
    return events;
  },
});
