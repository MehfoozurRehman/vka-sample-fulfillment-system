import { defineSchema, defineTable } from 'convex/server';

import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    googleId: v.optional(v.string()),
    designation: v.optional(v.string()),
    name: v.optional(v.string()),
    email: v.string(),
    roles: v.array(v.string()),
    activeRole: v.string(),
    active: v.boolean(),
    profilePicture: v.optional(v.string()),
    lastLogin: v.optional(v.number()),
    invitedByUser: v.optional(v.id('users')),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_activeRole', ['activeRole'])
    .index('by_googleId', ['googleId'])
    .index('by_createdAt', ['createdAt']),

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
  })
    .index('by_companyName', ['companyName'])
    .index('by_createdAt', ['createdAt'])
    .index('by_vipFlag', ['vipFlag']),

  products: defineTable({
    productId: v.string(),
    productName: v.string(),
    category: v.string(),
    location: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_productId', ['productId'])
    .index('by_productName', ['productName'])
    .index('by_createdAt', ['createdAt']),

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
    businessBrief: v.optional(v.string()),
    status: v.string(),
    requestedBy: v.string(),
    reviewedBy: v.optional(v.string()),
    reviewDate: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    duplicateHash: v.optional(v.string()),
    infoRequestedBy: v.optional(v.string()),
    infoRequestedAt: v.optional(v.number()),
    infoRequestMessage: v.optional(v.string()),
    infoResponseAt: v.optional(v.number()),
    infoResponseMessage: v.optional(v.string()),
    productChangeHistory: v.optional(
      v.array(
        v.object({
          at: v.number(),
          by: v.string(),
          type: v.string(),
          lineIndex: v.number(),
          from: v.optional(v.object({ productId: v.id('products'), quantity: v.number(), notes: v.optional(v.string()) })),
          to: v.optional(v.object({ productId: v.id('products'), quantity: v.number(), notes: v.optional(v.string()) })),
          reason: v.string(),
        }),
      ),
    ),
    claimedBy: v.optional(v.string()),
    claimedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_status', ['status', 'createdAt'])
    .index('by_companyId', ['companyId'])
    .index('by_email', ['email'])
    .index('by_requestId', ['requestId'])
    .index('by_createdAt', ['createdAt'])
    .index('by_company_status', ['companyId', 'status'])
    .index('by_duplicateHash', ['duplicateHash'])
    .index('by_requestedBy', ['requestedBy'])
    .index('by_reviewedBy', ['reviewedBy']),

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
    pickedCorrect: v.optional(v.boolean()),
    coaIncluded: v.optional(v.boolean()),
    sdsIncluded: v.optional(v.boolean()),
    specsIncluded: v.optional(v.boolean()),
    labelsApplied: v.optional(v.boolean()),
    packingListIncluded: v.optional(v.boolean()),
    packageCount: v.optional(v.number()),
    totalWeight: v.optional(v.number()),
    serviceLevel: v.optional(v.string()),
    internationalDocsIncluded: v.optional(v.boolean()),
    shippedEmailSent: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index('by_status', ['status', 'createdAt'])
    .index('by_requestId', ['requestId'])
    .index('by_createdAt', ['createdAt'])
    .index('by_requestId_status', ['requestId', 'status'])
    .index('by_packedBy', ['packedBy'])
    .index('by_shippedBy', ['shippedBy']),

  auditLogs: defineTable({
    userId: v.id('users'),
    action: v.string(),
    table: v.string(),
    recordId: v.string(),
    changes: v.any(),
    timestamp: v.number(),
  })
    .index('by_user', ['userId', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
    .index('by_table', ['table'])
    .index('by_action', ['action']),

  notifications: defineTable({
    userId: v.id('users'),
    createdBy: v.id('users'),
    type: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId', 'createdAt'])
    .index('by_user_read', ['userId', 'read'])
    .index('by_createdAt', ['createdAt']),

  notificationPreferences: defineTable({
    userId: v.id('users'),
    type: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number(),
  })
    .index('by_user_type', ['userId', 'type'])
    .index('by_user', ['userId'])
    .index('by_createdAt', ['updatedAt']),

  emails: defineTable({
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
    headers: v.optional(
      v.array(
        v.object({
          name: v.string(),
          value: v.string(),
        }),
      ),
    ),
    status: v.string(),
    resendId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    opened: v.optional(v.boolean()),
    complained: v.optional(v.boolean()),
    attemptCount: v.number(),
    nextAttemptAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    finalizedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    related: v.optional(
      v.object({
        requestId: v.optional(v.id('requests')),
        orderId: v.optional(v.id('orders')),
        stakeholderId: v.optional(v.id('stakeholders')),
      }),
    ),
    metadata: v.optional(v.any()),
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_status', ['status', 'createdAt'])
    .index('by_resendId', ['resendId'])
    .index('by_type', ['type'])
    .index('by_createdBy', ['createdBy'])
    .index('by_nextAttemptAt', ['nextAttemptAt']),
});
