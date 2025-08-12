import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import { RoleType } from '@/constants';
import { v } from 'convex/values';

function now() {
  return Date.now();
}

export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;

    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await ctx.db.get(userId as Id<'users'>);

    if (!user) {
      throw new Error('User not found');
    }

    let picture = '';

    if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) {
      picture = user.profilePicture;
    } else if (user.profilePicture) {
      const url = await ctx.storage.getUrl(user.profilePicture as Id<'_storage'>);
      picture = url ?? '';
    }

    return {
      picture,
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      designation: user.designation,
      status: (!user.googleId ? 'invited' : user.active ? 'active' : 'inactive') as 'invited' | 'active' | 'inactive',
    };
  },
});

export const checkUserRole = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    if (!userId) throw new Error('User ID is required');

    const user = await ctx.db.get(userId as Id<'users'>);
    if (!user) throw new Error('User not found');

    return { id: user._id, role: user.role as RoleType };
  },
});

export const login = mutation({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    const { googleId } = args;
    if (!googleId) throw new Error('Google ID is required');

    const user = await ctx.db
      .query('users')
      .withIndex('by_googleId', (q) => q.eq('googleId', googleId))
      .first();

    if (!user) throw new Error('User not found');
    if (!user.active) throw new Error('User is inactive');
    if (user.deletedAt) throw new Error('User is deleted');

    const at = now();
    await ctx.db.patch(user._id, { lastLogin: at });
    await ctx.db.insert('auditLogs', {
      userId: user._id,
      action: 'login',
      table: 'users',
      recordId: user._id,
      changes: { lastLogin: at },
      timestamp: at,
    });

    return { id: user._id, role: user.role as RoleType };
  },
});

export const acceptInvite = mutation({
  args: { picture: v.string(), googleId: v.string(), inviteId: v.string() },
  handler: async (ctx, args) => {
    const { picture, googleId, inviteId } = args;
    if (!googleId || !inviteId) throw new Error('Google ID and invite ID are required');

    const inviteDoc = await ctx.db.get(inviteId as Id<'users'>);
    if (!inviteDoc || inviteDoc.deletedAt || inviteDoc.googleId) throw new Error('Invalid invite');

    const googleOwner = await ctx.db
      .query('users')
      .withIndex('by_googleId', (q) => q.eq('googleId', googleId))
      .first();

    if (googleOwner && googleOwner._id !== inviteDoc._id) throw new Error('Google account already linked');

    await ctx.db.patch(inviteDoc._id, { googleId, active: true, profilePicture: picture });

    const at = now();
    await ctx.db.insert('auditLogs', {
      userId: inviteDoc._id,
      action: 'acceptInvite',
      table: 'users',
      recordId: inviteDoc._id,
      changes: { googleId, active: true, profilePicture: picture },
      timestamp: at,
    });

    if (inviteDoc.invitedByUser) {
      const inviter = await ctx.db.get(inviteDoc.invitedByUser as Id<'users'>);
      if (inviter) {
        await ctx.db.insert('notifications', {
          userId: inviter._id,
          createdBy: inviteDoc._id,
          type: 'inviteAccepted',
          message: `${inviteDoc.name || inviteDoc.email} accepted the invitation`,
          read: false,
          createdAt: at,
        });
      }
    }

    return { id: inviteDoc._id, role: inviteDoc.role as RoleType };
  },
});
