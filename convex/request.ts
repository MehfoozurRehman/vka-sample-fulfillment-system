import { Doc, Id } from './_generated/dataModel';

import dayjs from 'dayjs';
import { mutation } from './_generated/server';
import { query } from './_generated/server';
import { v } from 'convex/values';

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

    return { ok: true } as const;
  },
});
