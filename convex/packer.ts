import { Doc, Id } from './_generated/dataModel';
import { mutation, query, type DatabaseReader, type DatabaseWriter } from './_generated/server';
import { v } from 'convex/values';
import dayjs from 'dayjs';
import { sendInternalNotifications } from '@/utils/sendInternalNotifications';
import { api } from './_generated/api';

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

async function assertPacker(ctx: { db: DatabaseReader | DatabaseWriter }, email: string): Promise<Doc<'users'>> {
  const user = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique();
  if (!user || user.deletedAt) throw new Error('User not found');
  const roles = user.roles || [];
  const activeRole = user.activeRole || roles[0];
  const effectiveRoles = roles.length ? roles : activeRole ? [activeRole] : [];
  if (!effectiveRoles.includes('packer')) throw new Error('Not authorized');
  return user;
}

export const queue = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_status', (q) => q.eq('status', 'Ready'))
      .order('asc')
      .collect();

    const requestIds = Array.from(new Set(orders.map((o) => o.requestId)));
    const requests = await Promise.all(requestIds.map((id) => ctx.db.get(id)));
    const requestMap = new Map(requests.filter(Boolean).map((r) => [r!._id, r!]));

    const stakeholderIds = Array.from(new Set(requests.filter(Boolean).map((r) => r!.companyId as Id<'stakeholders'>)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [s!._id, s!]));

    const now = Date.now();

    return orders
      .filter((o) => !o.deletedAt)
      .map((o) => {
        const req = requestMap.get(o.requestId);
        const stakeholder = req ? stakeholderMap.get(req.companyId as Id<'stakeholders'>) : undefined;
        const ageHours = req ? (now - req.createdAt) / (1000 * 60 * 60) : 0;
        const priority = stakeholder?.vipFlag ? 'High' : ageHours > 72 ? 'Medium' : 'Normal';
        return {
          id: o._id,
          orderId: o.orderId,
          requestId: req?.requestId || '—',
          company: stakeholder?.companyName || 'Unknown',
          contactName: req?.contactName || '',
          applicationType: req?.applicationType || '',
          products: req?.productsRequested?.length || 0,
          createdAt: dayjs(o.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          priority,
        } as const;
      });
  },
});

export const trend = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const range = days ?? 90;
    const start = Date.now() - range * 24 * 60 * 60 * 1000;
    const orders = await ctx.db.query('orders').withIndex('by_createdAt').order('desc').collect();
    const packed = orders.filter((o) => !o.deletedAt && o.packedDate && o.packedDate >= start);
    const byDate = new Map<string, number>();
    for (const o of packed) {
      const d = new Date(o.packedDate!).toISOString().slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + 1);
    }
    const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
    return dates.map((date) => ({ date, packed: byDate.get(date) ?? 0 }));
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query('orders').collect();
    const ready = orders.filter((o) => !o.deletedAt && o.status === 'Ready');
    const packed = orders.filter((o) => !o.deletedAt && (o.status === 'Packed' || o.packedDate));
    const todayKey = new Date().toISOString().slice(0, 10);
    let packedToday = 0;
    for (const o of packed) {
      if (o.packedDate && new Date(o.packedDate).toISOString().slice(0, 10) === todayKey) packedToday++;
    }
    return { ready: ready.length, totalPacked: packed.length, packedToday } as const;
  },
});

export const details = query({
  args: { id: v.id('orders') },
  handler: async (ctx, { id }) => {
    const order = await ctx.db.get(id);
    if (!order || order.deletedAt) return null;
    const req = await ctx.db.get(order.requestId);
    if (!req || req.deletedAt) return null;
    const stakeholder = await ctx.db.get(req.companyId as Id<'stakeholders'>);
    const products = await Promise.all(req.productsRequested.map(async (p) => ctx.db.get(p.productId)));
    return {
      order,
      request: req,
      stakeholder,
      products: products.filter(Boolean),
    } as const;
  },
});

export const markPacked = mutation({
  args: {
    id: v.id('orders'),
    packedBy: v.string(),
    lotNumbers: v.array(v.object({ productId: v.id('products'), lot: v.string() })),
    pickedCorrect: v.boolean(),
    coaIncluded: v.boolean(),
    sdsIncluded: v.boolean(),
    specsIncluded: v.boolean(),
    labelsApplied: v.boolean(),
    packingListIncluded: v.boolean(),
  },
  handler: async (ctx, { id, packedBy, lotNumbers, ...checks }) => {
    const user = await assertPacker(ctx, packedBy);
    const order = await ctx.db.get(id);
    if (!order || order.deletedAt) throw new Error('Order not found');
    if (order.status !== 'Ready') throw new Error('Order not in Ready state');
    const now = Date.now();
    const allTrue = Object.values(checks).every(Boolean);
    await ctx.db.patch(id, {
      status: 'Packed',
      packedBy,
      packedDate: now,
      lotNumbers: JSON.stringify(lotNumbers),
      documentsConfirmed: allTrue,
      ...checks,
      updatedAt: now,
    });
    await ctx.db.insert('auditLogs', {
      userId: user._id,
      action: 'packOrder',
      table: 'orders',
      recordId: String(id),
      changes: { status: 'Packed' },
      timestamp: now,
    });

    const allUsers = await ctx.db.query('users').collect();
    const shippers = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('shipper')) || u.activeRole === 'shipper')) as { _id: Id<'users'> }[];
    if (shippers.length) {
      await sendInternalNotifications(
        ctx,
        user._id,
        'order.packed',
        `Order ${order.orderId} is packed and ready to ship`,
        shippers.map((s) => s._id),
      );
    }

    // Email shippers + CC requester, sales rep
    try {
      const req = await ctx.db.get(order.requestId);
      if (req) {
        const stakeholder = await ctx.db.get(req.companyId as Id<'stakeholders'>);
        const shipperEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('shipper')) || u.activeRole === 'shipper')).map((u) => u.email);
        const requester = await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
          .unique();
        const to = uniqEmails(shipperEmails);
        const cc = uniqEmails([requester?.email, stakeholder?.salesRepEmail]);
        const subject = `VKA Order [${order.orderId}] Ready for Shipping`;
        const text = `Hello,

Order ${order.orderId} from request ${req.requestId} has been packed and is ready to ship.

Thank you,
VKA`;

        await ctx.runMutation(api.email.sendAndRecordEmail, {
          createdBy: user._id,
          type: 'order.packed.email',
          from: 'VKA <no-reply@vkaff.com>',
          to,
          cc,
          subject,
          text,
          related: { orderId: id, requestId: order.requestId, stakeholderId: req.companyId },
        });
      }
    } catch {}

    return { ok: true } as const;
  },
});

export const myHistory = query({
  args: { email: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { email, limit }) => {
    const cap = Math.min(limit ?? 200, 500);
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_packedBy', (q) => q.eq('packedBy', email))
      .order('desc')
      .collect();
    const trimmed = orders.filter((o) => !o.deletedAt && o.packedDate).slice(0, cap);
    const reqs = await Promise.all(trimmed.map((o) => ctx.db.get(o.requestId)));
    return trimmed.map((o, i) => ({
      id: o._id,
      orderId: o.orderId,
      packedDate: o.packedDate,
      shippedDate: o.shippedDate,
      status: o.status,
      requestId: reqs[i]?.requestId,
    }));
  },
});
