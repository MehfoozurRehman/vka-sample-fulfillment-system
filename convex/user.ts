import { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

import { api } from './_generated/api';
import dayjs from 'dayjs';
import { renderInvitationHtml } from '../emails/Invitation';
import { roles } from '@/constants';
import { sendInternalNotifications } from '@/utils/sendInternalNotifications';
import { v } from 'convex/values';

function normalizeRoles(user: Doc<'users'>) {
  const roles: string[] = user.roles && Array.isArray(user.roles) ? user.roles : [];
  const activeRole: string | undefined = user.activeRole || roles[0];
  return { roles, activeRole };
}

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query('users')
      .withIndex('by_createdAt')
      .order('desc')
      .filter((q) => q.eq(q.field('deletedAt'), undefined))
      .collect();

    const usersWithData = await Promise.all(
      users.map(async (user) => {
        let picture = '';
        if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) {
          picture = user.profilePicture;
        } else if (user.profilePicture) {
          const url = await ctx.storage.getUrl(user.profilePicture as Id<'_storage'>);
          picture = url ?? '';
        }
        const { roles } = normalizeRoles(user);
        return {
          picture,
          id: user._id,
          name: user.name,
          roles,
          activeRole: user.activeRole || roles[0],
          email: user.email,
          designation: user.designation,
          lastLogin: user.lastLogin ? dayjs(user.lastLogin).format('YYYY-MM-DD HH:mm:ss') : null,
          createdAt: dayjs(user.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          status: (!user.googleId ? 'invited' : user.active ? 'active' : 'inactive') as 'invited' | 'active' | 'inactive',
        };
      }),
    );

    return usersWithData;
  },
});

