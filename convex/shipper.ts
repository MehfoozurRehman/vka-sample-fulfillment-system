import { Doc, Id } from './_generated/dataModel';
import { mutation, query, type DatabaseReader, type DatabaseWriter } from './_generated/server';
import { v } from 'convex/values';
import dayjs from 'dayjs';
import { sendInternalNotifications } from '@/utils/sendInternalNotifications';
import { api } from './_generated/api';
import { renderRequestSubmittedHtml } from '../emails/RequestSubmitted';

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

function isInternational(country?: string | null) {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return !['us', 'usa', 'u.s.a', 'united states', 'united states of america', 'america'].includes(c);
}

async function assertShipper(ctx: { db: DatabaseReader | DatabaseWriter }, email: string): Promise<Doc<'users'>> {
  const user = await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .unique();
  if (!user || user.deletedAt) throw new Error('User not found');
  const roles = user.roles || [];
  const activeRole = user.activeRole || roles[0];
  const effective = roles.length ? roles : activeRole ? [activeRole] : [];
  if (!effective.includes('shipper')) throw new Error('Not authorized');
  return user;
}

export const queue = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_status', (q) => q.eq('status', 'Packed'))
      .order('asc')
      .collect();

    const requestIds = Array.from(new Set(orders.map((o) => o.requestId)));
    const requests = await Promise.all(requestIds.map((id) => ctx.db.get(id)));
    const requestMap = new Map(requests.filter(Boolean).map((r) => [r!._id, r!]));
    const stakeholderIds = Array.from(new Set(requests.filter(Boolean).map((r) => r!.companyId as Id<'stakeholders'>)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [s!._id, s!]));

    return orders
      .filter((o) => !o.deletedAt)
      .map((o) => {
        const req = requestMap.get(o.requestId);
        const stakeholder = req ? stakeholderMap.get(req.companyId as Id<'stakeholders'>) : undefined;
        return {
          id: o._id,
          orderId: o.orderId,
          requestId: req?.requestId || '—',
          company: stakeholder?.companyName || 'Unknown',
          contactName: req?.contactName || '',
          country: req?.country || '',
          products: req?.productsRequested?.length || 0,
          packedAt: o.packedDate ? dayjs(o.packedDate).format('YYYY-MM-DD HH:mm:ss') : '',
        } as const;
      });
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query('orders').collect();
    const packed = orders.filter((o) => !o.deletedAt && o.status === 'Packed');
    const shipped = orders.filter((o) => !o.deletedAt && (o.status === 'Shipped' || o.shippedDate));
    const todayKey = new Date().toISOString().slice(0, 10);
    let shippedToday = 0;
    for (const o of shipped) {
      if (o.shippedDate && new Date(o.shippedDate).toISOString().slice(0, 10) === todayKey) shippedToday++;
    }
    return { queued: packed.length, totalShipped: shipped.length, shippedToday } as const;
  },
});

export const trend = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const range = days ?? 90;
    const start = Date.now() - range * 24 * 60 * 60 * 1000;
    const orders = await ctx.db.query('orders').withIndex('by_createdAt').order('desc').collect();
    const shipped = orders.filter((o) => !o.deletedAt && o.shippedDate && o.shippedDate >= start);
    const byDate = new Map<string, number>();
    for (const o of shipped) {
      const d = new Date(o.shippedDate!).toISOString().slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + 1);
    }
    const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
    return dates.map((date) => ({ date, shipped: byDate.get(date) ?? 0 }));
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
    return { order, request: req, stakeholder } as const;
  },
});

