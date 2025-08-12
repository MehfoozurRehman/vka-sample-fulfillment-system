import { query } from './_generated/server';
import { v } from 'convex/values';

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const [users, stakeholders, products, requests, orders, auditLogs] = await Promise.all([
      ctx.db.query('users').collect(),
      ctx.db.query('stakeholders').collect(),
      ctx.db.query('products').collect(),
      ctx.db.query('requests').collect(),
      ctx.db.query('orders').collect(),
      ctx.db.query('auditLogs').collect(),
    ]);

    const activeUsers = users.filter((u) => !u.deletedAt && u.active).length;
    const totalUsers = users.filter((u) => !u.deletedAt).length;

    const totalStakeholders = stakeholders.filter((s) => !s.deletedAt).length;
    const vipStakeholders = stakeholders.filter((s) => !s.deletedAt && s.vipFlag).length;

    const totalProducts = products.filter((p) => !p.deletedAt).length;

    const totalRequests = requests.filter((r) => !r.deletedAt).length;
    const pendingRequests = requests.filter((r) => !r.deletedAt && r.status.toLowerCase().includes('pending')).length;

    const totalOrders = orders.filter((o) => !o.deletedAt).length;
    const openOrders = orders.filter((o) => !o.deletedAt && !['shipped', 'completed', 'closed'].includes(o.status.toLowerCase())).length;

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
      ctx.db.query('users').collect(),
      ctx.db.query('stakeholders').collect(),
      ctx.db.query('products').collect(),
      ctx.db.query('requests').collect(),
      ctx.db.query('orders').collect(),
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

    users.filter((u) => !u.deletedAt).forEach((u) => add(u.createdAt, 'users'));
    stakeholders.filter((s) => !s.deletedAt).forEach((s) => add(s.createdAt, 'stakeholders'));
    products.filter((p) => !p.deletedAt).forEach((p) => add(p.createdAt, 'products'));
    requests.filter((r) => !r.deletedAt).forEach((r) => add(r.createdAt, 'requests'));
    orders.filter((o) => !o.deletedAt).forEach((o) => add(o.createdAt, 'orders'));

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
        .filter((q) => q.neq(q.field('googleId'), undefined))
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

    const usersByRole = tally(users.filter((u) => !u.deletedAt).map((u) => u.role));
    const productsByCategory = tally(products.filter((p) => !p.deletedAt).map((p) => p.category));
    const requestsByStatus = tally(requests.filter((r) => !r.deletedAt).map((r) => r.status));
    const ordersByStatus = tally(orders.filter((o) => !o.deletedAt).map((o) => o.status));
    const stakeholdersVip = [
      { label: 'VIP', value: stakeholders.filter((s) => !s.deletedAt && s.vipFlag).length },
      { label: 'Standard', value: stakeholders.filter((s) => !s.deletedAt && !s.vipFlag).length },
    ];

    return { usersByRole, productsByCategory, requestsByStatus, ordersByStatus, stakeholdersVip } as const;
  },
});
