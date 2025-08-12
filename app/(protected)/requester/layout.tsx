import { SiteHeader } from '@/components/site-header';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="container mx-auto flex-1 p-2 space-y-8">{children}</main>
    </div>
  );
}
