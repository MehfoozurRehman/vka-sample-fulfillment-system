import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import dayjs from 'dayjs';
import { resend } from './resend';
import { v } from 'convex/values';

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query('users')
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

        return {
          picture,
          id: user._id,
          name: user.name,
          role: user.role,
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
    const { email, name, role, invitedBy } = args;

    if (!email || !name || !role) {
      throw new Error('Email, name, and role are required');
    }

    const existingUser = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), email))
      .first();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const user = await ctx.db.insert('users', {
      email,
      name,
      role,
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
      changes: { email, name, role, active: false, invitedBy },
      timestamp: Date.now(),
    });

    await resend.sendEmail(ctx, {
      from: 'VKA <onboarding@resend.dev>',
      to: email,
      subject: 'Invitation to join VKA',
      html: `
        <p>Hello ${name},</p>
        <p>You have been invited to join VKA as a <strong>${role}</strong>. Please click the link below to accept the invitation and set up your account.</p>
        <p>
          <a href="http://localhost:3000?invite=${user}">Accept Invitation</a>
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
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
    designation: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, designation }) => {
    const u = await ctx.db.get(userId);

    if (!u) throw new Error('User not found');

    const patch: Partial<{ name: string; designation: string; profilePicture: string; updatedAt: number }> = { updatedAt: Date.now() };

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

export const updateRole = mutation({
  args: {
    userId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('requester'), v.literal('screener'), v.literal('packer'), v.literal('shipper')),
  },
  handler: async (ctx, { userId, role }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    await ctx.db.patch(userId, { role, updatedAt: Date.now() });

    await ctx.db.insert('auditLogs', {
      userId,
      action: 'updateRole',
      table: 'users',
      recordId: userId,
      changes: { role },
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

    await resend.sendEmail(ctx, {
      from: 'VKA <onboarding@resend.dev>',
      to: user.email,
      subject: 'Invitation to join VKA (Reminder)',
      html: `
        <p>Hello ${user.name || 'there'},</p>
        <p>This is a reminder to join VKA as a <strong>${user.role}</strong>. Please click the link below to accept the invitation and set up your account.</p>
        <p>
          <a href="http://localhost:3000?invite=${user._id}">Accept Invitation</a>
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
    if (anyUser) {
      throw new Error('Initial admin already created');
    }

    const now = Date.now();
    const adminId = await ctx.db.insert('users', {
      email,
      name,
      role: 'admin',
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('auditLogs', {
      userId: adminId,
      action: 'createFirstAdmin',
      table: 'users',
      recordId: adminId,
      changes: { email, name, role: 'admin', active: true },
      timestamp: now,
    });

    return { id: adminId, email, name, role: 'admin' as const };
  },
});
