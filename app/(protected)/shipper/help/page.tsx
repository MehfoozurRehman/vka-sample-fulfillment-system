const sections = [
  {
    id: 'overview',
    title: 'Shipper Workspace Overview',
    content: (
      <>
        <p className="mb-4 text-sm">This workspace surfaces orders ready for shipment and tools to record tracking, carriers, and shipment confirmations.</p>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li>
            <strong>Ready to Ship</strong>: Orders that completed packing and await carrier assignment.
          </li>
          <li>
            <strong>In Transit</strong>: Orders that have a tracking number and carrier assigned.
          </li>
          <li>
            <strong>Shipping Exceptions</strong>: Orders with missing documents, address problems, or other issues.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'process-shipment',
    title: 'Process a Shipment',
    content: (
      <>
        <ol className="list-decimal pl-6 space-y-1 mb-4 text-sm">
          <li>Select the order and verify packed items and package count.</li>
          <li>Confirm documents included (COA, SDS, specs) per carrier requirements.</li>
          <li>
            Enter carrier and tracking number and set status to <em>Shipped</em>.
          </li>
          <li>Optionally send the shipped notification to the requester (checkbox available).</li>
        </ol>
        <p className="text-sm text-muted-foreground">If you encounter missing documents, flag the order in Shipping Exceptions and contact the packing team.</p>
      </>
    ),
  },
  {
    id: 'tracking',
    title: 'Tracking & Notifications',
    content: (
      <>
        <p className="mb-3 text-sm">Once shipped, add the carrier and tracking number to enable requester notifications and analytics.</p>
        <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
          <li>Adding tracking toggles email notifications if the order is configured to notify on shipment.</li>
          <li>Use the tracking field to paste carrier URLs or tracking IDs; the UI will render a link when possible.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'exceptions',
    title: 'Handling Exceptions',
    content: (
      <>
        <p className="mb-3 text-sm">Common exceptions include missing documents, incorrect package counts, and carrier rejections.</p>
        <ol className="list-decimal pl-6 space-y-1 mb-4 text-sm">
          <li>Flag the order as an exception and select a reason from the dropdown.</li>
          <li>Add internal notes for the packer or admin team and assign for resolution.</li>
          <li>Do not mark as Shipped until the exception is resolved.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'faq',
    title: 'FAQ',
    content: (
      <>
        <details className="mb-3 border rounded p-3 bg-card">
          <summary className="cursor-pointer font-medium">What if the carrier refuses the shipment?</summary>
          <p className="mt-2 text-sm text-muted-foreground">Flag as exception, add notes, and contact Operations. Do not mark the order as Shipped.</p>
        </details>
        <details className="mb-3 border rounded p-3 bg-card">
          <summary className="cursor-pointer font-medium">Can I edit a tracking number after marking Shipped?</summary>
          <p className="mt-2 text-sm text-muted-foreground">Yes — edit the order details and update the tracking. An updated notification may be sent depending on configuration.</p>
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
          Report shipping issues with order ID, timestamp, and screenshots of any carrier errors. Contact <code className="font-mono">support@your-org.example</code>.
        </p>
      </>
    ),
  },
];

export default function HelpPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6">
      <main className="flex-1 min-w-0">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Shipper Help & Guide</h1>
          <p className="text-muted-foreground">How to process shipments and manage exceptions.</p>
        </header>
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                {section.title}
                <a href={`#${section.id}`} className="text-xs font-normal text-muted-foreground hover:underline">
                  #
                </a>
              </h2>
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">{section.content}</div>
            </section>
          ))}
        </div>
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
