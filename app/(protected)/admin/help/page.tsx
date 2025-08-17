export const dynamic = 'force-static';

const sections = [
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    content: (
      <>
        <p className="mb-4">After signing in as an Admin you land on the Dashboard. It presents live operational summaries so you can quickly understand platform health and priorities.</p>
        <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
          <li>
            <strong>Users</strong>: Total registered users and recent active users.
          </li>
          <li>
            <strong>Stakeholders</strong>: Registered companies and VIP counts.
          </li>
          <li>
            <strong>Products</strong>: Total product count and top categories.
          </li>
          <li>
            <strong>Orders</strong>: Total orders and how many are in progress.
          </li>
          <li>
            <strong>Pending Requests</strong>: Immediate queue of requests needing attention.
          </li>
          <li>
            <strong>Audit Logs</strong>: Recent recorded actions for quick traceability.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">Use the cards to prioritise work — for example, click Pending Requests to open the requests list filtered to items requiring action.</p>
      </>
    ),
  },
  {
    id: 'recent-requests',
    title: 'Recent Requests Table',
    content: (
      <>
        <p className="mb-3 text-sm">Shows the latest submissions and their progression. Use this table to triage, assign, and act on requests.</p>
        <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
          <li>
            <strong>ID</strong>: System generated <code className="font-mono">requestId</code>.
          </li>
          <li>
            <strong>Company / Contact</strong>: Resolved from <code className="font-mono">companyId</code> (references <code className="font-mono">stakeholders</code>) and the contact fields on the
            request.
          </li>
          <li>
            <strong>Type</strong>: Application or request category.
          </li>
          <li>
            <strong>Products</strong>: Items under <code className="font-mono">productsRequested</code> (each line references a product id in <code className="font-mono">products</code> plus a
            quantity).
          </li>
          <li>
            <strong>Status</strong>: Overall business status (see Status Codes).
          </li>
          <li>
            <strong>Stage</strong>: Processing pipeline stage (screening, packing, shipping, etc.).
          </li>
          <li>
            <strong>Assigned To</strong>: Responsible user (may show <code className="font-mono">claimedByUserId</code> or <code className="font-mono">requestedByUserId</code> depending on context).
          </li>
          <li>
            <strong>Created</strong>: Submission timestamp (localized, stored in <code className="font-mono">createdAt</code>).
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Actions available from each row include Claim, Review, Request Info, and Create Order (when applicable). Use the filters at the top of the table (status, stakeholder, date) to narrow the
          list.
        </p>
      </>
    ),
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs Panel',
    content: (
      <>
        <p className="mb-3 text-sm">Displays recent change events. Use Audit Logs to confirm who performed an action and when it occurred.</p>
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
        <p className="text-sm text-muted-foreground">
          Tip: filter by user or table to focus your investigation. If you need assistance interpreting a log entry, capture the timestamp and record ID and contact support.
        </p>
      </>
    ),
  },
  {
    id: 'distributions',
    title: 'Distribution Cards',
    content: (
      <>
        <p className="mb-3 text-sm">Below the primary panels are distribution summaries showing quick breakdowns across key dimensions to highlight concentration patterns.</p>
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
        <p className="text-sm text-muted-foreground">
          Only a short list (top items) is shown here for quick scanning; use the dedicated pages under <code className="font-mono">/admin</code> if you need full lists or exports.
        </p>
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
          The lifecycle maps to the visible status and assigned users shown on the request details screen. Use the request timeline to see when it moved between stages and who acted on it.
        </p>
      </>
    ),
  },
  {
    id: 'status-codes',
    title: 'Status Codes & Badges',
    content: (
      <>
        <p className="mb-3 text-sm">Badges encode progress or risk and are shown next to status fields across the app.</p>
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
        <p className="text-sm text-muted-foreground">
          Common statuses you will see include: <code className="font-mono">Pending</code>, <code className="font-mono">InfoRequested</code>, <code className="font-mono">UnderReview</code>,{' '}
          <code className="font-mono">Approved</code>, <code className="font-mono">Rejected</code>, <code className="font-mono">Claimed</code>, <code className="font-mono">Packed</code>, and{' '}
          <code className="font-mono">Shipped</code>. Hover or consult the status legend if you need clarification on a badge.
        </p>
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
        <p className="text-sm text-muted-foreground">
          Keep cycle times low by addressing unassigned and pending items early. Use the admin pages (Users, Stakeholders, Requests) to perform maintenance actions.
        </p>
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
            Either the data is still loading, or there is no data to display. Try refreshing the page; if the value still shows a dash, collect the timestamp and contact support with the page you were
            on.
          </p>
        </details>
        <details className="mb-3 border rounded p-3 bg-card">
          <summary className="cursor-pointer font-medium">Why are counts different from analytics exports?</summary>
          <p className="mt-2 text-sm text-muted-foreground">Dashboard metrics are real-time snapshots; exports may be point-in-time or filtered. Re-run export after ensuring no in-flight changes.</p>
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
        <p className="mb-2 text-sm">
          When reporting an issue include: the page URL, your role, the timestamp, and any relevant request or order ID. Attach a screenshot of the UI and any visible error messages. This helps
          support reproduce and triage faster.
        </p>
        <p className="text-sm text-muted-foreground">
          Feature requests: explain the problem, the role(s) affected, and how the change would help. Send support requests and feedback to <code className="font-mono">support@your-org.example</code>.
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
