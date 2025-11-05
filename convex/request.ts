import { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';

import { api } from './_generated/api';
import dayjs from 'dayjs';
import { sendInternalNotifications } from '@/utils/sendInternalNotifications';
import { v } from 'convex/values';

function uniqEmails(emails: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      emails
        .filter(Boolean)
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => /.+@.+\..+/.test(e)),
    ),
  );
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type ReqDoc = Doc<'requests'>;
type OrderDoc = Doc<'orders'>;
type StakeholderDoc = Doc<'stakeholders'>;
type UserDoc = Doc<'users'>;

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 10, 50);

    const requests = (await ctx.db.query('requests').withIndex('by_createdAt').order('desc').collect()).filter((r) => !r.deletedAt).slice(0, max) as ReqDoc[];

    const stakeholderIds = Array.from(new Set(requests.map((r) => r.companyId as Id<'stakeholders'>)));

    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));

    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [s!._id, s! as StakeholderDoc]));

    const orderByRequestId = new Map<Id<'requests'>, OrderDoc>();

    for (const r of requests) {
      const order = (await ctx.db
        .query('orders')
        .withIndex('by_requestId', (q) => q.eq('requestId', r._id))
        .first()) as OrderDoc | null;
      if (order) orderByRequestId.set(r._id, order);
    }

    const users = (await ctx.db.query('users').collect()) as UserDoc[];

    const userByEmail = new Map(users.map((u) => [u.email, u]));

    function deriveStage(r: ReqDoc, order: OrderDoc | undefined): string {
      if (order) {
        const status = (order.status || '').toLowerCase();
        if (status.includes('ship') || status.includes('complete') || order.shippedDate) return 'Shipped';
        if (status.includes('pack') || order.packedDate) return 'Packed';
        return 'Order Processing';
      }
      if (r.reviewedBy) return 'Reviewed';
      return 'Submitted';
    }

    function assignedTo(r: ReqDoc, order: OrderDoc | undefined): string | null {
      const email = order?.shippedBy || order?.packedBy || r.reviewedBy || r.requestedBy || null;
      if (!email) return null;
      const u = userByEmail.get(email);
      return u?.name ? `${u.name} (${email})` : email;
    }

    return requests.map((r) => {
      const order = orderByRequestId.get(r._id);
      const stage = deriveStage(r, order);
      const assignee = assignedTo(r, order);
      const stakeholder = stakeholderMap.get(r.companyId as Id<'stakeholders'>);
      return {
        id: r._id,
        requestId: r.requestId,
        company: stakeholder?.companyName || 'Unknown',
        contactName: r.contactName,
        applicationType: r.applicationType,
        products: r.productsRequested?.length || 0,
        status: r.status,
        stage,
        assignedTo: assignee,
        createdAt: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      } as const;
    });
  },
});

export const nextId = query({
  args: {},
  handler: async (ctx) => {
    const prefix = 'REQ-';
    const width = 5;
    const latest = await ctx.db.query('requests').withIndex('by_requestId').order('desc').first();
    let maxNum = 0;
    if (latest && latest.requestId) {
      const m = /^REQ-(\d{5})$/.exec(latest.requestId || '');
      if (m) maxNum = parseInt(m[1], 10);
    }
    const next = maxNum + 1;
    const padded = String(next).padStart(width, '0');
    return `${prefix}${padded}`;
  },
});

