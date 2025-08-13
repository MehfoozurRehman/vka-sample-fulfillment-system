import { appUrl, roles } from '@/constants';
import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import dayjs from 'dayjs';
import { resend } from './resend';
import { v } from 'convex/values';

interface UserDocLike {
  _id: Id<'users'>;
  email: string;
  name?: string;
  designation?: string;
  profilePicture?: string;
  googleId?: string;
  active: boolean;
  deletedAt?: number;
  lastLogin?: number;
  roles?: string[];
  activeRole?: string;
}

function normalizeRoles(user: UserDocLike) {
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
        const { roles, activeRole } = normalizeRoles(user);
        return {
          picture,
          id: user._id,
          name: user.name,
          roles,
          activeRole,
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

    await resend.sendEmail(ctx, {
      from: 'VKA <onboarding@resend.dev>',
      to: email,
      subject: 'Invitation to join VKA',
      html: `
        <p>Hello ${name},</p>
        <p>You have been invited to join VKA with role <strong>${newRole}</strong>. Please click the link below to accept the invitation and set up your account.</p>
        <p>
          <a href="${appUrl}?invite=${user}">Accept Invitation</a>
        </p>
        <p>Best regards,<br/>VKA Team</p>
      `,
    });

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
    await ctx.db.insert('auditLogs', {
      userId,
      action: 'setActiveRole',
      table: 'users',
      recordId: userId,
      changes: { activeRole: role },
      timestamp: Date.now(),
    });
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
    const { activeRole } = normalizeRoles(user as unknown as UserDocLike);
    await resend.sendEmail(ctx, {
      from: 'VKA <onboarding@resend.dev>',
      to: user.email,
      subject: 'Invitation to join VKA (Reminder)',
      html: `
        <p>Hello ${user.name || 'there'},</p>
        <p>This is a reminder to join VKA as a <strong>${activeRole}</strong>. Please click the link below to accept the invitation and set up your account.</p>
        <p>
          <a href="${appUrl}?invite=${user._id}">Accept Invitation</a>
        </p>
        <p>If you did not expect this, you can ignore this email.</p>
        <p>Best regards,<br/>VKA Team</p>
      `,
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
