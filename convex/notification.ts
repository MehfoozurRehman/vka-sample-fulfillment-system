import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import { v } from 'convex/values';

export const getNotifications = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) => q.eq('userId', args.userId).eq('read', false))
      .order('desc')
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
      .withIndex('by_user_read', (q) => q.eq('userId', userId).eq('read', false))
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

export const getNotificationTypes = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const types = Array.from(new Set(all.map((n) => n.type))).sort();
    return types;
  },
});

export const getPreferences = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const prefs = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    return prefs;
  },
});

export const setPreference = mutation({
  args: { userId: v.id('users'), type: v.string(), enabled: v.boolean() },
  handler: async (ctx, { userId, type, enabled }) => {
    const existing = await ctx.db
      .query('notificationPreferences')
      .withIndex('by_user_type', (q) => q.eq('userId', userId).eq('type', type))
      .unique();
    const now = Date.now();
    let prefId: Id<'notificationPreferences'>;
    if (existing) {
      await ctx.db.patch(existing._id, { enabled, updatedAt: now });
      prefId = existing._id;
    } else {
      prefId = await ctx.db.insert('notificationPreferences', { userId, type, enabled, updatedAt: now });
    }
    await ctx.db.insert('auditLogs', {
      userId,
      action: 'setNotificationPreference',
      table: 'notificationPreferences',
      recordId: prefId,
      changes: { type, enabled },
      timestamp: now,
    });
    return { ok: true } as const;
  },
});