export const markShipped = mutation({
  args: {
    id: v.id('orders'),
    shippedBy: v.string(),
    packageCount: v.number(),
    totalWeight: v.number(),
    carrier: v.string(),
    serviceLevel: v.string(),
    trackingNumber: v.string(),
    internationalDocsIncluded: v.boolean(),
    shippingLabelAttached: v.boolean(),
    notifyCustomer: v.boolean(),
  },
  handler: async (ctx, { id, shippedBy, internationalDocsIncluded, notifyCustomer, ...rest }) => {
    const user = await assertShipper(ctx, shippedBy);
    const order = await ctx.db.get(id);
    if (!order || order.deletedAt) throw new Error('Order not found');
    if (order.status !== 'Packed') throw new Error('Order not in Packed state');
    if (!rest.trackingNumber.trim()) throw new Error('Tracking required');
    const now = Date.now();
    await ctx.db.patch(id, {
      status: 'Shipped',
      shippedBy,
      shippedDate: now,
      internationalDocsIncluded,
      carrier: rest.carrier,
      serviceLevel: rest.serviceLevel,
      trackingNumber: rest.trackingNumber,
      packageCount: rest.packageCount,
      totalWeight: rest.totalWeight,
      shippedEmailSent: notifyCustomer,
      updatedAt: now,
    });

    await ctx.db.insert('auditLogs', {
      userId: user._id,
      action: 'shipOrder',
      table: 'orders',
      recordId: String(id),
      changes: { status: 'Shipped' },
      timestamp: now,
    });

    const req = await ctx.db.get(order.requestId);
    if (req) {
      const stakeholder = await ctx.db.get(req.companyId as Id<'stakeholders'>);
      const recipients: Id<'users'>[] = [];
      const addRecipient = async (email: string | undefined) => {
        if (!email) return;
        const u = await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', email))
          .unique();
        if (u && !u.deletedAt) recipients.push(u._id);
      };
      await addRecipient(req.requestedBy);
      await addRecipient(stakeholder?.salesRepEmail);
      await addRecipient(stakeholder?.accountManagerEmail);
      await addRecipient(stakeholder?.complianceOfficerEmail);
      const distinct = Array.from(new Set(recipients));
      if (distinct.length) {
        await sendInternalNotifications(ctx, user._id, 'order.shipped', `Order ${order.orderId} shipped via ${rest.carrier} (${rest.trackingNumber})`, distinct);
      }

      if (notifyCustomer) {
        try {
          const allUsers = await ctx.db.query('users').collect();
          const adminEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin')).map((u) => u.email);

          const to = uniqEmails([req.email]);
          const cc = uniqEmails([
            req.requestedBy,
            stakeholder?.salesRepEmail,
            stakeholder?.accountManagerEmail,
            ...(isInternational(req.country) ? [stakeholder?.complianceOfficerEmail] : []),
            ...(stakeholder?.vipFlag ? adminEmails : []),
          ]);
          const subject = `VKA Samples Shipped - Tracking: ${rest.trackingNumber}`;
          const text = `Hello,\n\nYour samples have shipped for request ${req.requestId}.\nCarrier: ${rest.carrier}\nTracking: ${rest.trackingNumber}\n\nThank you,\nVKA`;
          const html = await renderRequestSubmittedHtml({
            requestId: req.requestId,
            companyName: stakeholder?.companyName,
          });

          await ctx.runMutation(api.email.sendAndRecordEmail, {
            createdBy: user._id,
            type: 'order.shipped.email',
            from: 'VKA <no-reply@vkaff.com>',
            to,
            cc,
            subject,
            text,
            html,
            related: { orderId: id, requestId: order.requestId, stakeholderId: req.companyId },
          });
        } catch {}
      }
    }
    return { ok: true } as const;
  },
});

export const myHistory = query({
  args: { email: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { email, limit }) => {
    const cap = Math.min(limit ?? 200, 500);
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_shippedBy', (q) => q.eq('shippedBy', email))
      .order('desc')
      .collect();
    const trimmed = orders.filter((o) => !o.deletedAt && o.shippedDate).slice(0, cap);
    const reqs = await Promise.all(trimmed.map((o) => ctx.db.get(o.requestId)));
    return trimmed.map((o, i) => ({
      id: o._id,
      orderId: o.orderId,
      shippedDate: o.shippedDate,
      packedDate: o.packedDate,
      status: o.status,
      requestId: reqs[i]?.requestId,
    }));
  },
});
