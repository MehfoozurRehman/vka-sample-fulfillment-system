'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function HelpPage() {
  return (
    <div className="p-6 max-w-4xl space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Screener Help & Guide</h1>
        <p className="text-muted-foreground text-sm">How to use the screening workspace to review and process incoming sample requests.</p>
      </header>

      <Section title="1. Overview" desc="High‑level purpose of the Screener workspace">
        <p>
          The Screener dashboard centralizes all <strong>pending sample requests</strong> that require an approval or rejection decision. It provides:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
          <li>Real‑time counts and aging of outstanding requests.</li>
          <li>Historical activity trends (approvals, rejections, still pending).</li>
          <li>Filtering & quick search by request id, company, application type, or project name.</li>
          <li>Detailed request drill‑down with product line items and recent company history.</li>
          <li>Inline actions to <strong>Approve</strong> (creates an order) or <strong>Reject</strong> (requires a reason).</li>
        </ul>
      </Section>

      <Section title="2. KPI Cards" desc="Meaning of the top statistic tiles">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: 'Pending', detail: 'Total number of unreviewed requests currently in the queue.' },
            { label: 'VIP Pending', detail: 'Subset of pending requests associated with VIP stakeholders.' },
            { label: 'Avg Items', detail: 'Average number of product line items across pending requests.' },
            { label: '<24h', detail: 'Requests submitted within the last 24 hours.' },
            { label: '24-48h', detail: 'Requests aging between 24 and 48 hours.' },
            { label: '>48h', detail: 'Requests older than 48 hours (highest urgency).' },
          ].map((c) => (
            <Card key={c.label} className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{c.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <p className="text-sm mt-4">
          Aging buckets (<span className="font-medium">&lt;24h</span>, <span className="font-medium">24–48h</span>, <span className="font-medium">&gt;48h</span>) help prioritize. Focus first on <span className="font-medium">VIP</span> and &gt;48h items.
        </p>
      </Section>

      <Section title="3. Screening Activity Chart" desc="Understanding the stacked daily area & age bar charts">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>Stacked Area</strong>: Relative distribution of Approved, Rejected, and still Pending requests by day (range selectable: 30–120 days).</li>
          <li><strong>Age Bar</strong>: Current snapshot of how many pending requests fall into each aging bucket.</li>
          <li><strong>Approval Rate</strong> (implied): Track approved vs rejected to monitor quality and throughput.</li>
        </ul>
      </Section>

      <Section title="4. Pending Requests Table" desc="Columns & visual cues">
        <div className="text-sm space-y-3">
          <p>Each row represents a single pending request.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Colored dot</strong>: Green (&lt;24h), Amber (24–48h), Red (&gt;48h).</li>
            <li><strong>Request</strong>: Internal request identifier (monospaced for scanability).</li>
            <li><strong>Company</strong>: Name + <Badge variant="destructive" className="align-middle">VIP</Badge> tag if elevated priority.</li>
            <li><strong>Application / Project</strong>: Context for intended use and project grouping.</li>
            <li><strong>Items</strong>: Count of product lines in the request.</li>
            <li><strong>Created</strong>: Submission timestamp (local format) to assess aging.</li>
          </ul>
          <p><strong>Search</strong> filters dynamically across request id, company, application type, and project name.</p>
        </div>
      </Section>

      <Section title="5. Request Drawer" desc="Detailed review & action panel">
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li><strong>Header Block</strong>: Core metadata (company, application, project, submitted time) and VIP highlight.</li>
          <li><strong>Requested Products</strong>: Line items with product id, name, quantity, notes.</li>
          <li><strong>Recent Requests</strong>: Last 5 historical requests from the same company + 12‑month total units for pattern recognition.</li>
          <li><strong>Internal Notes</strong> (optional): Persisted with the approval/rejection for audit trail.</li>
          <li><strong>Rejection Reason</strong> (required for Reject): Must be at least 3 characters; enforces clarity and transparency.</li>
          <li><strong>Actions</strong>:
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><strong>Approve</strong>: Creates an order downstream. Notes are optional.</li>
              <li><strong>Reject</strong>: Requires a reason; notes may add internal context.</li>
            </ul>
          </li>
          <li>All actions are <strong>audit logged</strong> with reviewer identity & timestamps.</li>
        </ol>
      </Section>

      <Section title="6. Best Practices" desc="Operational recommendations">
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Process <strong>VIP</strong> and <strong>&gt;48h</strong> aged requests first each session.</li>
            <li>Use notes to capture rationale if an approval is borderline to aid future audits.</li>
          <li>Reject only when criteria clearly not met; provide a concise and actionable reason.</li>
          <li>Scan the company history panel for volume anomalies before approving large multi‑item requests.</li>
          <li>Maintain consistent terminology in rejection reasons (e.g. &ldquo;Incomplete application data&rdquo; vs varied phrasing).</li>
        </ul>
      </Section>

      <Section title="7. FAQ" desc="Common questions">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium">Why can&apos;t I click Approve/Reject?</dt>
            <dd className="text-muted-foreground mt-1">The system is still loading details or the rejection reason is missing / too short.</dd>
          </div>
          <div>
            <dt className="font-medium">Where is the approval logged?</dt>
            <dd className="text-muted-foreground mt-1">All actions are captured in the audit log with your user identity, timestamp, and metadata.</dd>
          </div>
          <div>
            <dt className="font-medium">How is VIP determined?</dt>
            <dd className="text-muted-foreground mt-1">The stakeholder record includes a vipFlag; when true the request row and drawer are visually emphasized.</dd>
          </div>
        </dl>
      </Section>

      <footer className="text-[11px] text-muted-foreground">
        Need more help? Contact the platform team or open an internal ticket referencing the request id.
      </footer>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-1 max-w-prose">{desc}</p>}
      </div>
      <div className="space-y-3 leading-relaxed">{children}</div>
      <Separator className="my-2" />
    </section>
  );
}
