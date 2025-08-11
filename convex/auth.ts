import { mutation, query } from './_generated/server';

import { Id } from './_generated/dataModel';
import dayjs from 'dayjs';
import { v } from 'convex/values';

export const login = mutation({
  args: { name: v.string(), email: v.string(), picture: v.string(), googleId: v.string() },
  handler: async (ctx, args) => {
    const { name, email, picture, googleId } = args;
  },
});
