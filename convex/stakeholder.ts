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

