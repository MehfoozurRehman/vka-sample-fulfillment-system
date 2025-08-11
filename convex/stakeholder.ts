import { mutation, query } from './_generated/server';

import { v } from 'convex/values';

export const getStakeholders = query({
  args: {},
  handler: async (ctx) => {
    const stakeholders = await ctx.db
      .query('stakeholders')
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
      .filter((q) => q.eq(q.field('companyName'), companyName))
      .first();

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
