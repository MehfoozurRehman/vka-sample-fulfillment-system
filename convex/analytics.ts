import { query } from './_generated/server';
import { v } from 'convex/values';

function isActive<T extends { deletedAt?: number | undefined }>(d: T) {
  return !d.deletedAt;
}

export const overview = query({
  args: { rangeDays: v.optional(v.number()) },
  handler: async (ctx, { rangeDays }) => {
    const days = rangeDays ?? 30;
    const startTs = Date.now() - days * 24 * 60 * 60 * 1000;

    const [users, stakeholders, products, requests, orders, auditLogs] = await Promise.all([
      ctx.db
        .query('users')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('stakeholders')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('products')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('requests')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('orders')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('auditLogs')
        .withIndex('by_timestamp', (q) => q.gte('timestamp', startTs))
        .collect(),
    ]);

    const activeUsersArr = users.filter(isActive);
    const activeStakeholdersArr = stakeholders.filter(isActive);
    const activeProductsArr = products.filter(isActive);
    const activeRequestsArr = requests.filter(isActive);
    const activeOrdersArr = orders.filter(isActive);

    const activeUsers = activeUsersArr.filter((u) => u.active).length;
    const totalUsers = activeUsersArr.length;

    const totalStakeholders = activeStakeholdersArr.length;
    const vipStakeholders = activeStakeholdersArr.filter((s) => s.vipFlag).length;

    const totalProducts = activeProductsArr.length;

    const totalRequests = activeRequestsArr.length;
    const pendingRequests = activeRequestsArr.filter((r) => r.status.toLowerCase().includes('pending')).length;

    const totalOrders = activeOrdersArr.length;
    const openOrders = activeOrdersArr.filter((o) => !['shipped', 'completed', 'closed'].includes(o.status.toLowerCase())).length;

    const totalAuditLogs = auditLogs.length;

    return {
      totalUsers,
      activeUsers,
      totalStakeholders,
      vipStakeholders,
      totalProducts,
      totalRequests,
      pendingRequests,
      totalOrders,
      openOrders,
      totalAuditLogs,
      windowDays: days,
    } as const;
  },
});

export const timeseries = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const rangeDays = days ?? 90;
    const startTs = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
    const dateKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

    const [users, stakeholders, products, requests, orders] = await Promise.all([
      ctx.db
        .query('users')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('stakeholders')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('products')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('requests')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
      ctx.db
        .query('orders')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', startTs))
        .collect(),
    ]);

    const map: Record<string, { date: string; users: number; stakeholders: number; products: number; requests: number; orders: number }> = {};

    function add(ts: number, field: keyof Omit<(typeof map)[string], 'date'>) {
      if (ts < startTs) return;
      const key = dateKey(ts);
      if (!map[key]) {
        map[key] = { date: key, users: 0, stakeholders: 0, products: 0, requests: 0, orders: 0 };
      }
      map[key][field] += 1;
    }

    users.filter(isActive).forEach((u) => add(u.createdAt, 'users'));
    stakeholders.filter(isActive).forEach((s) => add(s.createdAt, 'stakeholders'));
    products.filter(isActive).forEach((p) => add(p.createdAt, 'products'));
    requests.filter(isActive).forEach((r) => add(r.createdAt, 'requests'));
    orders.filter(isActive).forEach((o) => add(o.createdAt, 'orders'));

    const data = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    return { rangeDays, data } as const;
  },
});

export const distributions = query({
  args: {},
  handler: async (ctx) => {
    const [users, products, requests, orders, stakeholders] = await Promise.all([
      ctx.db
        .query('users')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', Date.now() - 180 * 24 * 60 * 60 * 1000))
        .collect(),
      ctx.db.query('products').collect(),
      ctx.db.query('requests').collect(),
      ctx.db.query('orders').collect(),
      ctx.db.query('stakeholders').collect(),
    ]);

    function tally<T extends string | number>(items: T[]) {
      return Object.entries(
        items.reduce<Record<string, number>>((acc, cur) => {
          acc[String(cur)] = (acc[String(cur)] || 0) + 1;
          return acc;
        }, {}),
      )
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    }

    const usersByRole = tally(users.filter(isActive).map((u) => u.role));
    const productsByCategory = tally(products.filter(isActive).map((p) => p.category));
    const requestsByStatus = tally(requests.filter(isActive).map((r) => r.status));
    const ordersByStatus = tally(orders.filter(isActive).map((o) => o.status));
    const stakeholdersVip = [
      { label: 'VIP', value: stakeholders.filter((s) => isActive(s) && s.vipFlag).length },
      { label: 'Standard', value: stakeholders.filter((s) => isActive(s) && !s.vipFlag).length },
    ];

    return { usersByRole, productsByCategory, requestsByStatus, ordersByStatus, stakeholdersVip } as const;
  },
});
