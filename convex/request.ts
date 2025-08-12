import { Doc, Id } from './_generated/dataModel';

import dayjs from 'dayjs';
import { mutation } from './_generated/server';
import { query } from './_generated/server';
import { v } from 'convex/values';

type ReqDoc = Doc<'requests'>;
type OrderDoc = Doc<'orders'>;
type StakeholderDoc = Doc<'stakeholders'>;
type UserDoc = Doc<'users'>;

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 10, 50);

    const requests = (await ctx.db.query('requests').collect())
      .filter((r) => !r.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, max) as ReqDoc[];

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
    const items = await ctx.db
      .query('requests')
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .collect();
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
    // Autonumber if blank or AUTO
    let requestId = (args.requestId || '').trim();
    if (!requestId || requestId.toUpperCase() === 'AUTO') {
      const all = await ctx.db
        .query('requests')
        .filter((q) => q.eq(q.field('deletedAt'), undefined))
        .collect();
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

    const duplicate = await ctx.db
      .query('requests')
      .filter((q) => q.eq(q.field('requestId'), requestId))
      .first();
    if (duplicate) throw new Error('Request with this ID already exists');

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
      createdAt: now,
      updatedAt: now,
    });

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), args.requestedBy))
      .first();

    if (!user) throw new Error('User not found for requestedBy email');

    await ctx.db.insert('auditLogs', {
      userId: user._id,
      action: 'addRequest',
      table: 'requests',
      recordId: id,
      changes: { requestId },
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