export const add = mutation({
  args: {
    userId: v.id('users'),
    requestId: v.string(),
    companyId: v.id('stakeholders'),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    phoneCountryCode: v.optional(v.string()),
    country: v.string(),
    applicationType: v.string(),
    applicationDetail: v.optional(v.string()),
    applicationSubDetail: v.optional(v.string()),
    projectName: v.string(),
    internalReferenceCode: v.optional(v.string()),
    businessBrief: v.string(),
    urgency: v.optional(v.string()),
    processingConditions: v.optional(v.array(v.string())),
    shelfLifeExpectation: v.optional(v.string()),
    formatRequired: v.optional(v.string()),
    legalStatus: v.optional(v.string()),
    certificationsRequired: v.optional(v.string()),
    sampleVolume: v.optional(v.string()),
    sampleVolumeOther: v.optional(v.string()),
    documentsNeeded: v.optional(v.array(v.string())),
    documentsOther: v.optional(v.string()),
    accountType: v.optional(v.string()),
    commercialPotential: v.optional(v.string()),
    internalPriorityLevel: v.optional(v.string()),
    productsRequested: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
    requestedBy: v.string(),
    requestorName: v.optional(v.string()),
    requestorCountry: v.optional(v.string()),
    isCommercialProject: v.optional(v.string()),
    customerType: v.optional(v.string()),
    intendedMarket: v.optional(v.string()),
    numberOfFlavorProfiles: v.optional(v.number()),
    samplingSize: v.optional(v.string()),
    sampleQuantityRequired: v.optional(v.string()),
    customerDeadline: v.optional(v.number()),
    otherComments: v.optional(v.string()),
    companyFullName: v.optional(v.string()),
    companyShortName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requesterUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.requestedBy))
      .unique();
    if (!requesterUser) throw new Error('User not found for requestedBy email');

    let requestId = (args.requestId || '').trim();
    if (!requestId || requestId.toUpperCase() === 'AUTO') {
      const prefix = 'REQ-';
      const width = 5;
      const latest = await ctx.db.query('requests').withIndex('by_requestId').order('desc').first();
      let maxNum = 0;
      if (latest && latest.requestId) {
        const m = /^REQ-(\d{5})$/.exec(latest.requestId || '');
        if (m) maxNum = parseInt(m[1], 10);
      }
      const next = maxNum + 1;
      const padded = String(next).padStart(width, '0');
      requestId = `${prefix}${padded}`;
    }

    const duplicateId = await ctx.db
      .query('requests')
      .withIndex('by_requestId', (q) => q.eq('requestId', requestId))
      .unique();
    if (duplicateId) throw new Error('Request with this ID already exists');

    const dayKey = dayjs().format('YYYYMMDD');
    const sortedProductIds = [...args.productsRequested.map((p) => String(p.productId))].sort();
    const briefKey = sortedProductIds.length === 0 ? (args.businessBrief || '').trim() : '';
    const raw = `${args.companyId}|${sortedProductIds.join(',')}|${briefKey}|${dayKey}`;
    const duplicateHash = await sha256Hex(raw);

    const existingSameDay = await ctx.db
      .query('requests')
      .withIndex('by_duplicateHash', (q) => q.eq('duplicateHash', duplicateHash))
      .first();
    if (existingSameDay && !existingSameDay.deletedAt) {
      throw new Error('Duplicate request (same company & products already submitted today)');
    }

    // Update stakeholder with company name fields if provided
    if (args.companyFullName || args.companyShortName) {
      const stakeholder = await ctx.db.get(args.companyId);
      if (stakeholder) {
        const updateData: Record<string, unknown> = { updatedAt: Date.now() };
        if (args.companyFullName) updateData.companyFullName = args.companyFullName.trim();
        if (args.companyShortName) updateData.companyShortName = args.companyShortName.trim();
        await ctx.db.patch(args.companyId, updateData);
      }
    }

    const now = Date.now();
    const id = await ctx.db.insert('requests', {
      requestId,
      timestamp: now,
      companyId: args.companyId,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      phoneCountryCode: args.phoneCountryCode,
      country: args.country,
      applicationType: args.applicationType,
      applicationDetail: args.applicationDetail,
      applicationSubDetail: args.applicationSubDetail,
      projectName: args.projectName,
      internalReferenceCode: args.internalReferenceCode,
      businessBrief: (args.businessBrief || '').trim(),
      productsRequested: args.productsRequested,
      status: 'Pending Review',
      requestedBy: args.requestedBy,
      requestedByUserId: requesterUser._id,
      urgency: args.urgency,
      processingConditions: args.processingConditions,
      shelfLifeExpectation: args.shelfLifeExpectation,
      formatRequired: args.formatRequired,
      legalStatus: args.legalStatus,
      certificationsRequired: args.certificationsRequired,
      sampleVolume: args.sampleVolume,
      sampleVolumeOther: args.sampleVolumeOther,
      documentsNeeded: args.documentsNeeded,
      documentsOther: args.documentsOther,
      accountType: args.accountType,
      commercialPotential: args.commercialPotential,
      internalPriorityLevel: args.internalPriorityLevel,
      requestorName: args.requestorName,
      requestorCountry: args.requestorCountry,
      isCommercialProject: args.isCommercialProject,
      customerType: args.customerType,
      intendedMarket: args.intendedMarket,
      numberOfFlavorProfiles: args.numberOfFlavorProfiles,
      samplingSize: args.samplingSize,
      sampleQuantityRequired: args.sampleQuantityRequired,
      customerDeadline: args.customerDeadline,
      otherComments: args.otherComments,
      duplicateHash,
      createdAt: now,
      updatedAt: now,
    });
    const user = requesterUser;

    await ctx.db.insert('auditLogs', {
      userId: user._id,
      action: 'addRequest',
      table: 'requests',
      recordId: id,
      changes: { requestId, duplicateHash },
      timestamp: now,
    });

    const allUsers = await ctx.db.query('users').collect();
    const screenerUsers = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')) as { _id: Id<'users'> }[];
    if (screenerUsers.length) {
      await sendInternalNotifications(
        ctx,
        user._id,
        'request.created',
        `New request ${requestId} submitted by ${user.name || user.email}`,
        screenerUsers.map((u) => u._id),
      );
    }

    try {
      const stakeholder = await ctx.db.get(args.companyId);
      const screenerEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')).map((u) => u.email);
      const adminEmails = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('admin')) || u.activeRole === 'admin')).map((u) => u.email);

      const to = uniqEmails([args.email]);
      const cc = uniqEmails([user.email, stakeholder?.salesRepEmail, ...screenerEmails, ...(stakeholder?.vipFlag ? adminEmails : [])]);

      const subject = `VKA Sample Request [${requestId}] Received`;
      const text = `Hello,

We have received your sample request ${requestId} for ${stakeholder?.companyName ?? 'your company'}.

Products:
${args.productsRequested.map((p) => `- ${String(p.productId)} x ${p.quantity}${p.notes ? ` (${p.notes})` : ''}`).join('\n')}

We will notify you once it is reviewed.

Thank you,
VKA`;
      // const html = await renderRequestSubmittedHtml({
      //   requestId,
      //   companyName: stakeholder?.companyName,
      //   products: await Promise.all(
      //     args.productsRequested.map(async (p) => {
      //       const prod = await ctx.db.get(p.productId);
      //       return { name: prod?.productName || String(p.productId), quantity: p.quantity, notes: p.notes };
      //     }),
      //   ),
      // });

      await ctx.runMutation(api.email.sendAndRecordEmail, {
        createdBy: user._id,
        type: 'request.submitted.email',
        from: 'VKA <no-reply@vkaff.com>',
        to,
        cc,
        subject,
        text,
        // html,
        related: { requestId: id, stakeholderId: args.companyId },
      });
    } catch {}

    return { id, requestId } as const;
  },
});

