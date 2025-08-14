import { mutation, query } from './_generated/server';

import { Doc, Id } from './_generated/dataModel';
import { RoleType } from '@/constants';
import { v } from 'convex/values';

function now() {
  return Date.now();
}

function extractRoles(u: Doc<'users'>) {
  const roles = u.roles && u.roles.length > 0 ? u.roles : [];
  const activeRole = u.activeRole || (roles.length ? roles[0] : undefined);
  return { roles, activeRole };
}

export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = args;
    if (!userId) throw new Error('User ID is required');
    const user = await ctx.db.get(userId as Id<'users'>);
    if (!user) throw new Error('User not found');

    let picture = '';
    if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) {
      picture = user.profilePicture;
    } else if (user.profilePicture) {
      const url = await ctx.storage.getUrl(user.profilePicture as Id<'_storage'>);
      picture = url ?? '';
    }

    const { roles, activeRole } = extractRoles(user);

    return {
      picture,
      id: user._id,
      name: user.name,
      activeRole,
      roles,
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

    const { roles, activeRole } = extractRoles(user);

    return { id: user._id, activeRole: activeRole as RoleType, roles };
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

    const { roles, activeRole } = extractRoles(user);
    return { id: user._id, activeRole: activeRole as RoleType, roles };
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

    const { roles, activeRole } = extractRoles(inviteDoc);
    return { id: inviteDoc._id, activeRole: activeRole as RoleType, roles };
  },
});
