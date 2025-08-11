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
    const items = await ctx.db
      .query('products')
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .collect();

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
      // generate next id
      const items = await ctx.db
        .query('products')
        .filter((q) => q.eq(q.field('deletedAt'), undefined))
        .collect();
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

    // Prevent productId duplication among non-deleted products
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