export const suggestions = query({
  args: {},
  handler: async (ctx) => {
    const reqs = await ctx.db.query('requests').collect();

    const applicationTypes = Array.from(new Set(reqs.filter((r) => !r.deletedAt && typeof r.applicationType === 'string' && r.applicationType.trim()).map((r) => r.applicationType.trim()))).sort(
      (a, b) => a.localeCompare(b),
    );

    const projectNames = Array.from(new Set(reqs.filter((r) => !r.deletedAt && typeof r.projectName === 'string' && r.projectName.trim()).map((r) => r.projectName.trim()))).sort((a, b) =>
      a.localeCompare(b),
    );

    return { applicationTypes, projectNames } as const;
  },
});

export const update = mutation({
  args: {
    userId: v.id('users'),
    id: v.id('requests'),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    phoneCountryCode: v.optional(v.string()),
    country: v.string(),
    applicationType: v.string(),
    applicationDetail: v.optional(v.string()),
    applicationSubDetail: v.optional(v.string()),
    projectName: v.string(),
    internalReferenceCode: v.optional(v.string()),
    businessBrief: v.string(),
    urgency: v.optional(v.string()),
    processingConditions: v.optional(v.array(v.string())),
    shelfLifeExpectation: v.optional(v.string()),
    formatRequired: v.optional(v.string()),
    legalStatus: v.optional(v.string()),
    certificationsRequired: v.optional(v.string()),
    sampleVolume: v.optional(v.string()),
    sampleVolumeOther: v.optional(v.string()),
    documentsNeeded: v.optional(v.array(v.string())),
    documentsOther: v.optional(v.string()),
    accountType: v.optional(v.string()),
    commercialPotential: v.optional(v.string()),
    internalPriorityLevel: v.optional(v.string()),
    productsRequested: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
    requestorName: v.optional(v.string()),
    requestorCountry: v.optional(v.string()),
    isCommercialProject: v.optional(v.string()),
    customerType: v.optional(v.string()),
    intendedMarket: v.optional(v.string()),
    numberOfFlavorProfiles: v.optional(v.number()),
    samplingSize: v.optional(v.string()),
    sampleQuantityRequired: v.optional(v.string()),
    customerDeadline: v.optional(v.number()),
    otherComments: v.optional(v.string()),
    companyFullName: v.optional(v.string()),
    companyShortName: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...rest }) => {
    const req = await ctx.db.get(id);

    if (!req || req.deletedAt) throw new Error('Request not found');

    if (req.reviewedBy) throw new Error('Cannot edit a reviewed request');

    const existingOrder = await ctx.db
      .query('orders')
      .withIndex('by_requestId', (q) => q.eq('requestId', id))
      .first();

    if (existingOrder) throw new Error('Cannot edit once order exists');

    // Update stakeholder with company name fields if provided
    if (rest.companyFullName || rest.companyShortName) {
      const stakeholder = await ctx.db.get(req.companyId);
      if (stakeholder) {
        const updateData: Record<string, unknown> = { updatedAt: Date.now() };
        if (rest.companyFullName) updateData.companyFullName = rest.companyFullName.trim();
        if (rest.companyShortName) updateData.companyShortName = rest.companyShortName.trim();
        await ctx.db.patch(req.companyId, updateData);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, companyFullName, companyShortName, ...patchRest } = rest;
    const patch: Record<string, unknown> = { ...patchRest, businessBrief: patchRest.businessBrief.trim(), updatedAt: Date.now() };
    await ctx.db.patch(id, patch);

    const actorUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
      .unique();

    if (!actorUser) throw new Error('No actor user found');

    await ctx.db.insert('auditLogs', {
      userId: actorUser._id,
      action: 'updateRequest',
      table: 'requests',
      recordId: id,
      changes: patchRest,
      timestamp: Date.now(),
    });

    if (req.status.toLowerCase().includes('pending')) {
      const allUsers = await ctx.db.query('users').collect();
      const screeners = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')) as { _id: Id<'users'> }[];
      if (screeners.length) {
        await sendInternalNotifications(
          ctx,
          actorUser._id,
          'request.updated',
          `Request ${req.requestId} updated by ${actorUser.name || actorUser.email}`,
          screeners.map((s) => s._id),
        );
      }
    }
    return { ok: true } as const;
  },
});

