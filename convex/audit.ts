import { Id } from './_generated/dataModel';
import { mutation } from './_generated/server';
import { query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {
    userId: v.optional(v.id('users')),
    action: v.optional(v.string()),
    table: v.optional(v.string()),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { userId, action, table, start, end, search }) => {
    let logs;

    if (userId) {
      logs = await ctx.db
        .query('auditLogs')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect();
    } else {
      logs = await ctx.db.query('auditLogs').collect();
    }

    const filtered = logs
      .filter((l) => (action ? l.action === action : true))
      .filter((l) => (table ? l.table === table : true))
      .filter((l) => (typeof start === 'number' ? l.timestamp >= start : true))
      .filter((l) => (typeof end === 'number' ? l.timestamp <= end : true))
      .filter((l) => {
        if (!search) return true;
        const hay = `${l.action}\n${l.table}\n${l.recordId}\n${JSON.stringify(l.changes)}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    const uniqueUserIds = Array.from(new Set(filtered.map((l) => l.userId as Id<'users'>)));
    const users = await Promise.all(uniqueUserIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    return filtered.map((l) => {
      const u = userMap.get(l.userId as Id<'users'>);
      return {
        id: l._id,
        timestamp: l.timestamp,
        userId: l.userId,
        userName: u?.name ?? 'Unknown',
        userEmail: u?.email ?? '',
        action: l.action,
        table: l.table,
        recordId: l.recordId,
        changes: l.changes,
      };
    });
  },
});

export const addAuditLog = mutation({
  args: {
    userId: v.id('users'),
    action: v.string(),
    table: v.string(),
    recordId: v.optional(v.string()),
    changes: v.optional(v.any()),
  },
  handler: async (ctx, { userId, action, table, recordId, changes }) => {
    const id = await ctx.db.insert('auditLogs', {
      userId,
      action,
      table,
      recordId: recordId || '',
      changes: changes ?? {},
      timestamp: Date.now(),
    });

    return { id };
  },
});
