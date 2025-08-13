import type { Doc, Id } from './_generated/dataModel';
import { components, internal } from './_generated/api';
import { internalMutation, internalQuery, mutation, query } from './_generated/server';

import { v } from 'convex/values';

export const queueEmail = internalMutation({
  args: {
    type: v.string(),
    createdBy: v.id('users'),
    from: v.string(),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    replyTo: v.optional(v.array(v.string())),
    subject: v.string(),
    text: v.optional(v.string()),
    html: v.optional(v.string()),
    headers: v.optional(v.array(v.object({ name: v.string(), value: v.string() }))),
    scheduledAt: v.optional(v.number()),
    related: v.optional(
      v.object({
        requestId: v.optional(v.id('requests')),
        orderId: v.optional(v.id('orders')),
        stakeholderId: v.optional(v.id('stakeholders')),
      }),
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Id<'emails'>> => {
    const now = Date.now();
    const id = await ctx.db.insert('emails', {
      type: args.type,
      createdBy: args.createdBy,
      from: args.from,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      replyTo: args.replyTo,
      subject: args.subject,
      text: args.text,
      html: args.html,
      headers: args.headers,
      status: 'pending',
      resendId: undefined,
      errorMessage: undefined,
      opened: false,
      complained: false,
      attemptCount: 0,
      nextAttemptAt: args.scheduledAt,
      createdAt: now,
      updatedAt: now,
      finalizedAt: undefined,
      sentAt: undefined,
      scheduledAt: args.scheduledAt,
      related: args.related,
      metadata: args.metadata,
    });
    return id as Id<'emails'>;
  },
});

export const attemptSend = internalMutation({
  args: { emailId: v.id('emails'), apiKey: v.string() },
  handler: async (ctx, { emailId, apiKey }): Promise<{ ok: boolean; resendId?: string; final?: boolean }> => {
    const email = await ctx.db.get(emailId);
    if (!email) throw new Error('Email not found');
    const now = Date.now();

    if (['sent', 'delivered', 'bounced', 'failed', 'cancelled'].includes(email.status)) {
      return { ok: true, final: true };
    }

    await ctx.db.patch(emailId, { status: 'retrying', updatedAt: now });

    try {
      const resendId = await ctx.runMutation(components.resend.lib.sendEmail, {
        from: email.from,
        to: email.to.join(', '),
        subject: email.subject,
        text: email.text,
        html: email.html,
        headers: email.headers,
        replyTo: email.replyTo,
        options: {
          apiKey,
          initialBackoffMs: 1000,
          retryAttempts: 0,
          testMode: false,
          onEmailEvent: { fnHandle: 'convex/email.handleResendEvent' },
        },
      });

      await ctx.db.patch(emailId, {
        status: 'sent',
        resendId,
        sentAt: now,
        updatedAt: now,
        attemptCount: (email.attemptCount ?? 0) + 1,
        nextAttemptAt: undefined,
      });

      return { ok: true, resendId, final: false };
    } catch (err: unknown) {
      const errMsg = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message) : String(err);
      const attempts = (email.attemptCount ?? 0) + 1;
      const maxAttempts = 3;
      const baseBackoff = 30_000;
      const nextAttemptAt = attempts < maxAttempts ? now + baseBackoff * 2 ** (attempts - 1) : undefined;
      const final = attempts >= maxAttempts;

      await ctx.db.patch(emailId, {
        status: final ? 'failed' : 'pending',
        errorMessage: errMsg || 'Unknown send error',
        updatedAt: now,
        attemptCount: attempts,
        nextAttemptAt,
        finalizedAt: final ? now : undefined,
      });

      return { ok: false, final };
    }
  },
});

export const sendAndRecordEmail = mutation({
  args: {
    createdBy: v.id('users'),
    type: v.string(),
    from: v.string(),
    to: v.array(v.string()),
    subject: v.string(),
    text: v.optional(v.string()),
    html: v.optional(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    replyTo: v.optional(v.array(v.string())),
    headers: v.optional(v.array(v.object({ name: v.string(), value: v.string() }))),
    related: v.optional(
      v.object({
        requestId: v.optional(v.id('requests')),
        orderId: v.optional(v.id('orders')),
        stakeholderId: v.optional(v.id('stakeholders')),
      }),
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<Id<'emails'>> => {
    const emailId = await ctx.runMutation(internal.email.queueEmail, {
      type: args.type,
      createdBy: args.createdBy,
      from: args.from,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      replyTo: args.replyTo,
      subject: args.subject,
      text: args.text,
      html: args.html,
      headers: args.headers,
      related: args.related,
      metadata: args.metadata,
    });

    const apiKey = process.env.RESEND_API_KEY || '';
    if (!apiKey) throw new Error('RESEND_API_KEY not configured');

    await ctx.runMutation(internal.email.attemptSend, { emailId, apiKey });
    return emailId as Id<'emails'>;
  },
});

export const retryPendingEmails = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }): Promise<number> => {
    const cap = Math.max(1, Math.min(100, limit ?? 20));
    const now = Date.now();

    const candidates = (
      await ctx.db
        .query('emails')
        .withIndex('by_status', (q) => q.eq('status', 'pending'))
        .collect()
    )
      .filter((e) => !e.nextAttemptAt || e.nextAttemptAt <= now)
      .slice(0, cap);

    const apiKey = process.env.RESEND_API_KEY || '';
    if (!apiKey) return 0;

    let processed = 0;
    for (const e of candidates) {
      await ctx.runMutation(internal.email.attemptSend, { emailId: e._id as Id<'emails'>, apiKey });
      processed += 1;
    }
    return processed;
  },
});