export const inviteUser = mutation({
  args: { email: v.string(), name: v.string(), role: v.string(), invitedBy: v.id('users') },
  handler: async (ctx, args) => {
    const [email, name, newRole, invitedBy] = [args.email, args.name, args.role, args.invitedBy];
    if (!email || !name || !newRole) throw new Error('Email, name, and role are required');

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (existingUser) throw new Error('User with this email already exists');

    const roles = [newRole];
    const user = await ctx.db.insert('users', {
      email,
      name,
      roles,
      activeRole: newRole,
      active: false,
      invitedByUser: invitedBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert('auditLogs', {
      userId: user as Id<'users'>,
      action: 'inviteUser',
      table: 'users',
      recordId: user,
      changes: { email, name, roles, activeRole: newRole, active: false, invitedBy },
      timestamp: Date.now(),
    });

    const html = await renderInvitationHtml({
      title: 'Invitation to join VKA',
      name,
      role: newRole,
      inviteUrl: `https://portal.vkaff.com?invite=${user}`,
    });

    await ctx.runMutation(api.email.sendAndRecordEmail, {
      createdBy: invitedBy,
      type: 'user.invited.email',
      from: 'VKA <no-reply@vkaff.com>',
      to: [email],
      subject: 'Invitation to join VKA',
      text: `Hello ${name},\n\nYou have been invited to join VKA as a ${newRole}.\n\nAccept your invitation: https://portal.vkaff.com?invite=${user}\n\nBest regards,\nVKA Team`,
      html,
    });

    const allUsers = await ctx.db.query('users').collect();
    const admins = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin'));
    if (admins.length) {
      await sendInternalNotifications(
        ctx,
        args.invitedBy,
        'user.invited',
        `User ${name} invited with role ${newRole}`,
        admins.map((a) => a._id as Id<'users'>),
      );
    }
    return user;
  },
});

export const updateStatus = mutation({
  args: { userId: v.id('users'), status: v.union(v.literal('active'), v.literal('inactive')) },
  handler: async (ctx, { userId, status }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    await ctx.db.patch(userId, { active: status === 'active', updatedAt: Date.now() });
    await ctx.db.insert('auditLogs', {
      userId: userId,
      action: 'updateStatus',
      table: 'users',
      recordId: userId,
      changes: { active: status === 'active' },
      timestamp: Date.now(),
    });

    const allUsers = await ctx.db.query('users').collect();
    const admins = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin'));
    const recipients = [userId, ...admins.map((a) => a._id as Id<'users'>)];
    await sendInternalNotifications(ctx, userId, 'user.statusChanged', `User status changed to ${status}`, Array.from(new Set(recipients)) as Id<'users'>[]);
    return { ok: true };
  },
});

export const updateProfile = mutation({
  args: { userId: v.id('users'), name: v.optional(v.string()), designation: v.optional(v.string()) },
  handler: async (ctx, { userId, name, designation }) => {
    const u = await ctx.db.get(userId);
    if (!u) throw new Error('User not found');
    const patch: Partial<{ name?: string; designation?: string; updatedAt: number }> = { updatedAt: Date.now() };
    if (typeof name === 'string') patch.name = name;
    if (typeof designation === 'string') patch.designation = designation;
    await ctx.db.patch(userId, patch);
    await ctx.db.insert('auditLogs', {
      userId,
      action: 'updateProfile',
      table: 'users',
      recordId: userId,
      changes: patch,
      timestamp: Date.now(),
    });
    return { ok: true } as const;
  },
});

export const uploadProfilePicture = mutation({
  args: { userId: v.id('users'), storageId: v.string() },
  handler: async (ctx, { userId, storageId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    await ctx.db.patch(userId, { profilePicture: storageId, updatedAt: Date.now() });
    await ctx.db.insert('auditLogs', {
      userId,
      action: 'uploadProfilePicture',
      table: 'users',
      recordId: userId,
      changes: { profilePicture: storageId },
      timestamp: Date.now(),
    });
    return { ok: true };
  },
});

export const setActiveRole = mutation({
  args: { userId: v.id('users'), role: v.string() },
  handler: async (ctx, { userId, role }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    const { roles } = normalizeRoles(user);
    if (!roles.includes(role)) throw new Error('User does not have this role');
    await ctx.db.patch(userId, { activeRole: role, updatedAt: Date.now() });
    return { ok: true } as const;
  },
});

export const addRole = mutation({
  args: { userId: v.id('users'), role: v.string() },
  handler: async (ctx, { userId, role }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    const { roles, activeRole } = normalizeRoles(user);
    if (roles.includes(role)) return { ok: true } as const;
    const nextRoles = [...roles, role];
    await ctx.db.patch(userId, { roles: nextRoles, activeRole: activeRole || role, updatedAt: Date.now() });
    await ctx.db.insert('auditLogs', {
      userId,
      action: 'addRole',
      table: 'users',
      recordId: userId,
      changes: { roles: nextRoles },
      timestamp: Date.now(),
    });

    const allUsers = await ctx.db.query('users').collect();
    const admins = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin'));
    const recipients = [userId, ...admins.map((a) => a._id as Id<'users'>)];
    await sendInternalNotifications(ctx, userId, 'user.roleAdded', `Role ${role} added to user`, Array.from(new Set(recipients)) as Id<'users'>[]);
    return { ok: true } as const;
  },
});

export const removeRole = mutation({
  args: { userId: v.id('users'), role: v.string() },
  handler: async (ctx, { userId, role }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    const { roles, activeRole } = normalizeRoles(user);
    if (!roles.includes(role)) return { ok: true } as const;
    if (roles.length === 1) throw new Error('Cannot remove the only role');
    const nextRoles = roles.filter((r) => r !== role);
    const nextActive = activeRole === role ? nextRoles[0] : activeRole;
    await ctx.db.patch(userId, { roles: nextRoles, activeRole: nextActive, updatedAt: Date.now() });
    await ctx.db.insert('auditLogs', {
      userId,
      action: 'removeRole',
      table: 'users',
      recordId: userId,
      changes: { roles: nextRoles, activeRole: nextActive },
      timestamp: Date.now(),
    });

    const allUsers = await ctx.db.query('users').collect();
    const admins = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin'));
    const recipients = [userId, ...admins.map((a) => a._id as Id<'users'>)];
    await sendInternalNotifications(ctx, userId, 'user.roleRemoved', `Role ${role} removed from user`, Array.from(new Set(recipients)) as Id<'users'>[]);
    return { ok: true } as const;
  },
});

export const resendInvite = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');
    if (user.googleId) throw new Error('User already accepted invite');
    if (user.deletedAt) throw new Error('User deleted');
    const { activeRole } = normalizeRoles(user as Doc<'users'>);
    await ctx.runMutation(api.email.sendAndRecordEmail, {
      createdBy: (user.invitedByUser as Id<'users'>) ?? (user._id as Id<'users'>),
      type: 'user.inviteReminder.email',
      from: 'VKA <no-reply@vkaff.com>',
      to: [user.email],
      subject: 'Invitation to join VKA (Reminder)',
      text: `Hello ${user.name || 'there'},\n\nThis is a reminder to join VKA as a ${activeRole}.\n\nAccept your invitation: https://portal.vkaff.com?invite=${user._id}\n\nIf you did not expect this, you can ignore this email.\n\nBest regards,\nVKA Team`,
      html: await renderInvitationHtml({
        title: 'Invitation to join VKA (Reminder)',
        name: user.name,
        role: activeRole || 'member',
        inviteUrl: `https://portal.vkaff.com?invite=${user._id}`,
      }),
    });

    await ctx.db.insert('auditLogs', {
      userId,
      action: 'resendInvite',
      table: 'users',
      recordId: userId,
      changes: {},
      timestamp: Date.now(),
    });

    return { ok: true } as const;
  },
});

export const createFirstAdmin = mutation({
  args: { email: v.string(), name: v.string() },
  handler: async (ctx, { email, name }) => {
    const anyUser = await ctx.db.query('users').first();

    if (anyUser) throw new Error('Initial admin already created');

    const now = Date.now();

    const adminId = await ctx.db.insert('users', {
      email,
      name,
      roles: roles.map((r) => r),
      activeRole: 'admin',
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('auditLogs', {
      userId: adminId,
      action: 'createFirstAdmin',
      table: 'users',
      recordId: adminId,
      changes: { email, name, roles: ['admin'], activeRole: 'admin', active: true },
      timestamp: now,
    });

    return { id: adminId, email, name, role: 'admin' as const };
  },
});
