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
          lastLogin: user.lastLogin ? dayjs(user.lastLogin).format('YYYY-MM-DD HH:mm:ss') : 'Never',
          createdAt: dayjs(user.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          status: (!user.googleId ? 'invited' : user.active ? 'active' : 'inactive') as 'invited' | 'active' | 'inactive',
        };
      }),
    );

    return usersWithData;
  },
});

export const inviteUser = mutation({
  args: { email: v.string(), name: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const { email, name, role } = args;

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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await resend.sendEmail(ctx, {
      from: 'VKA <onboarding@resend.dev>',
      to: email,
      subject: 'Invitation to join VKA',
      html: `
        <p>Hello ${name},</p>
        <p>You have been invited to join VKA as a <strong>${role}</strong>. Please click the link below to accept the invitation and set up your account.</p>
        <p>
          <a href="http://localhost:3000/login?invite=${user}">Accept Invitation</a>
        </p>
        <p>Best regards,<br/>VKA Team</p>
      `,
    });

    return user;
  },
});
