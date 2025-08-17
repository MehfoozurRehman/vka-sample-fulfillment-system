export const dynamic = 'force-static';

const sections = [
  {
    id: 'overview',
    title: 'Packer Workspace Overview',
    content: (
      <>
        <p className="mb-4 text-sm">The Packer workspace shows orders ready to be packed and guides you through packing checks and recording lot numbers and package counts.</p>
      </>
    ),
  },
  {
    id: 'packing-checks',
    title: 'Packing Checks',
    content: (
      <>
        <ul className="list-disc pl-6 space-y-1 text-sm mb-4">
          <li>Verify product quantities and line items against the request.</li>
          <li>Confirm COA / SDS / specification sheets are included when required.</li>
          <li>Record lot numbers and package counts in the packing form.</li>
        </ul>
        <p className="text-sm text-muted-foreground">If discrepancies are found, add internal notes and mark the order for review instead of marking as Packed.</p>
      </>
    ),
  },
  {
    id: 'confirm-packing',
    title: 'Confirm Packing',
    content: (
      <>
        <ol className="list-decimal pl-6 space-y-1 mb-4 text-sm">
          <li>Open the order and review requested vs packed quantities.</li>
          <li>Enter lot numbers and package/media details.</li>
          <li>Mark as Packed; this makes the order available to Shipper.</li>
          <li>If documentation is missing, flag and add notes for Admin follow-up.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'exceptions',
    title: 'Packing Exceptions',
    content: (
      <>
        <p className="mb-3 text-sm">Handle issues such as incorrect counts, damaged items, or missing documents by flagging the order and adding an explanatory note.</p>
        <p className="text-sm text-muted-foreground">Orders with exceptions will not proceed to shipping until resolved.</p>
      </>
    ),
  },
  {
    id: 'support',
    title: 'Support',
    content: (
      <>
        <p className="mb-2 text-sm">
          Report packing problems with order ID, a short description, and photos if relevant. Contact <code className="font-mono">support@your-org.example</code>.
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
          <h1 className="text-3xl font-bold tracking-tight mb-2">Packer Help & Guide</h1>
          <p className="text-muted-foreground">Instructions for packing, documenting, and flagging orders.</p>
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
