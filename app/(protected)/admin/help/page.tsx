export default function HelpPage() {
  const sections = [
    {
      id: 'dashboard-overview',
      title: 'Dashboard Overview',
      content: (
        <>
          <p className="mb-4">After login as an Admin you land on the Dashboard. It presents high‑level operational metrics so you can immediately assess platform health.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>Users</strong>: Total registered users and number currently active.
            </li>
            <li>
              <strong>Stakeholders</strong>: Total stakeholder entities with VIP count.
            </li>
            <li>
              <strong>Products</strong>: Total products plus aggregate request count.
            </li>
            <li>
              <strong>Orders</strong>: Total orders with how many are still open.
            </li>
            <li>
              <strong>Pending Requests</strong>: Items awaiting screening / action.
            </li>
            <li>
              <strong>Audit Logs</strong>: Total recorded change events.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Each card updates in real time (Convex reactive queries). Use the metrics to prioritize workload (e.g. spikes in Pending Requests).</p>
        </>
      ),
    },
    {
      id: 'recent-requests',
      title: 'Recent Requests Table',
      content: (
        <>
          <p className="mb-3 text-sm">Shows the latest submissions and their progression. Columns include identifiers and operational fields for quick triage.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>ID</strong>: System generated <code className="font-mono">requestId</code>.
            </li>
            <li>
              <strong>Company / Contact</strong>: Source stakeholder & contact person.
            </li>
            <li>
              <strong>Type</strong>: Application or request category.
            </li>
            <li>
              <strong>Products</strong>: Count of line items.
            </li>
            <li>
              <strong>Status</strong>: Overall business status (see Status Codes).
            </li>
            <li>
              <strong>Stage</strong>: Processing pipeline stage (screening, packing, shipping, etc.).
            </li>
            <li>
              <strong>Assigned To</strong>: Responsible user or Unassigned.
            </li>
            <li>
              <strong>Created</strong>: Submission timestamp (localized).
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Spinner icon appears while data is loading (<code className="font-mono">IconReload</code>). Empty state clarifies absence of recent records.
          </p>
        </>
      ),
    },
    {
      id: 'audit-logs',
      title: 'Audit Logs Panel',
      content: (
        <>
          <p className="mb-3 text-sm">Displays the most recent change events for transparency and traceability.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>Action</strong>: Verb describing the change (CREATE / UPDATE / DELETE / ASSIGN etc.).
            </li>
            <li>
              <strong>User</strong>: Actor who performed the action.
            </li>
            <li>
              <strong>Table</strong>: Domain entity affected (e.g. Product, Request, User).
            </li>
            <li>
              <strong>Record ID</strong>: Specific record identifier (monospaced when shown).
            </li>
            <li>
              <strong>Timestamp</strong>: Localized date/time of the event.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Use Audit Logs to investigate data anomalies or confirm policy compliance.</p>
        </>
      ),
    },
    {
      id: 'distributions',
      title: 'Distribution Cards',
      content: (
        <>
          <p className="mb-3 text-sm">Below the primary panels you will find distribution summaries to highlight concentration patterns.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>Users by Role</strong>: Top roles with counts.
            </li>
            <li>
              <strong>Products by Category</strong>: Leading product categories.
            </li>
            <li>
              <strong>Requests by Status</strong>: Most frequent current statuses.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Only top N (default 3) entries are shown for quick scanning; expand functionality can be added later if needed.</p>
        </>
      ),
    },
    {
      id: 'request-lifecycle',
      title: 'Request Lifecycle',
      content: (
        <>
          <ol className="list-decimal pl-6 space-y-1 mb-4 text-sm">
            <li>
              <strong>Submission</strong>: Requester submits with required metadata.
            </li>
            <li>
              <strong>Screening</strong>: Screener validates completeness & compliance.
            </li>
            <li>
              <strong>Packing</strong>: Packer prepares items; exceptions noted.
            </li>
            <li>
              <strong>Shipping</strong>: Shipper assigns carrier & tracking.
            </li>
            <li>
              <strong>Closure</strong>: Status updated to Completed / Delivered / Rejected.
            </li>
          </ol>
          <p className="text-sm text-muted-foreground">
            Stages map to the <code className="font-mono">stage</code> column allowing granular tracking separate from high level status.
          </p>
        </>
      ),
    },
    {
      id: 'status-codes',
      title: 'Status Codes & Badges',
      content: (
        <>
          <p className="mb-3 text-sm">
            Badges visually encode progress or risk. Color mapping (via <code className="font-mono">StatusPill</code>) is centralized and heuristic:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>Outline</strong>: Pending variants (e.g. Pending Review).
            </li>
            <li>
              <strong>Default (Primary)</strong>: Positive flow (Approved, Open).
            </li>
            <li>
              <strong>Destructive</strong>: Failure or termination (Rejected, Canceled, Error).
            </li>
            <li>
              <strong>Secondary</strong>: Neutral / informational states.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Add new statuses by extending logic inside the badge function ensuring consistent visual semantics.</p>
        </>
      ),
    },
    {
      id: 'admin-tasks',
      title: 'Daily Admin Task Checklist',
      content: (
        <>
          <ol className="list-decimal pl-6 space-y-1 mb-4 text-sm">
            <li>Review Pending Requests count; drill into bottlenecks.</li>
            <li>Scan Recent Requests for aging or unassigned items.</li>
            <li>Check Audit Logs for unexpected actions.</li>
            <li>Monitor distributions for unusual spikes (e.g. surge in a single status).</li>
            <li>Perform user / stakeholder maintenance (add / disable as required).</li>
            <li>Export data or escalate anomalies to stakeholders.</li>
          </ol>
          <p className="text-sm text-muted-foreground">Keep cycle times low by addressing unassigned and pending items early.</p>
        </>
      ),
    },
    {
      id: 'faq',
      title: 'FAQ',
      content: (
        <>
          <details className="mb-3 border rounded p-3 bg-card">
            <summary className="cursor-pointer font-medium">A metric shows “—”. Why?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              The underlying query has not returned yet (loading) or there is no data. Confirm network connectivity; then verify data exists in Convex.
            </p>
          </details>
          <details className="mb-3 border rounded p-3 bg-card">
            <summary className="cursor-pointer font-medium">Why are counts different from analytics exports?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Dashboard metrics are real-time snapshots; exports may be point-in-time or filtered. Re-run export after ensuring no in-flight changes.
            </p>
          </details>
          <details className="mb-3 border rounded p-3 bg-card">
            <summary className="cursor-pointer font-medium">How to investigate a suspicious change?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Locate the record, cross-reference its ID in Audit Logs, identify actor, and validate the action sequence. Escalate if policy breach suspected.
            </p>
          </details>
        </>
      ),
    },
    {
      id: 'support',
      title: 'Support & Feedback',
      content: (
        <>
          <p className="mb-2 text-sm">Report issues with timestamp, request ID, and screenshot of console (if error). This accelerates triage.</p>
          <p className="text-sm text-muted-foreground">Feature suggestions: summarize use case, impacted roles, and expected ROI.</p>
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6">
      <main className="flex-1 min-w-0">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Help & Reference</h1>
          <p className="text-muted-foreground">Operational guide for administering the Fulfillment System.</p>
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
        <footer className="mt-16 pt-8 border-t text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()} · Send feedback to docs@example.com</footer>
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
