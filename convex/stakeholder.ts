import { mutation, query } from './_generated/server';

import { v } from 'convex/values';

export const getStakeholders = query({
  args: {},
  handler: async (ctx) => {
    const stakeholders = await ctx.db
      .query('stakeholders')
      .withIndex('by_createdAt')
      .order('desc')
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .collect();

    return stakeholders.map((s) => ({
      id: s._id,
      companyName: s.companyName,
      salesRepEmail: s.salesRepEmail,
      accountManagerEmail: s.accountManagerEmail,
      complianceOfficerEmail: s.complianceOfficerEmail,
      vipFlag: s.vipFlag,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  },
});

export const addStakeholder = mutation({
  args: {
    userId: v.id('users'),
    companyName: v.string(),
    salesRepEmail: v.string(),
    accountManagerEmail: v.string(),
    complianceOfficerEmail: v.string(),
    vipFlag: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { companyName, salesRepEmail, accountManagerEmail, complianceOfficerEmail, vipFlag } = args;

    const existing = await ctx.db
      .query('stakeholders')
      .withIndex('by_companyName', (q) => q.eq('companyName', companyName))
      .unique();

    if (existing) {
      throw new Error('A stakeholder with this company name already exists');
    }

    const now = Date.now();

    const id = await ctx.db.insert('stakeholders', {
      companyName,
      salesRepEmail,
      accountManagerEmail,
      complianceOfficerEmail,
      vipFlag,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('auditLogs', {
      action: 'addStakeholder',
      table: 'stakeholders',
      recordId: id,
      userId: args.userId,
      timestamp: Date.now(),
      changes: {
        companyName,
        salesRepEmail,
        accountManagerEmail,
        complianceOfficerEmail,
        vipFlag,
      },
    });

    return id;
  },
});

export const updateStakeholder = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('stakeholders'),
    companyName: v.string(),
    salesRepEmail: v.string(),
    accountManagerEmail: v.string(),
    complianceOfficerEmail: v.string(),
    vipFlag: v.boolean(),
  },
  handler: async (ctx, { userId, id, companyName, salesRepEmail, accountManagerEmail, complianceOfficerEmail, vipFlag }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Stakeholder not found');

    const duplicate = await ctx.db
      .query('stakeholders')
      .withIndex('by_companyName', (q) => q.eq('companyName', companyName))
      .filter((q) => q.neq(q.field('_id'), id))
      .first();
    if (duplicate) throw new Error('Another stakeholder with this company name already exists');

    await ctx.db.patch(id, {
      companyName,
      salesRepEmail,
      accountManagerEmail,
      complianceOfficerEmail,
      vipFlag,
      updatedAt: Date.now(),
    });

    await ctx.db.insert('auditLogs', {
      userId,
      action: 'updateStakeholder',
      table: 'stakeholders',
      recordId: id,
      changes: { companyName, salesRepEmail, accountManagerEmail, complianceOfficerEmail, vipFlag },
      timestamp: Date.now(),
    });

    const now = Date.now();
    const allUsers = await ctx.db.query('users').collect();
    const relatedEmails = new Set([salesRepEmail, accountManagerEmail, complianceOfficerEmail].filter(Boolean));

    for (const u of allUsers) {
      if (u.deletedAt || !u.active) continue;
      const roles: string[] = (u.roles || []).filter(Boolean);
      const isAdmin = roles.includes('admin');
      const isRelated = relatedEmails.has(u.email);
      if (!isAdmin && !isRelated) continue;
      if (u._id === userId) continue;
      await ctx.db.insert('notifications', {
        userId: u._id,
        createdBy: userId,
        type: 'stakeholderUpdated',
        message: `Stakeholder ${companyName} updated`,
        read: false,
        createdAt: now,
      });
    }

    return { ok: true };
  },
});
