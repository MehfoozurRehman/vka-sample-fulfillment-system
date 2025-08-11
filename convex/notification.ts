import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import { v } from 'convex/values';

export const getNotifications = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .filter((q) => q.eq(q.field('read'), false))
      .collect();

    return notifications;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, { notificationId }) => {
    await ctx.db.patch(notificationId as Id<'notifications'>, { read: true });
    return { ok: true } as const;
  },
});

export const markAllAsRead = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('read'), false))
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));

    return { ok: true, count: unread.length } as const;
  },
});