export const addProductLine = mutation({
  args: {
    id: v.id('requests'),
    screenerEmail: v.string(),
    line: v.object({ productId: v.id('products'), quantity: v.number(), notes: v.optional(v.string()) }),
    reason: v.string(),
  },
  handler: async (ctx, { id, screenerEmail, line, reason }) => {
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Only pending requests can be edited');
    if (!req.claimedBy || req.claimedBy !== screenerEmail) throw new Error('Only the claiming screener can edit products');
    const now = Date.now();
    const products = [...(req.productsRequested || [])];
    products.push(line);
    const actor = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', screenerEmail))
      .unique();
    const history = [...(req.productChangeHistory || [])];
    history.push({ at: now, by: screenerEmail, byUserId: actor?._id, type: 'add', lineIndex: products.length - 1, to: line, reason });
    await ctx.db.patch(id, { productsRequested: products, productChangeHistory: history, updatedAt: now });
    if (actor) {
      await ctx.db.insert('auditLogs', {
        userId: actor._id,
        action: 'request.products.add',
        table: 'requests',
        recordId: id,
        changes: { to: line, reason },
        timestamp: now,
      });
    }
    return { ok: true } as const;
  },
});

export const editProductLine = mutation({
  args: {
    id: v.id('requests'),
    screenerEmail: v.string(),
    index: v.number(),
    to: v.object({ productId: v.id('products'), quantity: v.number(), notes: v.optional(v.string()) }),
    reason: v.string(),
  },
  handler: async (ctx, { id, screenerEmail, index, to, reason }) => {
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Only pending requests can be edited');
    if (!req.claimedBy || req.claimedBy !== screenerEmail) throw new Error('Only the claiming screener can edit products');
    if (index < 0 || index >= (req.productsRequested || []).length) throw new Error('Invalid product line');
    const now = Date.now();
    const products = [...(req.productsRequested || [])];
    const from = products[index];
    products[index] = to;
    const actor = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', screenerEmail))
      .unique();
    const history = [...(req.productChangeHistory || [])];
    history.push({ at: now, by: screenerEmail, byUserId: actor?._id, type: 'edit', lineIndex: index, from, to, reason });
    await ctx.db.patch(id, { productsRequested: products, productChangeHistory: history, updatedAt: now });
    if (actor) {
      await ctx.db.insert('auditLogs', {
        userId: actor._id,
        action: 'request.products.edit',
        table: 'requests',
        recordId: id,
        changes: { index, from, to, reason },
        timestamp: now,
      });
    }
    return { ok: true } as const;
  },
});

