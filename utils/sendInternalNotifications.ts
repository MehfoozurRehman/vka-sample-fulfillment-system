import { Id } from '@/convex/_generated/dataModel';
import { type DatabaseWriter } from '@/convex/_generated/server';

export async function sendInternalNotifications(ctx: { db: DatabaseWriter }, createdBy: Id<'users'>, type: string, message: string, recipients: Id<'users'>[]) {
  for (const rid of recipients) {
    await ctx.db.insert('notifications', { userId: rid, createdBy, type, message, read: false, createdAt: Date.now() });
  }
}