export const handleResendEvent = internalMutation({
  args: { event: v.any() },
  handler: async (ctx, { event }): Promise<null> => {
    try {
      const resendId: string | undefined = event?.data?.email_id || event?.email?.id || event?.email?.object?.id || event?.id;
      if (!resendId) return null;
      const email = await ctx.db
        .query('emails')
        .withIndex('by_resendId', (q) => q.eq('resendId', resendId))
        .unique();
      if (!email) return null;

      const now = Date.now();
      const type = (event?.type || '').toLowerCase();
      const statusMap: Record<string, Doc<'emails'>['status']> = {
        'email.sent': 'sent',
        'email.delivered': 'delivered',
        'email.delivery_delayed': 'delivery_delayed',
        'email.bounced': 'bounced',
        'email.complained': 'failed',
        'email.opened': 'delivered',
        'email.failed': 'failed',
        sent: 'sent',
        delivered: 'delivered',
        delivery_delayed: 'delivery_delayed',
        bounced: 'bounced',
        complained: 'failed',
        opened: 'delivered',
        failed: 'failed',
      };

      const nextStatus = statusMap[type] || email.status;
      const patchBase: Partial<Doc<'emails'>> = { status: nextStatus, updatedAt: now };
      const patch: Partial<Doc<'emails'>> = { ...patchBase };
      if (type.includes('opened') || type === 'opened') patch.opened = true;
      if (type.includes('complain') || type === 'complained') patch.complained = true;
      if (['failed', 'bounced'].includes(nextStatus) && event?.data?.reason) patch.errorMessage = String(event.data.reason);
      if (['delivered', 'failed', 'bounced', 'cancelled'].includes(nextStatus)) patch.finalizedAt = now;

      await ctx.db.patch(email._id as Id<'emails'>, patch);
      return null;
    } catch {
      return null;
    }
  },
});

export const getEmailStatus = internalQuery({
  args: { emailId: v.id('emails') },
  handler: async (ctx, { emailId }): Promise<{ status: Doc<'emails'>['status']; resendId?: string; errorMessage?: string; opened: boolean } | null> => {
    const email = await ctx.db.get(emailId);
    if (!email) return null;
    return { status: email.status, resendId: email.resendId, errorMessage: email.errorMessage, opened: !!email.opened } as const;
  },
});

