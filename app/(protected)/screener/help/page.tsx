export const dynamic = 'force-static';

const sections = [
  {
    id: 'overview',
    title: 'Screener Workspace Overview',
    content: (
      <>
        <p className="mb-4 text-sm">
          The Screener dashboard centralizes pending requests that require review. Use it to validate submissions, apply approvals or rejections, and capture review notes.
        </p>
        <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
          <li>Real-time counts and aging for outstanding requests.</li>
          <li>Filters and search by request id, company, application type, or project.</li>
          <li>Drill-down to request details with product lines and company history.</li>
          <li>Inline actions to Approve (creates an order) or Reject (requires a reason).</li>
        </ul>
      </>
    ),
  },
  {
    id: 'kpis',
    title: 'KPI Cards & Aging',
    content: (
      <>
        <p className="mb-3 text-sm">Top tiles show priority signals such as Pending count, VIP pending, and aging buckets (&lt;24h, 24–48h, &gt;48h).</p>
        <p className="text-sm text-muted-foreground">Prioritise VIP and &gt;48h items first, and use the KPI tiles to pick a focused worklist for your session.</p>
      </>
    ),
  },
  {
    id: 'activity-charts',
    title: 'Activity Charts',
    content: (
      <>
        <p className="mb-3 text-sm">Charts visualize approval/rejection trends and current age distribution so you can monitor throughput and detect spikes.</p>
      </>
    ),
  },
  {
    id: 'pending-table',
    title: 'Pending Requests Table',
    content: (
      <>
        <p className="mb-3 text-sm">Each row is a request; key columns are Request ID, Company (VIP flagged), Items, Created, Status, and Assignee.</p>
        <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
          <li>Use search and filters to narrow by company, age, or status.</li>
          <li>Click a row to open the Request Drawer for review and actions.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'request-drawer',
    title: 'Request Drawer (Review Panel)',
    content: (
      <>
        <p className="mb-3 text-sm">The drawer shows full metadata, requested products, recent company activity, and internal notes. From here you can Approve or Reject the request.</p>
        <ol className="list-decimal pl-6 space-y-1 text-sm mb-4">
          <li>Review line items and any attachments.</li>
          <li>Use the company history to assess repeat requests or volumes.</li>
          <li>Provide a concise rejection reason when rejecting (required).</li>
          <li>Approvals create an order and move the request to the packing queue.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    content: (
      <>
        <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
          <li>Process VIP and &gt;48h aged requests first.</li>
          <li>Leave clear internal notes on borderline approvals.</li>
          <li>Require specific rejection reasons to help requesters improve submissions.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'faq',
    title: 'FAQ',
    content: (
      <>
        <details className="mb-3 border rounded p-3 bg-card">
          <summary className="cursor-pointer font-medium">Why can&apos;t I click Approve/Reject?</summary>
          <p className="mt-2 text-sm text-muted-foreground">
            The page may still be loading details or a required field (for example rejection reason) is missing. Wait briefly and try again, or capture the request ID and contact support.
          </p>
        </details>
        <details className="mb-3 border rounded p-3 bg-card">
          <summary className="cursor-pointer font-medium">Where is the approval recorded?</summary>
          <p className="mt-2 text-sm text-muted-foreground">All reviewer actions are audit logged with user identity and timestamps; include the request ID when raising a query.</p>
        </details>
      </>
    ),
  },
  {
    id: 'support',
    title: 'Support',
    content: (
      <>
        <p className="mb-2 text-sm">
          If you need help include the request id, the page you were on, and a short description. Contact <code className="font-mono">support@your-org.example</code>.
        </p>
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6">
      <main className="flex-1 min-w-0">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Screener Help & Guide</h1>
          <p className="text-muted-foreground text-sm">How to use the screening workspace to review and process incoming sample requests.</p>
        </header>
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                {section.title}
                <a href={`#${section.id}`} className="text-xs font-normal text-muted-foreground hover:underline">
                  #
                </a>
              </h2>
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">{section.content}</div>
            </section>
          ))}
        </div>
        <footer className="mt-16 pt-8 border-t text-xs text-muted-foreground">Last updated: {new Date().toISOString().slice(0, 10)} · Support: support@your-org.example</footer>
      </main>
      <aside className="lg:w-64 lg:sticky lg:top-20 h-fit border rounded-md p-4 bg-card/50 backdrop-blur order-first lg:order-none">
        <h2 className="text-sm font-semibold mb-2 tracking-wide">Contents</h2>
        <nav className="space-y-1 text-sm">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground transition">
              {s.title}
            </a>
          ))}
        </nav>
      </aside>
    </div>
  );
}
