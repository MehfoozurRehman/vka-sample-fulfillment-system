import { query } from './_generated/server';
import { v } from 'convex/values';

export const getNotifications = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query('notifications')
      .filter((q) => q.eq(q.field('userId'), args.userId))
      .filter((q) => q.eq(q.field('read'), false))
      .collect();

    return notifications;
  },
});