export const list = query({
  args: {
    status: v.optional(v.string()),
    type: v.optional(v.string()),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, type, start, end, search, limit }) => {
    const cap = Math.min(Math.max(limit ?? 200, 1), 1000);

    let emails: Doc<'emails'>[] = [];

    if (status) {
      emails = await ctx.db
        .query('emails')
        .withIndex('by_status', (q) => q.eq('status', status))
        .collect();
    } else if (start && end) {
      emails = await ctx.db
        .query('emails')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', start).lte('createdAt', end))
        .collect();
    } else if (start) {
      emails = await ctx.db
        .query('emails')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', start))
        .collect();
    } else if (end) {
      const collected = await ctx.db.query('emails').withIndex('by_createdAt').order('desc').collect();
      emails = collected.filter((e) => e.createdAt <= end);
    } else {
      emails = await ctx.db.query('emails').withIndex('by_createdAt').order('desc').collect();
    }

    let filtered = emails.filter((e) => !type || e.type === type);

    if (start && !end) filtered = filtered.filter((e) => e.createdAt >= start);
    if (end && !start) filtered = filtered.filter((e) => e.createdAt <= end);

    if (search) {
      const s = search.toLowerCase();
      const contains = (val?: unknown) => (val ? String(val).toLowerCase().includes(s) : false);
      filtered = filtered.filter(
        (e) => contains(e.subject) || e.to?.some(contains) || e.cc?.some(contains) || e.bcc?.some(contains) || contains(e.resendId) || contains(e.errorMessage) || contains(e.type),
      );
    }

    filtered.sort((a, b) => b.createdAt - a.createdAt);
    const sliced = filtered.slice(0, cap);

    const userIds = Array.from(new Set(sliced.map((e) => e.createdBy))) as Id<'users'>[];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map<string, Doc<'users'> | null>();
    userIds.forEach((id, i) => userMap.set(String(id), users[i] || null));

    return sliced.map((e) => {
      const u = userMap.get(String(e.createdBy));
      return {
        id: e._id,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        type: e.type,
        status: e.status,
        subject: e.subject,
        to: e.to,
        cc: e.cc ?? [],
        bcc: e.bcc ?? [],
        replyTo: e.replyTo ?? [],
        attemptCount: e.attemptCount,
        nextAttemptAt: e.nextAttemptAt,
        resendId: e.resendId,
        errorMessage: e.errorMessage,
        sentAt: e.sentAt,
        finalizedAt: e.finalizedAt,
        related: e.related,
        createdBy: { id: e.createdBy, name: u?.name ?? null, email: u?.email ?? null },
      } as const;
    });
  },
});

export const stats = query({
  args: { start: v.optional(v.number()), end: v.optional(v.number()) },
  handler: async (ctx, { start, end }) => {
    let emails: Doc<'emails'>[] = [];
    if (start && end) {
      emails = await ctx.db
        .query('emails')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', start).lte('createdAt', end))
        .collect();
    } else if (start) {
      emails = await ctx.db
        .query('emails')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', start))
        .collect();
    } else if (end) {
      const collected = await ctx.db.query('emails').withIndex('by_createdAt').order('desc').collect();
      emails = collected.filter((e) => e.createdAt <= end);
    } else {
      emails = await ctx.db.query('emails').collect();
    }

    const countBy = (s: string) => emails.filter((e) => e.status === s).length;
    const total = emails.length;

    return {
      total,
      pending: countBy('pending'),
      retrying: countBy('retrying'),
      sent: countBy('sent'),
      delivered: countBy('delivered'),
      delivery_delayed: countBy('delivery_delayed'),
      bounced: countBy('bounced'),
      failed: countBy('failed'),
      cancelled: countBy('cancelled'),
    } as const;
  },
});

export const sendDailySummary = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ sentTo: string[] } | { skipped: true }> => {
    const end = Date.now();
    const start = end - 24 * 60 * 60 * 1000;
    const emails = await ctx.db
      .query('emails')
      .withIndex('by_createdAt', (q) => q.gte('createdAt', start))
      .collect();

    const countBy = (s: string) => emails.filter((e) => e.status === s).length;
    const total = emails.length;

    const summary = `Email Summary (last 24h)\n\nTotal: ${total}\nPending: ${countBy('pending')}\nRetrying: ${countBy('retrying')}\nSent: ${countBy('sent')}\nDelivered: ${countBy('delivered')}\nDelayed: ${countBy('delivery_delayed')}\nBounced: ${countBy('bounced')}\nFailed: ${countBy('failed')}\nCancelled: ${countBy('cancelled')}`;

    const users = await ctx.db.query('users').collect();
    const admins = users.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin'));
    const to = admins.map((a) => a.email).filter((e) => /.+@.+\..+/.test(e));

    if (!to.length) return { skipped: true } as const;

    const createdBy = admins[0]._id;

    const subject = 'VKA Email Queue – Daily Summary';
    const text = summary;

    const emailId = await ctx.runMutation(internal.email.queueEmail, {
      type: 'emails.dailySummary.email',
      createdBy,
      from: 'VKA <no-reply@vkaff.com>',
      to,
      subject,
      text,
    });

    const apiKey = process.env.RESEND_API_KEY || '';
    if (apiKey) {
      await ctx.runMutation(internal.email.attemptSend, { emailId, apiKey });
    }

    return { sentTo: to } as const;
  },
});
