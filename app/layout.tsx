import './globals.css';

import { ConvexClientProvider } from '@/providers/convex';
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Suspense } from 'react';
import { ThemeProvider } from '@/providers/theme';
import { Toaster } from '@/components/ui/sonner';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'VK Fulfillment System',
  description: 'VK Fulfillment System Admin Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} antialiased`}>
        {/* <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}> */}
        <ConvexClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <NuqsAdapter>{children}</NuqsAdapter>
            <Toaster />
          </ThemeProvider>
        </ConvexClientProvider>
        {/* </Suspense> */}
      </body>
    </html>
  );
}
