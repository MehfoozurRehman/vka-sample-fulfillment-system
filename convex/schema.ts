import { defineSchema, defineTable } from 'convex/server';

import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    googleId: v.optional(v.string()),
    designation: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.string(),
    role: v.string(),
    active: v.boolean(),
    profilePicture: v.optional(v.string()),
    lastLogin: v.optional(v.number()),
    invitedByUser: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  stakeholders: defineTable({
    companyName: v.string(),
    salesRepEmail: v.string(),
    accountManagerEmail: v.string(),
    complianceOfficerEmail: v.string(),
    vipFlag: v.boolean(),
    createdBy: v.optional(v.id('users')),
    updatedBy: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  }).index('by_companyName', ['companyName']),

  products: defineTable({
    productId: v.string(),
    productName: v.string(),
    category: v.string(),
    location: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_productId', ['productId'])
    .index('by_productName', ['productName']),

  requests: defineTable({
    requestId: v.string(),
    timestamp: v.number(),
    companyId: v.id('stakeholders'),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    applicationType: v.string(),
    projectName: v.string(),
    productsRequested: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
    status: v.string(),
    requestedBy: v.string(),
    reviewedBy: v.optional(v.string()),
    reviewDate: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_status', ['status', 'createdAt'])
    .index('by_companyId', ['companyId'])
    .index('by_email', ['email']),

  orders: defineTable({
    orderId: v.string(),
    requestId: v.id('requests'),
    status: v.string(),
    packedBy: v.optional(v.string()),
    packedDate: v.optional(v.number()),
    lotNumbers: v.optional(v.string()),
    documentsConfirmed: v.boolean(),
    shippedBy: v.optional(v.string()),
    shippedDate: v.optional(v.number()),
    carrier: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_status', ['status', 'createdAt'])
    .index('by_requestId', ['requestId']),

  auditLogs: defineTable({
    userId: v.id('users'),
    action: v.string(),
    table: v.string(),
    recordId: v.string(),
    changes: v.any(),
    timestamp: v.number(),
  }).index('by_user', ['userId', 'timestamp']),

  notifications: defineTable({
    userId: v.id('users'),
    createdBy: v.id('users'),
    type: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index('by_user', ['userId', 'createdAt']),

  notificationPreferences: defineTable({
    userId: v.id('users'),
    type: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number(),
  })
    .index('by_user_type', ['userId', 'type'])
    .index('by_user', ['userId']),
});
