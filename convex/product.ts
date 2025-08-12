import { mutation, query } from './_generated/server';

import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query('products')
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
    // Include ALL products (even soft-deleted) so we never reuse an ID.
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
    productId: v.string(),
    productName: v.string(),
    category: v.string(),
    location: v.string(),
  },
  handler: async (ctx, args) => {
    let productId = (args.productId || '').trim();

    if (!productId || productId.toUpperCase() === 'AUTO') {
      // Include deleted products when generating next sequential ID to avoid reuse
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
      .filter((q) => q.and(q.eq(q.field('productId'), productId), q.eq(q.field('deletedAt'), undefined)))
      .first();
    if (duplicate) throw new Error('Product with this productId already exists');

    const now = Date.now();
    const id = await ctx.db.insert('products', { ...args, productId, createdAt: now, updatedAt: now });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id('products'),
    productId: v.string(),
    productName: v.string(),
    category: v.string(),
    location: v.string(),
  },
  handler: async (ctx, { id, ...rest }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Product not found');

    const dupe = await ctx.db
      .query('products')
      .filter((q) => q.and(q.eq(q.field('productId'), rest.productId), q.neq(q.field('_id'), id), q.eq(q.field('deletedAt'), undefined)))
      .first();
    if (dupe) throw new Error('Another product with this productId exists');

    await ctx.db.patch(id, { ...rest, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { id: v.id('products') },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Product not found');
    await ctx.db.patch(id, { deletedAt: Date.now() });
    return { ok: true };
  },
});
