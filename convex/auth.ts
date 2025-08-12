import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import { RoleType } from '@/constants';
import { v } from 'convex/values';

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

    if (!userId) {
      throw new Error('User ID is required');
    }

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('_id'), userId))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user._id,
      role: user.role as RoleType,
    };
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

    const now = Date.now();
    await ctx.db.patch(user._id, { lastLogin: now });
    await ctx.db.insert('auditLogs', {
      userId: user._id,
      action: 'login',
      table: 'users',
      recordId: user._id,
      changes: { lastLogin: now },
      timestamp: now,
    });

    return { id: user._id, role: user.role as RoleType };
  },
});

export const acceptInvite = mutation({
  args: { picture: v.string(), googleId: v.string(), inviteId: v.string() },
  handler: async (ctx, args) => {
    const { picture, googleId, inviteId } = args;

    if (!googleId || !inviteId) {
      throw new Error('Google ID and invite ID are required');
    }

    const googleOwner = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('googleId'), googleId))
      .first();

    if (googleOwner && googleOwner._id !== (inviteId as unknown as Id<'users'>)) {
      throw new Error('This Google account is already linked to another user');
    }

    const validInvite = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('_id'), inviteId) && q.eq(q.field('googleId'), undefined))
      .first();

    if (!validInvite) {
      throw new Error('Invalid invite');
    }

    if (validInvite.deletedAt) {
      throw new Error('Invite is deleted');
    }

    await ctx.db.patch(inviteId as Id<'users'>, {
      googleId,
      active: true,
      profilePicture: picture,
    });

    await ctx.db.insert('auditLogs', {
      userId: inviteId as Id<'users'>,
      action: 'acceptInvite',
      table: 'users',
      recordId: inviteId,
      changes: { googleId, active: true, profilePicture: picture },
      timestamp: Date.now(),
    });

    if (validInvite.invitedByUser) {
      const inviter = await ctx.db.get(validInvite.invitedByUser as Id<'users'>);
      if (inviter) {
        await ctx.db.insert('notifications', {
          userId: inviter._id,
          createdBy: inviteId as Id<'users'>,
          type: 'inviteAccepted',
          message: `${validInvite.name || validInvite.email} accepted the invitation`,
          read: false,
          createdAt: Date.now(),
        });
      }
    }

    return {
      id: inviteId,
      role: validInvite?.role as RoleType,
    };
  },
});