export const removeProductLine = mutation({
  args: {
    id: v.id('requests'),
    screenerEmail: v.string(),
    index: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, { id, screenerEmail, index, reason }) => {
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (!req.status.toLowerCase().includes('pending')) throw new Error('Only pending requests can be edited');
    if (!req.claimedBy || req.claimedBy !== screenerEmail) throw new Error('Only the claiming screener can edit products');
    if (index < 0 || index >= (req.productsRequested || []).length) throw new Error('Invalid product line');
    const now = Date.now();
    const products = [...(req.productsRequested || [])];
    const from = products[index];
    products.splice(index, 1);
    const actor = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', screenerEmail))
      .unique();
    const history = [...(req.productChangeHistory || [])];
    history.push({ at: now, by: screenerEmail, byUserId: actor?._id, type: 'remove', lineIndex: index, from, reason });
    await ctx.db.patch(id, { productsRequested: products, productChangeHistory: history, updatedAt: now });
    if (actor) {
      await ctx.db.insert('auditLogs', {
        userId: actor._id,
        action: 'request.products.remove',
        table: 'requests',
        recordId: id,
        changes: { index, from, reason },
        timestamp: now,
      });
    }
    return { ok: true } as const;
  },
});

export const setBusinessBrief = mutation({
  args: { userId: v.id('users'), id: v.id('requests'), businessBrief: v.string() },
  handler: async (ctx, { userId, id, businessBrief }) => {
    const r = await ctx.db.get(id);
    if (!r || r.deletedAt) throw new Error('Request not found');
    const now = Date.now();
    await ctx.db.patch(id, { businessBrief: businessBrief.trim() || undefined, updatedAt: now });
    await ctx.db.insert('auditLogs', {
      userId,
      action: 'setBusinessBrief',
      table: 'requests',
      recordId: id,
      changes: { businessBrief: businessBrief.trim() },
      timestamp: now,
    });
    return { ok: true } as const;
  },
});

export const getOne = query({
  args: { id: v.id('requests') },
  handler: async (ctx, { id }) => {
    const r = await ctx.db.get(id);
    if (!r || r.deletedAt) return null;
    return r;
  },
});

export const remove = mutation({
  args: { userId: v.id('users'), id: v.id('requests') },
  handler: async (ctx, { id }) => {
    const req = await ctx.db.get(id);
    if (!req || req.deletedAt) throw new Error('Request not found');
    if (req.reviewedBy) throw new Error('Cannot delete a reviewed request');

    const existingOrder = await ctx.db
      .query('orders')
      .withIndex('by_requestId', (q) => q.eq('requestId', id))
      .first();
    if (existingOrder) throw new Error('Cannot delete once order exists');

    const now = Date.now();
    await ctx.db.patch(id, { deletedAt: now });

    const actorUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', req.requestedBy))
      .unique();
    if (!actorUser) throw new Error('No actor user found');

    await ctx.db.insert('auditLogs', {
      userId: actorUser._id,
      action: 'deleteRequest',
      table: 'requests',
      recordId: id,
      changes: { deletedAt: now },
      timestamp: now,
    });

    if (req.status.toLowerCase().includes('pending')) {
      const allUsers = await ctx.db.query('users').collect();
      const screeners = allUsers.filter((u) => !u.deletedAt && u.active && ((u.roles && u.roles.includes('screener')) || u.activeRole === 'screener')) as { _id: Id<'users'> }[];
      if (screeners.length) {
        await sendInternalNotifications(
          ctx,
          actorUser._id,
          'request.deleted',
          `Request ${req.requestId} deleted by ${actorUser.name || actorUser.email}`,
          screeners.map((s) => s._id),
        );
      }
    }
    return { ok: true } as const;
  },
});

