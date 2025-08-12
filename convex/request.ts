import { Doc, Id } from './_generated/dataModel';

import dayjs from 'dayjs';
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
