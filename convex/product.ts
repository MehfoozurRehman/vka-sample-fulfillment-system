import { mutation, query } from './_generated/server';

import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query('products')
      .withIndex('by_createdAt')
      .order('desc')
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .collect();

    return items.map((p) => ({
      id: p._id,
      productId: p.productId,
      productName: p.productName,
      category: p.category,
      location: p.location,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

export const nextId = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query('products').collect();

    const prefix = 'FLV-';
    const width = 5;
    let maxNum = 0;
    for (const p of items) {
      const m = /^FLV-(\d{5})$/.exec(p.productId || '');
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

export const stats = query({
  args: { productId: v.id('products'), rangeDays: v.optional(v.number()) },
  handler: async (ctx, { productId, rangeDays }) => {
    const now = Date.now();
    const days = rangeDays ?? 90;
    const startTs = now - days * 24 * 60 * 60 * 1000;
    const fmt = (ts: number) => new Date(ts).toISOString().slice(0, 10);

    const requestedByDate = new Map<string, number>();
    const ordersByDate = new Map<string, number>();
    const shippedByDate = new Map<string, number>();

    const requests = await ctx.db
      .query('requests')
      .withIndex('by_createdAt')
      .order('desc')
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .collect();

    const relevantRequests = requests.filter((r) => r.createdAt >= startTs && r.productsRequested?.some((pr) => pr.productId === productId));

    const relevantRequestIds = new Set(relevantRequests.map((r) => r._id));

    for (const r of relevantRequests) {
      const date = fmt(r.createdAt);
      const qty = r.productsRequested.filter((pr) => pr.productId === productId).reduce((sum, pr) => sum + (pr.quantity ?? 0), 0);
      requestedByDate.set(date, (requestedByDate.get(date) ?? 0) + qty);
    }

    const orders = await ctx.db
      .query('orders')
      .withIndex('by_createdAt')
      .order('desc')
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .collect();

    for (const o of orders) {
      if (!relevantRequestIds.has(o.requestId)) continue;
      if (o.createdAt >= startTs) {
        const d = fmt(o.createdAt);
        ordersByDate.set(d, (ordersByDate.get(d) ?? 0) + 1);
      }
      if (o.shippedDate && o.shippedDate >= startTs) {
        const d2 = fmt(o.shippedDate);
        shippedByDate.set(d2, (shippedByDate.get(d2) ?? 0) + 1);
      }
    }

    const allDates = new Set<string>([...requestedByDate.keys(), ...ordersByDate.keys(), ...shippedByDate.keys()]);
    const sorted = Array.from(allDates).sort((a, b) => a.localeCompare(b));
    const data = sorted.map((date) => ({
      date,
      requested: requestedByDate.get(date) ?? 0,
      ordered: ordersByDate.get(date) ?? 0,
      shipped: shippedByDate.get(date) ?? 0,
    }));

    return { data };
  },
});

export const add = mutation({
  args: {
    userId: v.id('users'),
    productId: v.string(),
    productName: v.string(),
    category: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    let productId = (args.productId || '').trim();

    if (!productId || productId.toUpperCase() === 'AUTO') {
      const items = await ctx.db.query('products').collect();
      const prefix = 'FLV-';
      const width = 5;
      let maxNum = 0;
      for (const p of items) {
        const m = /^FLV-(\d{5})$/.exec(p.productId || '');
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      const next = maxNum + 1;
      const padded = String(next).padStart(width, '0');
      productId = `${prefix}${padded}`;
    }

    const duplicate = await ctx.db
      .query('products')
      .withIndex('by_productId', (q) => q.eq('productId', productId))
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .unique();
    if (duplicate) throw new Error('Product with this productId already exists');

    const now = Date.now();
    const id = await ctx.db.insert('products', { productId, productName: args.productName, category: args.category, location: args.location, createdAt: now, updatedAt: now });

    await ctx.db.insert('auditLogs', {
      userId: args.userId,
      action: 'addProduct',
      table: 'products',
      recordId: id,
      changes: { productId, productName: args.productName, category: args.category, location: args.location },
      timestamp: now,
    });

    const adminUsers = await ctx.db.query('users').collect();
    for (const u of adminUsers) {
      if (u.deletedAt || !u.active) continue;
      const roles: string[] = (u.roles || []).filter(Boolean);
      if (!roles.includes('admin')) continue;
      if (u._id === args.userId) continue;
      await ctx.db.insert('notifications', {
        userId: u._id,
        createdBy: args.userId,
        type: 'productAdded',
        message: `Product ${productId} created`,
        read: false,
        createdAt: now,
      });
    }

    return id;
  },
});

export const update = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('products'),
    productId: v.string(),
    productName: v.string(),
    category: v.string(),
    location: v.string(),
  },
  handler: async (ctx, { userId, id, ...rest }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Product not found');

    const dupe = await ctx.db
      .query('products')
      .withIndex('by_productId', (q) => q.eq('productId', rest.productId))
      .filter((q) => q.and(q.eq(q.field('deletedAt'), undefined), q.neq(q.field('_id'), id)))
      .first();
    if (dupe) throw new Error('Another product with this productId exists');

    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });

    await ctx.db.insert('auditLogs', {
      userId,
      action: 'updateProduct',
      table: 'products',
      recordId: id,
      changes: rest,
      timestamp: Date.now(),
    });

    const now = Date.now();
    const adminUsers = await ctx.db.query('users').collect();
    for (const u of adminUsers) {
      if (u.deletedAt || !u.active) continue;
      const roles: string[] = (u.roles || []).filter(Boolean);
      if (!roles.includes('admin')) continue;
      if (u._id === userId) continue;
      await ctx.db.insert('notifications', {
        userId: u._id,
        createdBy: userId,
        type: 'productUpdated',
        message: `Product ${rest.productId} updated`,
        read: false,
        createdAt: now,
      });
    }
    return { ok: true };
  },
});

export const remove = mutation({
  args: { userId: v.id('users'), id: v.id('products') },
  handler: async (ctx, { userId, id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Product not found');
    await ctx.db.patch(id, { deletedAt: Date.now() });

    await ctx.db.insert('auditLogs', {
      userId,
      action: 'deleteProduct',
      table: 'products',
      recordId: id,
      changes: { deletedAt: Date.now() },
      timestamp: Date.now(),
    });

    const now = Date.now();
    const adminUsers = await ctx.db.query('users').collect();
    for (const u of adminUsers) {
      if (u.deletedAt || !u.active) continue;
      const roles: string[] = (u.roles || []).filter(Boolean);
      if (!roles.includes('admin')) continue;
      if (u._id === userId) continue;
      await ctx.db.insert('notifications', {
        userId: u._id,
        createdBy: userId,
        type: 'productRemoved',
        message: `Product ${existing.productId} removed`,
        read: false,
        createdAt: now,
      });
    }

    return { ok: true };
  },
});
