'use client';

import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { RecentRequestsType } from '../type';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: (RecentRequestsType[number] & { id: Id<'requests'> }) | null;
}

export function RequestDetailsDrawer({ open, onOpenChange, row }: Props) {
  const request = useQuery(api.request.getOne, row ? { id: row.id } : 'skip');
  const update = useMutation(api.request.update);
  const remove = useMutation(api.request.remove);

  const isDraft = row && row.status === 'Pending Review' && row.stage === 'Submitted';

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    contactName: '',
    email: '',
    phone: '',
    country: '',
    applicationType: '',
    projectName: '',
    productsRequested: [] as { productId: Id<'products'>; quantity: number; notes?: string }[],
  });

  useEffect(() => {
    if (request) {
      setForm({
        contactName: request.contactName || '',
        email: request.email || '',
        phone: request.phone || '',
        country: request.country || '',
        applicationType: request.applicationType || '',
        projectName: request.projectName || '',
        productsRequested: (request.productsRequested as { productId: Id<'products'>; quantity: number; notes?: string }[]) || [],
      });
    } else if (!open) {
      setEditing(false);
    }
  }, [request, open]);

  async function onSave() {
    if (!row) return;
    await update({ id: row.id, ...form });
    setEditing(false);
  }

  async function onDelete() {
    if (!row) return;
    if (!confirm('Delete this draft request?')) return;
    await remove({ id: row.id });
    onOpenChange(false);
  }

  function updateField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  if (!row) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
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
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Company:</span> {row.company}
              </div>
              <div>
                <span className="font-medium">Contact:</span> {request?.contactName}
              </div>
              <div>
                <span className="font-medium">Email:</span> {request?.email}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {request?.phone}
              </div>
              <div>
                <span className="font-medium">Country:</span> {request?.country}
              </div>
              <div>
                <span className="font-medium">Application Type:</span> {request?.applicationType}
              </div>
              <div>
                <span className="font-medium">Project Name:</span> {request?.projectName}
              </div>
              <div>
                <span className="font-medium">Products Requested:</span>
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  {request?.productsRequested?.map((p: { productId: Id<'products'>; quantity: number; notes?: string }, i: number) => (
                    <li key={i} className="flex flex-col">
                      <span>Product: {String(p.productId)}</span>
                      <span>Qty: {p.quantity}</span>
                      {p.notes && <span className="text-muted-foreground">Notes: {p.notes}</span>}
                    </li>
                  ))}
                  {!request?.productsRequested?.length && <li className="text-muted-foreground">None</li>}
                </ul>
              </div>
              <div>
                <span className="font-medium">Created:</span> {row.createdAt}
              </div>
            </div>
          )}

          {editing && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Contact Name</label>
                <Input value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Email</label>
                <Input value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Phone</label>
                <Input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Country</label>
                <Input value={form.country} onChange={(e) => updateField('country', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Application Type</label>
                <Input value={form.applicationType} onChange={(e) => updateField('applicationType', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input value={form.projectName} onChange={(e) => updateField('projectName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="font-medium text-sm">Products</div>
                <div className="flex flex-col gap-3">
                  {form.productsRequested.map((p, idx) => (
                    <div key={idx} className="border rounded p-2 space-y-2">
                      <div className="text-xs text-muted-foreground">{String(p.productId)}</div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs">Qty</label>
                        <Input
                          type="number"
                          className="w-24 h-8"
                          value={p.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value || '0', 10);
                            setForm((f) => ({
                              ...f,
                              productsRequested: f.productsRequested.map((pp, i) => (i === idx ? { ...pp, quantity: val } : pp)),
                            }));
                          }}
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs">Notes</label>
                        <Textarea
                          className="min-h-[60px]"
                          value={p.notes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((f) => ({
                              ...f,
                              productsRequested: f.productsRequested.map((pp, i) => (i === idx ? { ...pp, notes: val } : pp)),
                            }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {!form.productsRequested.length && <div className="text-xs text-muted-foreground">No products.</div>}
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
