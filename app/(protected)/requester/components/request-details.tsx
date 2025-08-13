'use client';

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { InputWithSuggestions } from '@/components/ui/input-with-suggestions';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
import { countries } from '@/constants';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-user';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMutation } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';

dayjs.extend(relativeTime);

interface ProductListItem {
  id: Id<'products'>;
  productId: string;
  productName: string;
  category: string;
  location: string;
  createdAt: number;
  updatedAt: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: { id: Id<'requests'>; requestId: string; status: string; stage: string; company: string } | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[160px_1fr] gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{label}</span>
      <div className="text-sm leading-relaxed break-words break-all">{children}</div>
    </div>
  );
}

export function RequestDetailsDrawer({ open, onOpenChange, row }: Props) {
  const { data: request } = useQueryWithStatus(api.request.getOne, row ? { id: row.id } : 'skip');

  const auth = useAuth();

  const { data: suggestions } = useQueryWithStatus(api.request.suggestions);

  const { data: products } = useQueryWithStatus(api.product.list, {});

  const { data: order } = useQueryWithStatus(api.request.orderSummary, row ? { requestId: row.id } : 'skip');

  const productMap = useMemo(() => {
    if (!products) return new Map<Id<'products'>, ProductListItem>();

    return new Map(products.map((p: ProductListItem) => [p.id, p]));
  }, [products]);

  const update = useMutation(api.request.update);

  const remove = useMutation(api.request.remove);

  const respondInfo = useMutation(api.screener.respondInfo);

  const isDraft = row && row.status === 'Pending Review' && row.stage === 'Submitted';

  const [editing, setEditing] = useState(false);

  const infoRequestData: InfoRequestData | null = request
    ? {
        status: request.status,
        infoRequestedAt: request.infoRequestedAt,
        infoRequestedBy: request.infoRequestedBy,
        infoRequestMessage: request.infoRequestMessage,
        infoResponseAt: request.infoResponseAt,
        infoResponseMessage: request.infoResponseMessage,
      }
    : null;

  const [form, setForm] = useState({
    contactName: '',
    email: '',
    phone: '',
    country: '',
    applicationType: '',
    projectName: '',
    productsRequested: [] as { productId: Id<'products'>; quantity: number; notes?: string }[],
  });

  type ProductLine = { productId: Id<'products'> | null; quantity: number | ''; notes?: string; productDisplay: string };
  const [productLines, setProductLines] = useState<ProductLine[]>([]);

  useEffect(() => {
    if (request) {
      const pr = (request.productsRequested as { productId: Id<'products'>; quantity: number; notes?: string }[]) || [];

      setForm({
        contactName: request.contactName || '',
        email: request.email || '',
        phone: request.phone || '',
        country: request.country || '',
        applicationType: request.applicationType || '',
        projectName: request.projectName || '',
        productsRequested: pr,
      });
      setProductLines(
        pr.map((p) => {
          const prod = productMap.get(p.productId as Id<'products'>);

          return {
            productId: p.productId,
            quantity: p.quantity,
            notes: p.notes,
            productDisplay: prod ? `${prod.productId} - ${prod.productName}` : '',
          };
        }),
      );
    } else if (!open) {
      setEditing(false);
    }
  }, [request, open, productMap]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      productsRequested: productLines
        .filter((l) => !!l.productId && l.quantity !== '' && l.quantity > 0)
        .map((l) => ({ productId: l.productId as Id<'products'>, quantity: l.quantity as number, notes: l.notes || undefined })),
    }));
  }, [productLines]);

  async function onSave() {
    if (!row) return;
    if (!form.contactName.trim()) return toast.error('Contact name required');

    if (!form.email.trim()) return toast.error('Email required');

    if (!form.country.trim()) return toast.error('Country required');

    if (!form.applicationType.trim()) return toast.error('Application type required');

    if (!form.projectName.trim()) return toast.error('Project name required');

    if (!productLines.length) return toast.error('Add at least one product');

    const invalid = productLines.some((l) => !l.productId || l.quantity === '' || l.quantity <= 0);

    if (invalid) return toast.error('Each product line must have a product and quantity > 0');

    await update({ userId: auth.id, id: row.id, ...form });

    setEditing(false);

    toast.success('Request updated');
  }

  async function onDelete() {
    if (!row) return;
    if (!confirm('Delete this draft request?')) return;
    await remove({ userId: auth.id, id: row.id });
    onOpenChange(false);
  }

  function updateField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const isMobile = useIsMobile();

  if (!row) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerContent className="max-h-[100vh]">
        <DrawerHeader>
          <DrawerTitle>{row.requestId}</DrawerTitle>
          <DrawerDescription className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary" className="capitalize">
              {row.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {row.stage}
            </Badge>
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto space-y-4">
          {!editing && (
            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-4 space-y-5">
                <Row label="Company">{row.company}</Row>
                <Row label="Contact">{request?.contactName || <span className="text-muted-foreground">—</span>}</Row>
                <Row label="Email">{request?.email || <span className="text-muted-foreground">—</span>}</Row>
                <Row label="Phone">{request?.phone || <span className="text-muted-foreground">—</span>}</Row>
                <Row label="Country">{request?.country || <span className="text-muted-foreground">—</span>}</Row>
                <Row label="Application Type">{request?.applicationType || <span className="text-muted-foreground">—</span>}</Row>
                <Row label="Project Name">{request?.projectName || <span className="text-muted-foreground">—</span>}</Row>
                <Row label="Submitted">
                  {request ? <span title={dayjs(request.createdAt).format('MMM D, YYYY HH:mm')}>{dayjs(request.createdAt).fromNow()}</span> : <span className="text-muted-foreground">—</span>}
                </Row>
                <Row label="Last Updated">
                  {request ? (
                    <span title={dayjs(request.updatedAt).format('MMM D, YYYY HH:mm')}>{request.updatedAt === request.createdAt ? '—' : dayjs(request.updatedAt).fromNow()}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Row>
              </div>

              {request && (request.reviewedBy || request.reviewDate || request.reviewNotes || request.rejectionReason) && (
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <h4 className="text-sm font-semibold tracking-tight">Review</h4>
                  <div className="space-y-3">
                    <Row label="Reviewer">{request.reviewedBy || <span className="text-muted-foreground">—</span>}</Row>
                    <Row label="Review Date">
                      {request.reviewDate ? (
                        <span title={dayjs(request.reviewDate).format('MMM D, YYYY HH:mm')}>{dayjs(request.reviewDate).fromNow()}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Row>
                    {request.reviewNotes && <Row label="Review Notes">{request.reviewNotes}</Row>}
                    {request.rejectionReason && (
                      <Row label="Rejection Reason">
                        <span className="text-destructive whitespace-pre-wrap">{request.rejectionReason}</span>
                      </Row>
                    )}
                  </div>
                </div>
              )}

              {infoRequestData && (infoRequestData.infoRequestedAt || infoRequestData.infoRequestMessage) && (
                <InfoRequestPanel
                  request={infoRequestData}
                  showRespondForm={infoRequestData.status === 'Pending Info' && !infoRequestData.infoResponseAt}
                  onRespond={async (message: string) => {
                    await respondInfo({ id: row.id, requesterEmail: auth.email, message });
                    toast.success('Information sent. Request back in review queue.');
                  }}
                />
              )}

              {order && (
                <div className="rounded-lg border bg-card p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold tracking-tight">Order Summary</h4>
                    <Badge variant="outline" className="text-xs font-normal capitalize">
                      {order.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>Order ID: {order.orderId}</div>
                    {order.packedDate && <div>Packed: {dayjs(order.packedDate).format('MMM D, YYYY HH:mm')}</div>}
                    {order.shippedDate && <div>Shipped: {dayjs(order.shippedDate).format('MMM D, YYYY HH:mm')}</div>}
                    {order.carrier && <div>Carrier: {order.carrier}</div>}
                    {order.trackingNumber && <div>Tracking: {order.trackingNumber}</div>}
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold tracking-tight">Products Requested</h4>
                  <Badge variant="outline" className="text-xs font-normal">
                    {request?.productsRequested?.length || 0}
                  </Badge>
                </div>
                {(!request?.productsRequested || request.productsRequested.length === 0) && <div className="text-sm text-muted-foreground">No products requested.</div>}
                {request?.productsRequested && request.productsRequested.length > 0 && (
                  <ul className="divide-y rounded-md border bg-background">
                    {request.productsRequested.map((p: { productId: Id<'products'>; quantity: number; notes?: string }, i: number) => {
                      const prod = productMap.get(p.productId as Id<'products'>);

                      return (
                        <li key={i} className="p-3 flex flex-col gap-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{prod ? `${prod.productName} (${prod.productId})` : 'Loading...'}</span>
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Qty: {p.quantity}</span>
                            {prod && <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{prod.category}</span>}
                            {prod && <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{prod.location}</span>}
                          </div>
                          {p.notes && <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{p.notes}</p>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {editing && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Contact Name</Label>
                  <Input value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Email</Label>
                  <Input value={form.email} type="email" onChange={(e) => updateField('email', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Phone</Label>
                  <Input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Country</Label>
                  <InputWithSuggestions value={form.country} onValueChange={(v) => updateField('country', v)} options={countries} placeholder="Select country" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Application Type</Label>
                  <InputWithSuggestions
                    value={form.applicationType}
                    onValueChange={(v) => updateField('applicationType', v)}
                    options={suggestions?.applicationTypes || []}
                    placeholder="Select or type"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Project Name</Label>
                  <InputWithSuggestions value={form.projectName} onValueChange={(v) => updateField('projectName', v)} options={suggestions?.projectNames || []} placeholder="Select or type" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium text-sm">Products</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setProductLines((prev) => [...prev, { productId: null, quantity: 1, notes: '', productDisplay: '' }])}>
                    Add Product
                  </Button>
                </div>
                <div className="flex flex-col gap-4">
                  {productLines.map((line, idx) => {
                    const otherSelected = productLines
                      .filter((_, i) => i !== idx)
                      .map((l) => l.productDisplay)
                      .filter(Boolean);

                    const allOptions = (products || []).map((p: ProductListItem) => `${p.productId} - ${p.productName}`);

                    const filteredOptions = allOptions.filter((o) => !otherSelected.includes(o) || o === line.productDisplay);

                    return (
                      <div key={idx} className="grid gap-2 md:grid-cols-4 p-3 border rounded-md">
                        <div className="md:col-span-2">
                          <InputWithSuggestions
                            value={line.productDisplay}
                            onValueChange={(v) => {
                              if (otherSelected.includes(v)) return;
                              setProductLines((prev) =>
                                prev.map((l, i) => {
                                  if (i !== idx) return l;
                                  const found = products?.find((p: ProductListItem) => `${p.productId} - ${p.productName}` === v);

                                  return {
                                    ...l,
                                    productDisplay: v,
                                    productId: found ? (found.id as Id<'products'>) : null,
                                  };
                                }),
                              );
                            }}
                            options={filteredOptions}
                            placeholder="Select product"
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity === '' ? '' : line.quantity}
                            onChange={(e) => {
                              const raw = e.target.value;

                              const qty = raw === '' ? '' : parseInt(raw, 10);

                              setProductLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: qty } : l)));
                            }}
                          />
                        </div>
                        <div>
                          <Textarea
                            value={line.notes || ''}
                            placeholder="Notes"
                            className="resize-none h-10"
                            onChange={(e) => setProductLines((prev) => prev.map((l, i) => (i === idx ? { ...l, notes: e.target.value } : l)))}
                          />
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => setProductLines((prev) => prev.filter((_, i) => i !== idx))}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {!productLines.length && <div className="text-xs text-muted-foreground">No products.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
        <DrawerFooter className="border-t">
          {!editing && (
            <div className="flex w-full justify-between gap-2">
              <div className="flex gap-2">
                {isDraft && (
                  <Button size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                )}
                {isDraft && (
                  <Button size="sm" variant="destructive" onClick={onDelete}>
                    Delete
                  </Button>
                )}
              </div>
              <DrawerClose asChild>
                <Button variant="outline" size="sm">
                  Close
                </Button>
              </DrawerClose>
            </div>
          )}
          {editing && (
            <div className="flex w-full justify-between gap-2">
              <div className="flex gap-2">
                <Button size="sm" onClick={onSave}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="sm">
                  Close
                </Button>
              </DrawerClose>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

interface InfoRequestData {
  status: string;
  infoRequestedAt?: number;
  infoRequestedBy?: string;
  infoRequestMessage?: string;
  infoResponseAt?: number;
  infoResponseMessage?: string;
}

function InfoRequestPanel({ request, onRespond, showRespondForm }: { request: InfoRequestData; onRespond: (message: string) => Promise<void>; showRespondForm?: boolean }) {
  const [msg, setMsg] = useState('');

  const [sending, setSending] = useState(false);

  const canSend = msg.trim().length >= 5;

  const statusLabel = request.status === 'Pending Info' && !request.infoResponseAt ? 'Pending Info' : 'Info Provided';

  return (
    <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-sm font-semibold tracking-tight flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" /> Additional Information Request
        </h4>
        <Badge variant="outline" className="text-[10px] font-normal">
          {statusLabel}
        </Badge>
      </div>
      <div className="space-y-2 text-xs leading-relaxed">
        <div className="text-muted-foreground">Requested at: {request.infoRequestedAt ? dayjs(request.infoRequestedAt).format('MMM D, YYYY HH:mm') : '—'}</div>
        {request.infoRequestedBy && <div className="text-muted-foreground">Requested by: {request.infoRequestedBy}</div>}
        {request.infoRequestMessage && <div className="rounded-md bg-white/60 dark:bg-background/40 border p-3 text-[12px] whitespace-pre-wrap">{request.infoRequestMessage}</div>}
      </div>
      {request.infoResponseAt && (
        <div className="space-y-2 text-xs leading-relaxed">
          <div className="text-muted-foreground">Responded at: {dayjs(request.infoResponseAt).format('MMM D, YYYY HH:mm')}</div>
          {request.infoResponseMessage && <div className="rounded-md bg-background/50 dark:bg-background/40 border p-3 text-[12px] whitespace-pre-wrap">{request.infoResponseMessage}</div>}
        </div>
      )}
      {showRespondForm && !request.infoResponseAt && (
        <div className="space-y-2">
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Provide the requested details (min 5 characters)" className="resize-none h-28" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">{canSend ? 'Ready to send' : 'Enter at least 5 characters'}</span>
            <Button
              size="sm"
              disabled={!canSend || sending}
              onClick={async () => {
                if (!canSend) return;
                setSending(true);

                try {
                  await onRespond(msg.trim());
                  setMsg('');
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? 'Sending...' : 'Send Info'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