export const orderSummary = query({
  args: { requestId: v.id('requests') },
  handler: async (ctx, { requestId }) => {
    const order = await ctx.db
      .query('orders')
      .withIndex('by_requestId', (q) => q.eq('requestId', requestId))
      .first();
    if (!order || order.deletedAt) return null;
    return {
      id: order._id,
      orderId: order.orderId,
      status: order.status,
      packedDate: order.packedDate,
      shippedDate: order.shippedDate,
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
      updatedAt: order.updatedAt,
    } as const;
  },
});

export const my = query({
  args: { email: v.optional(v.string()), userId: v.optional(v.id('users')), limit: v.optional(v.number()) },
  handler: async (ctx, { email, userId, limit }) => {
    const cap = Math.min(limit ?? 200, 500);
    let items: ReqDoc[] = [];
    if (userId) {
      items = (await ctx.db
        .query('requests')
        .withIndex('by_requestedByUserId', (q) => q.eq('requestedByUserId', userId))
        .order('desc')
        .collect()) as ReqDoc[];
    } else if (email) {
      items = (await ctx.db
        .query('requests')
        .withIndex('by_requestedBy', (q) => q.eq('requestedBy', email))
        .order('desc')
        .collect()) as ReqDoc[];
    }
    const trimmed = items.filter((r) => !r.deletedAt).slice(0, cap) as ReqDoc[];

    const orders = await Promise.all(
      trimmed.map((r) =>
        ctx.db
          .query('orders')
          .withIndex('by_requestId', (q) => q.eq('requestId', r._id))
          .first(),
      ),
    );
    const orderByRequestId = new Map<Id<'requests'>, OrderDoc>();
    trimmed.forEach((r, i) => {
      const o = orders[i] as OrderDoc | null;
      if (o) orderByRequestId.set(r._id, o);
    });

    const stakeholderIds = Array.from(new Set(trimmed.map((r) => r.companyId as Id<'stakeholders'>)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [s!._id, s! as StakeholderDoc]));

    const users = (await ctx.db.query('users').collect()) as UserDoc[];
    const userByEmail = new Map(users.map((u) => [u.email, u]));

    function deriveStage(r: ReqDoc, order: OrderDoc | undefined): string {
      if (order) {
        const status = (order.status || '').toLowerCase();
        if (status.includes('ship') || status.includes('complete') || order.shippedDate) return 'Shipped';
        if (status.includes('pack') || order.packedDate) return 'Packed';
        return 'Order Processing';
      }
      if (r.reviewedBy) return 'Reviewed';
      return 'Submitted';
    }

    function assignedTo(r: ReqDoc, order: OrderDoc | undefined): string | null {
      const email = order?.shippedBy || order?.packedBy || r.reviewedBy || r.requestedBy || null;
      if (!email) return null;
      const u = userByEmail.get(email);
      return u?.name ? `${u.name} (${email})` : email;
    }

    return trimmed.map((r) => {
      const order = orderByRequestId.get(r._id);
      const stage = deriveStage(r, order);
      const assignee = assignedTo(r, order);
      const stakeholder = stakeholderMap.get(r.companyId as Id<'stakeholders'>);
      return {
        id: r._id,
        requestId: r.requestId,
        company: stakeholder?.companyName || 'Unknown',
        contactName: r.contactName,
        applicationType: r.applicationType,
        products: r.productsRequested?.length || 0,
        status: r.status,
        stage,
        assignedTo: assignee,
        createdAt: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      } as const;
    });
  },
});

