import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import dayjs from 'dayjs';
import { v } from 'convex/values';

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('deletedAt'), null))
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
