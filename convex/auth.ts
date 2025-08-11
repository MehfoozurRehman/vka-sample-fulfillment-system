import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import { Roles } from '@/constants';
import dayjs from 'dayjs';
import { v } from 'convex/values';

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
      role: user.role as Roles,
    };
  },
});

export const login = mutation({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    const { googleId } = args;

    if (!googleId) {
      throw new Error('Google ID is required');
    }

    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('googleId'), googleId))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.active) {
      throw new Error('User is inactive');
    }

    if (user.deletedAt) {
      throw new Error('User is deleted');
    }

    await ctx.db.patch(user._id, {
      lastLogin: dayjs().unix(),
    });

    return {
      id: user._id,
      role: user.role as Roles,
    };
  },
});

export const acceptInvite = mutation({
  args: { picture: v.string(), googleId: v.string(), inviteId: v.string() },
  handler: async (ctx, args) => {
    const { picture, googleId, inviteId } = args;

    if (!googleId || !inviteId) {
      throw new Error('Google ID and invite ID are required');
    }

    const validInvite = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('_id'), inviteId) && q.eq(q.field('googleId'), undefined))
      .first();

    if (!validInvite) {
      throw new Error('Invalid invite');
    }

    if (validInvite.active) {
      throw new Error('Invite already accepted');
    }

    if (validInvite.deletedAt) {
      throw new Error('Invite is deleted');
    }

    await ctx.db.patch(inviteId as Id<'users'>, {
      googleId,
      active: true,
      profilePicture: picture,
    });

    return {
      id: inviteId,
      role: validInvite?.role as Roles,
    };
  },
});
