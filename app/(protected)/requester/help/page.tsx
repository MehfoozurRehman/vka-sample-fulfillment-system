export default function HelpPage() {
  const sections = [
    {
      id: 'overview',
      title: 'Requester Portal Overview',
      content: (
        <>
          <p className="mb-4 text-sm">
            This area lets you submit and monitor fulfillment requests. The main dashboard shows KPI cards (Stats), a submission button, a trend chart, and the Requests table.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>Stats</strong>: Quick numeric summaries of your recent requests (counts by status / totals).
            </li>
            <li>
              <strong>Add Request</strong>: Opens a dialog to create a new request with product line items.
            </li>
            <li>
              <strong>Chart</strong>: Visual trend (e.g. requests over time or by status) to spot spikes.
            </li>
            <li>
              <strong>Requests Table</strong>: Paginated / reactive list of your submitted items with current status & stage.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">All data updates in real time via Convex reactive queries; you seldom need to refresh.</p>
        </>
      ),
    },
    {
      id: 'creating-request',
      title: 'Creating a New Request',
      content: (
        <>
          <ol className="list-decimal pl-6 space-y-1 mb-4 text-sm">
            <li>
              Click <strong>New Request</strong> (Add Request button).
            </li>
            <li>Fill required metadata (title / stakeholder / type as applicable).</li>
            <li>Add one or more product line items (select product, quantity, notes).</li>
            <li>Review the summary; correct any validation errors (highlighted fields).</li>
            <li>
              Submit. The request appears immediately in the table with initial status (e.g. <em>Pending Screening</em>).
            </li>
          </ol>
          <p className="text-sm text-muted-foreground">If you close the dialog before submitting, data is discarded. Draft saving can be added later.</p>
        </>
      ),
    },
    {
      id: 'stats-cards',
      title: 'Stats Cards',
      content: (
        <>
          <p className="mb-3 text-sm">Cards highlight essential counts so you can gauge workload & progress quickly.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>Total Requests</strong>: All requests you have submitted (limit window may apply).
            </li>
            <li>
              <strong>Open / In Progress</strong>: Items not yet completed or rejected.
            </li>
            <li>
              <strong>Completed</strong>: Fulfilled / shipped / closed items.
            </li>
            <li>
              <strong>Rejected / Canceled</strong>: Items that will not proceed further.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Use changes over time (compare mentally with yesterday) to detect unusual surges.</p>
        </>
      ),
    },
    {
      id: 'chart',
      title: 'Chart Interpretation',
      content: (
        <>
          <p className="mb-3 text-sm">The chart visualizes temporal or categorical distribution (implementation dependent) of your recent requests.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>Bars / Lines</strong>: Count of requests grouped by day/week or status.
            </li>
            <li>
              <strong>Hover Tooltips</strong>: Exact counts for precise inspection.
            </li>
            <li>
              <strong>Color Coding</strong>: Each status/state uses consistent palette matching badges in the table.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Use it to time submissions or identify bottlenecks (e.g. many stuck in screening).</p>
        </>
      ),
    },
    {
      id: 'requests-table',
      title: 'Requests Table Columns',
      content: (
        <>
          <p className="mb-3 text-sm">Primary list where you track individual request progress.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>ID</strong>: Unique short identifier – click (if enabled) to open full details.
            </li>
            <li>
              <strong>Created</strong>: Submission timestamp (localized).
            </li>
            <li>
              <strong>Products</strong>: Count of line items included.
            </li>
            <li>
              <strong>Status</strong>: Business outcome stage (Pending, Approved, Rejected, Completed, etc.).
            </li>
            <li>
              <strong>Stage</strong>: Operational pipeline phase (Screening → Packing → Shipping).
            </li>
            <li>
              <strong>Assignee</strong>: Current internal user handling next step (may be blank early).
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Use sorting / filters (if present) to narrow large sets. Empty state clarifies absence of data.</p>
        </>
      ),
    },
    {
      id: 'status-vs-stage',
      title: 'Status vs Stage',
      content: (
        <>
          <p className="mb-3 text-sm">Status communicates overall outcome; Stage communicates current processing step.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>
              <strong>Statuses</strong>: Pending, Approved, Rejected, Completed, Canceled (may vary).
            </li>
            <li>
              <strong>Stages</strong>: Screening, Packing, Shipping, Closed.
            </li>
            <li>
              <strong>Example</strong>: A request can have Status = Approved while Stage = Packing.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">This separation enables tracking progress after approval but before fulfillment completion.</p>
        </>
      ),
    },
    {
      id: 'editing',
      title: 'Editing or Canceling Requests',
      content: (
        <>
          <p className="mb-3 text-sm">Edits are typically allowed only before processing advances.</p>
          <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
            <li>Minor metadata corrections: Update fields while Status still Pending.</li>
            <li>Line item change: Remove & add product entries prior to Packing.</li>
            <li>Cancel: If no longer needed; appears in table with Canceled status.</li>
          </ul>
          <p className="text-sm text-muted-foreground">If edit controls are disabled, contact an Admin with the request ID.</p>
        </>
      ),
    },
    {
      id: 'faq',
      title: 'FAQ',
      content: (
        <>
          <details className="mb-3 border rounded p-3 bg-card">
            <summary className="cursor-pointer font-medium">Why don&#39;t I see my new request?</summary>
            <p className="mt-2 text-sm text-muted-foreground">
              Real-time sync may be briefly delayed or local network hiccup. Wait a few seconds; if still missing, re-submit (duplicate detection will prevent double counting) or contact support.
            </p>
          </details>
          <details className="mb-3 border rounded p-3 bg-card">
            <summary className="cursor-pointer font-medium">Can I add more products after submission?</summary>
            <p className="mt-2 text-sm text-muted-foreground">Yes while in Screening stage (if edit UI exposed). After that, request an Admin adjustment or create a supplemental request.</p>
          </details>
          <details className="mb-3 border rounded p-3 bg-card">
            <summary className="cursor-pointer font-medium">Status says Approved but no shipment info?</summary>
            <p className="mt-2 text-sm text-muted-foreground">It is progressing through Packing / Shipping stages. Shipment tracking populates once carrier is assigned.</p>
          </details>
        </>
      ),
    },
    {
      id: 'support',
      title: 'Support & Feedback',
      content: (
        <>
          <p className="mb-2 text-sm">Provide request ID, observed issue, and screenshot if reporting a defect.</p>
          <p className="text-sm text-muted-foreground">Enhancement ideas: describe problem, desired outcome, and urgency.</p>
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6">
      <main className="flex-1 min-w-0">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Requester Help & Guide</h1>
          <p className="text-muted-foreground">Instructions for submitting and tracking fulfillment requests.</p>
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
        <footer className="mt-16 pt-8 border-t text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()} · Need help? support@example.com</footer>
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
