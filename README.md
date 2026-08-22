# VKA Sample Fulfillment Operations Platform

An enterprise order fulfillment and warehouse tracking system built with Next.js App Router, Convex backend, React Email, and Tailwind CSS v4.

## Overview

`vka-sample-fulfillment-system` manages end-to-end sample intake, processing workflows, inventory data tables (TanStack Table), order analytics (Recharts), automated customer emails via React Email & Resend, and real-time backend updates with Convex.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Backend & Database**: [Convex](https://convex.dev/) (`convex`, `convex-helpers`)
- **Email Delivery**: React Email (`@react-email/components`), `@convex-dev/resend`
- **Data Tables & Charts**: TanStack Table v8, Recharts v3
- **UI & Animation**: Radix UI Primitives, Lucide Icons, Framer Motion (`motion`), `vaul`, `sonner`
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)

## Prerequisites

- Node.js (v20 or higher recommended)
- Package manager (`pnpm` recommended)
- Convex backend account and Resend API key

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_CONVEX_URL="your-convex-deployment-url"
   RESEND_API_KEY="your-resend-api-key"
   ```

3. **Start the Convex Backend**:
   ```bash
   pnpm dev:server
   ```

4. **Run the Next.js Development Server**:
   ```bash
   pnpm dev
   ```

5. **Access the Application**:
   Open `http://localhost:3000` in your web browser.

## Available Scripts

- `pnpm dev` - Starts the Next.js frontend with Turbopack.
- `pnpm dev:server` - Launches the local Convex real-time backend engine.
- `pnpm dev:email` - Opens the React Email template preview server.
- `pnpm build` - Compiles production bundles.
- `pnpm start` - Runs the production server.
- `pnpm format` - Formats the codebase with Prettier.

## Author

Created by [Mehfooz-ur-Rehman](https://github.com/MehfoozurRehman).
