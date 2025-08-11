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
    const notification = await ctx.db.get(notificationId as Id<'notifications'>);
    await ctx.db.patch(notificationId as Id<'notifications'>, { read: true });
    if (notification) {
      await ctx.db.insert('auditLogs', {
        userId: notification.userId,
        action: 'markAsRead',
        table: 'notifications',
        recordId: notificationId,
        changes: { read: true },
        timestamp: Date.now(),
      });
    }
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

    await Promise.all(
      unread.map(async (n) => {
        await ctx.db.patch(n._id, { read: true });
        await ctx.db.insert('auditLogs', {
          userId: userId,
          action: 'markAllAsRead',
          table: 'notifications',
          recordId: n._id,
          changes: { read: true },
          timestamp: Date.now(),
        });
      }),
    );

    return { ok: true, count: unread.length } as const;
  },
});