export const myHistory = query({
  args: { email: v.optional(v.string()), userId: v.optional(v.id('users')), limit: v.optional(v.number()) },
  handler: async (ctx, { email, userId, limit }) => {
    const cap = Math.min(limit ?? 500, 1000);
    let reqs: ReqDoc[] = [];
    if (userId) {
      reqs = (await ctx.db
        .query('requests')
        .withIndex('by_requestedByUserId', (q) => q.eq('requestedByUserId', userId))
        .order('desc')
        .collect()) as ReqDoc[];
    } else if (email) {
      reqs = (await ctx.db
        .query('requests')
        .withIndex('by_requestedBy', (q) => q.eq('requestedBy', email))
        .order('desc')
        .collect()) as ReqDoc[];
    }
    const relevant = reqs.filter((r) => !r.deletedAt).slice(0, cap) as ReqDoc[];

    const requestIds = relevant.map((r) => r._id as Id<'requests'>);

    const ordersByReqId: Record<string, OrderDoc> = {};
    for (const id of requestIds) {
      const o = (await ctx.db
        .query('orders')
        .withIndex('by_requestId', (q) => q.eq('requestId', id))
        .first()) as OrderDoc | null;
      if (o && !o.deletedAt) ordersByReqId[String(id)] = o;
    }

    const stakeholderIds = Array.from(new Set(relevant.map((r) => r.companyId as Id<'stakeholders'>)));
    const stakeholders = await Promise.all(stakeholderIds.map((id) => ctx.db.get(id)));
    const stakeholderMap = new Map(stakeholders.filter(Boolean).map((s) => [s!._id, s! as StakeholderDoc]));

    function deriveStage(r: ReqDoc, order: OrderDoc | undefined): string {
      if (order) {
        const status = (order.status || '').toLowerCase();
        if (status.includes('ship') || status.includes('complete') || order.shippedDate) return 'Shipped';
        if (status.includes('pack') || order.packedDate) return 'Packed';
        return 'Order Processing';
      }
      if (r.reviewedBy) return 'Reviewed';
      return 'Submitted';
    }

    return relevant.map((r) => {
      const o = ordersByReqId[String(r._id)];
      const stage = deriveStage(r, o);
      const stakeholder = stakeholderMap.get(r.companyId as Id<'stakeholders'>);
      return {
        requestId: r.requestId,
        status: r.status,
        createdAt: r.createdAt,
        reviewDate: r.reviewDate,
        packedDate: o?.packedDate,
        shippedDate: o?.shippedDate,
        id: r._id,
        company: stakeholder?.companyName || 'Unknown',
        stage,
      } as const;
    });
  },
});

export const timeline = query({
  args: { id: v.id('requests') },
  handler: async (ctx, { id }) => {
    const req = await ctx.db.get(id);
    if (!req) return [];
    const order = await ctx.db
      .query('orders')
      .withIndex('by_requestId', (q) => q.eq('requestId', id))
      .first();

    const events: Array<{ ts: number; type: string; actor?: string; details?: unknown }> = [];

    events.push({ ts: req.createdAt, type: 'request.created', actor: req.requestedBy, details: { requestId: req.requestId } });
    if (req.infoRequestedAt) events.push({ ts: req.infoRequestedAt, type: 'request.infoRequested', actor: req.infoRequestedBy, details: { message: req.infoRequestMessage } });
    if (req.infoResponseAt) events.push({ ts: req.infoResponseAt, type: 'request.infoResponded', actor: req.requestedBy, details: { message: req.infoResponseMessage } });
    if (req.reviewDate) {
      const typ = req.status.toLowerCase() === 'approved' ? 'request.approved' : req.status.toLowerCase() === 'rejected' ? 'request.rejected' : 'request.reviewed';
      events.push({ ts: req.reviewDate, type: typ, actor: req.reviewedBy, details: { rejectionReason: req.rejectionReason } });
    }
    if (order) {
      if (order.packedDate) events.push({ ts: order.packedDate, type: 'order.packed', actor: order.packedBy, details: { orderId: order.orderId } });
      if (order.shippedDate) events.push({ ts: order.shippedDate, type: 'order.shipped', actor: order.shippedBy, details: { carrier: order.carrier, trackingNumber: order.trackingNumber } });
    }

    const audits = await ctx.db
      .query('auditLogs')
      .withIndex('by_table', (q) => q.eq('table', 'requests'))
      .collect();
    const auditsOrders = await ctx.db
      .query('auditLogs')
      .withIndex('by_table', (q) => q.eq('table', 'orders'))
      .collect();
    const allAudit = [...audits, ...auditsOrders].filter((a) => a.recordId === String(id) || a.changes?.requestId === id);

    const userIds = Array.from(new Set(allAudit.map((a) => a.userId))).filter(Boolean) as Id<'users'>[];
    const users = await Promise.all(userIds.map((uid) => ctx.db.get(uid)));
    const userDisplayById = new Map<string, string>();
    users.forEach((u, i) => {
      if (!u) return;
      const key = String(userIds[i]);
      userDisplayById.set(key, u.email);
    });

    for (const a of allAudit) {
      const actorReadable = userDisplayById.get(String(a.userId)) || String(a.userId);
      events.push({ ts: a.timestamp, type: `audit.${a.action}`, actor: actorReadable, details: a.changes });
    }

    events.sort((a, b) => a.ts - b.ts);
    return events;
  },
});
