# VKA Sample Fulfillment Operations Platform

An internal operations app for sample and order fulfillment: requests come in, move through screening, packing and shipping, and every change is logged and reported by email. Built with Next.js, a Convex backend and React Email templates.

**Status:** In progress. The request workflow, role-based dashboards, audit logs, product and stakeholder management, and email templates are all in the code, but the first-admin route has no access check, and there are no tests.

## The problem

Sample and order requests pass through several hands: the requester asks, a screener checks them, a packer prepares the items and a shipper sends them. This app tracks each request through those steps and tells the people involved what happened.

## What it does

- Role-based areas under `app/(protected)/`: admin, requester, screener, packer and shipper, each with its own dashboard, profile and help page.
- Request lifecycle: create a request with product lines and a business brief, screen it, and follow its timeline (`convex/request.ts`, `app/(protected)/admin/[requestId]/`).
- Admin tools for users (invite users), products, stakeholders, analytics and audit logs (`convex/user.ts`, `convex/audit.ts`).
- Email notifications built with React Email for submitted, approved, rejected, more-info-requested and order-ready events, plus an invitation email (`emails/`).
- Google sign-in through `providers/gauth.tsx`, with users linked by `googleId` in `convex/auth.ts`.

## How it's built

- Next.js App Router with TypeScript and Tailwind CSS v4. UI components are shadcn-style files in `components/ui/`.
- Convex is the backend: schema in `convex/schema.ts`, queries and mutations per domain (`request`, `user`, `product`, `stakeholder`, `screener`, `packer`, `shipper`, `analytics`), HTTP routes in `convex/http.ts`, and scheduled jobs in `convex/crons.ts`.
- Each role has its own layout under `app/(protected)/`.
- Email goes through Resend (`convex/resend.ts`, `convex/email.ts`), and the templates in `emails/` are previewed with `email dev`.
- `app/api/admin-register/route.ts` is a Next.js route that calls the `createFirstAdmin` mutation.

## Running it locally

```bash
pnpm install
# set NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL
pnpm dev:server   # npx convex dev
pnpm dev          # next dev --turbopack
pnpm dev:email    # preview the email templates
```

Other scripts: `build`, `start` and `lint`.

## What's left

- `POST /api/admin-register` creates the first admin with no secret or signed-in check. The mutation only refuses when a user already exists, so whoever calls it first on an empty database becomes admin. This must be locked down before any real deployment.
- There are no automated tests for the Convex functions or the workflow.
- The README has no deployment steps.
