'use client';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { InputWithSuggestions } from '@/components/ui/input-with-suggestions';
import { Loader } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';
import { useAuth } from '@/hooks/use-user';
import { useMutation } from 'convex/react';
import { useQueryWithStatus } from '@/hooks/use-query';
import { useSearchParams } from 'next/navigation';

export default function ScreenerRequestPage() {
  const auth = useAuth();

  const searchParams = useSearchParams();

  const requestIdParam = searchParams.get('id');
  const requestId = requestIdParam ? (requestIdParam as unknown as Id<'requests'>) : null;

  const { data: detail, isPending } = useQueryWithStatus(api.screener.detail, { id: requestId });

  const { data: products } = useQueryWithStatus(api.product.list, {});

  const approveMut = useMutation(api.screener.approve);

  const rejectMut = useMutation(api.screener.reject);

  const requestInfoMut = useMutation(api.screener.requestInfo);

  const claimMut = useMutation(api.screener.claim);

  const addLineMut = useMutation(api.request.addProductLine);

  const editLineMut = useMutation(api.request.editProductLine);

  const removeLineMut = useMutation(api.request.removeProductLine);

  const [notes, setNotes] = useState('');

  const [reason, setReason] = useState('');

  const [infoMsg, setInfoMsg] = useState('');

  const [showInfoForm, setShowInfoForm] = useState(false);

  const [isSaving, startSaving] = useTransition();

  const [isRequesting, startRequesting] = useTransition();

  const [isClaiming, startClaiming] = useTransition();

  const [isAddPending, startAdd] = useTransition();

  const [isEditPending, startEdit] = useTransition();

  const [isRemovePending, startRemove] = useTransition();

  const [addOpen, setAddOpen] = useState(false);

  const [addForm, setAddForm] = useState<{ productId: Id<'products'> | null; quantity: number | ''; notes?: string; reason: string }>({ productId: null, quantity: 1, notes: '', reason: '' });

  const [editOpen, setEditOpen] = useState(false);

  const [editIndex, setEditIndex] = useState<number | null>(null);

  const [editForm, setEditForm] = useState<{ productId: Id<'products'> | null; quantity: number | ''; notes?: string; reason: string }>({ productId: null, quantity: 1, notes: '', reason: '' });

  const [removeOpen, setRemoveOpen] = useState(false);

  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  const [removeReason, setRemoveReason] = useState('');

  const status = detail?.request?.status || '';

  const awaitingInfo = status === 'Pending Info';

  const claimedBy = detail?.request?.claimedBy;

  const isClaimedByMe = !!claimedBy && claimedBy === auth.email;

  const productOptions = useMemo(() => (products || []).map((p) => ({ id: p.id as Id<'products'>, label: `${p.productId} - ${p.productName}` })), [products]);

  const productLabelById = useMemo(() => new Map(productOptions.map((p) => [p.id, p.label])), [productOptions]);

  useEffect(() => {
    setAddOpen(false);
    setEditOpen(false);
    setRemoveOpen(false);
    setEditIndex(null);
    setRemoveIndex(null);
    setRemoveReason('');
  }, [requestId]);

  if (isPending)
    return (
      <div className="p-4 text-sm text-muted-foreground flex items-center gap-2 justify-center w-full h-[500px]">
        <Loader className="animate-spin" />
      </div>
    );

  if (!detail) {
    return <div className="p-4 text-sm text-muted-foreground flex items-center gap-2 justify-center w-full h-[500px]">No request details available</div>;
  }

  const r = detail.request;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono font-medium">{r.requestId}</div>
          <div className="text-xs text-muted-foreground">Submitted {dayjs(r.createdAt).format('MMM D, YYYY h:mm A')}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="capitalize" variant="outline">
            {r.status}
          </Badge>
          {detail.stakeholder?.vipFlag && <Badge variant="destructive">VIP</Badge>}
        </div>
      </div>
      {status.toLowerCase().includes('pending') && (
        <div className="flex items-center justify-between rounded-md border p-2 bg-card/40">
          <div className="text-[11px]">
            {claimedBy ? (
              isClaimedByMe ? (
                <span className="text-emerald-600">You have claimed this request.</span>
              ) : (
                <span className="text-amber-600">Claimed by {claimedBy}. View only.</span>
              )
            ) : (
              <span className="text-muted-foreground">Unclaimed</span>
            )}
          </div>
          {!claimedBy && (
            <Button
              size="sm"
              onClick={() =>
                startClaiming(async () => {
                  try {
                    await claimMut({ id: r._id as Id<'requests'>, screenerEmail: auth.email });
                    toast.success('Request claimed');
                  } catch (e) {
                    toastError(e);
                  }
                })
              }
              disabled={isClaiming}
            >
              {isClaiming && <Loader className="mr-2 size-3 animate-spin" />} Claim
            </Button>
          )}
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] leading-relaxed">
            <div>
              <div className="text-muted-foreground text-[10px]">Company</div>
              <div>{detail.stakeholder?.companyName}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px]">Application</div>
              <div>{r.applicationType}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px]">Project</div>
              <div>{r.projectName}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px]">Request By</div>
              <div>{detail.requester}</div>
            </div>
          </div>
          <div className="pt-2 text-[12px]">
            <div className="text-muted-foreground text-[10px] mb-1">Business Brief</div>
            <div className="whitespace-pre-wrap rounded-md border bg-background/60 p-2">{r.businessBrief}</div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="text-sm font-semibold">Actions</div>
          {!isClaimedByMe || r.status.toLowerCase() === 'approved' || r.status.toLowerCase() === 'rejected' ? (
            <div className="text-xs text-muted-foreground">No actions available.</div>
          ) : (
            <div className="space-y-3">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" className="resize-none h-24" />
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason (required to reject)" />
              {!detail.request.infoResponseMessage && !awaitingInfo && status.toLowerCase().includes('pending') && (
                <div className="space-y-2">
                  {!showInfoForm && (
                    <Button variant="secondary" size="sm" onClick={() => setShowInfoForm(true)}>
                      Request Additional Info
                    </Button>
                  )}
                  {showInfoForm && (
                    <div className="space-y-2 rounded-md border p-3 bg-card/40">
                      <Textarea value={infoMsg} onChange={(e) => setInfoMsg(e.target.value)} placeholder="Describe what additional information you need..." className="h-24 resize-none text-xs" />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowInfoForm(false);
                            setInfoMsg('');
                          }}
                          disabled={isRequesting}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!infoMsg.trim()) return;
                            startRequesting(async () => {
                              try {
                                await requestInfoMut({ id: r._id as Id<'requests'>, screenerEmail: auth.email, message: infoMsg.trim() });
                                setShowInfoForm(false);
                                setInfoMsg('');
                                toast.success('Info request sent');
                              } catch (e) {
                                toastError(e);
                              }
                            });
                          }}
                          disabled={isRequesting || !infoMsg.trim()}
                        >
                          {isRequesting && <Loader className="mr-2 size-3 animate-spin" />} Send Request
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    startSaving(async () => {
                      try {
                        await approveMut({ id: r._id as Id<'requests'>, reviewedBy: auth.email, notes: notes || undefined });
                        toast.success('Request approved');
                      } catch (e) {
                        toastError(e);
                      }
                    });
                  }}
                  disabled={isSaving || awaitingInfo || r.status.toLowerCase() === 'approved' || r.status.toLowerCase() === 'rejected'}
                >
                  {isSaving && <Loader className="mr-2 size-4 animate-spin" />} Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!reason.trim()) return toast.error('Reason required to reject');
                    startSaving(async () => {
                      try {
                        await rejectMut({ id: r._id as Id<'requests'>, reviewedBy: auth.email, reason: reason.trim(), notes: notes || undefined });
                        toast.success('Request rejected');
                      } catch (e) {
                        toastError(e);
                      }
                    });
                  }}
                  disabled={isSaving || awaitingInfo || !reason.trim()}
                >
                  {isSaving && <Loader className="mr-2 size-4 animate-spin" />} Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Requested Products</div>
          {isClaimedByMe && status.toLowerCase().includes('pending') && (
            <Button
              size="sm"
              onClick={() => {
                setAddForm({ productId: null, quantity: 1, notes: '', reason: '' });
                setAddOpen(true);
              }}
            >
              Add Product
            </Button>
          )}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="min-w-56">Notes</TableHead>
                {isClaimedByMe && status.toLowerCase().includes('pending') && <TableHead className="w-40">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="overflow-visible">
              {r.productsRequested.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <span title={productLabelById.get(line.productId as Id<'products'>) || ''}>{productLabelById.get(line.productId as Id<'products'>) || String(line.productId)}</span>
                  </TableCell>
                  <TableCell>
                    <span>{line.quantity}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{line.notes || ''}</span>
                  </TableCell>
                  {isClaimedByMe && status.toLowerCase().includes('pending') && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditIndex(idx);
                            setEditForm({ productId: line.productId as Id<'products'>, quantity: line.quantity, notes: line.notes, reason: '' });
                            setEditOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setRemoveIndex(idx);
                            setRemoveReason('');
                            setRemoveOpen(true);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Select a product to add to this request</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const selectedIds = new Set(r.productsRequested.map((l) => l.productId as Id<'products'>));

              const filteredAddOptions = productOptions.filter((o) => !selectedIds.has(o.id)).map((o) => o.label);

              return (
                <InputWithSuggestions
                  className="h-9"
                  value={addForm.productId ? productLabelById.get(addForm.productId) || '' : ''}
                  onValueChange={(v) => {
                    const match = productOptions.find((o) => o.label === v);

                    setAddForm((f) => ({ ...f, productId: match ? (match.id as Id<'products'>) : null }));
                  }}
                  options={filteredAddOptions}
                  placeholder="Select product"
                />
              );
            })()}
            <Input
              className="h-9"
              type="number"
              min={1}
              value={addForm.quantity === '' ? '' : addForm.quantity}
              onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)) }))}
              placeholder="Quantity"
            />
            <Input className="h-9" value={addForm.notes || ''} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" />
            <Textarea value={addForm.reason} onChange={(e) => setAddForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason for adding (required)" className="h-24 resize-none text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!(addForm.productId && addForm.quantity !== '' && (addForm.quantity as number) > 0 && addForm.reason.trim())) {
                  toast.error('Select product, qty > 0, and reason');

                  return;
                }

                startAdd(async () => {
                  try {
                    const line = { productId: addForm.productId as Id<'products'>, quantity: addForm.quantity as number, notes: addForm.notes || undefined };

                    await addLineMut({ id: r._id as Id<'requests'>, screenerEmail: auth.email, line, reason: addForm.reason.trim() });
                    toast.success('Line added');
                    setAddOpen(false);
                    setAddForm({ productId: null, quantity: 1, notes: '', reason: '' });
                  } catch (e) {
                    toastError(e);
                  }
                });
              }}
              disabled={isAddPending}
            >
              {isAddPending && <Loader className="mr-2 size-3 animate-spin" />} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Line</DialogTitle>
            <DialogDescription>Change product, quantity, or notes</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(() => {
              const idx = editIndex ?? -1;

              const selectedOtherIds = new Set(r.productsRequested.map((l, i) => (i === idx ? null : (l.productId as Id<'products'>))).filter(Boolean) as Id<'products'>[]);

              const filteredEditOptions = productOptions.filter((o) => !selectedOtherIds.has(o.id)).map((o) => o.label);

              return (
                <InputWithSuggestions
                  className="h-9"
                  value={editForm.productId ? productLabelById.get(editForm.productId) || '' : ''}
                  onValueChange={(v) => {
                    const match = productOptions.find((o) => o.label === v);

                    setEditForm((f) => ({ ...f, productId: match ? (match.id as Id<'products'>) : null }));
                  }}
                  options={filteredEditOptions}
                  placeholder="Select product"
                />
              );
            })()}
            <Input
              className="h-9"
              type="number"
              min={1}
              value={editForm.quantity === '' ? '' : editForm.quantity}
              onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)) }))}
              placeholder="Quantity"
            />
            <Input className="h-9" value={editForm.notes || ''} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" />
            <Textarea
              value={editForm.reason}
              onChange={(e) => setEditForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Reason for change (required)"
              className="h-24 resize-none text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editIndex === null) return;

                if (!(editForm.productId && editForm.quantity !== '' && (editForm.quantity as number) > 0 && editForm.reason.trim())) {
                  toast.error('Select product, qty > 0, and reason');

                  return;
                }

                startEdit(async () => {
                  try {
                    const to = { productId: editForm.productId as Id<'products'>, quantity: editForm.quantity as number, notes: editForm.notes || undefined };

                    await editLineMut({ id: r._id as Id<'requests'>, screenerEmail: auth.email, index: editIndex, to, reason: editForm.reason.trim() });
                    toast.success('Line updated');
                    setEditOpen(false);
                    setEditIndex(null);
                    setEditForm({ productId: null, quantity: 1, notes: '', reason: '' });
                  } catch (e) {
                    toastError(e);
                  }
                });
              }}
              disabled={isEditPending}
            >
              {isEditPending && <Loader className="mr-2 size-3 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Product</DialogTitle>
            <DialogDescription>This will remove the product line from the request</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Product</div>
              <div className="font-medium">
                {(() => {
                  const idx = removeIndex ?? -1;

                  if (idx < 0) return '—';
                  const pid = r.productsRequested[idx]?.productId as Id<'products'> | undefined;

                  return (pid && productLabelById.get(pid)) || String(pid ?? '—');
                })()}
              </div>
            </div>
            <Textarea value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder="Reason for removal (required)" className="h-24 resize-none text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removeIndex === null) return;

                if (!removeReason.trim()) {
                  toast.error('Reason required');

                  return;
                }

                startRemove(async () => {
                  try {
                    await removeLineMut({ id: r._id as Id<'requests'>, screenerEmail: auth.email, index: removeIndex, reason: removeReason.trim() });
                    toast.success('Line removed');
                    setRemoveOpen(false);
                    setRemoveIndex(null);
                    setRemoveReason('');
                  } catch (e) {
                    toastError(e);
                  }
                });
              }}
              disabled={isRemovePending}
            >
              {isRemovePending && <Loader className="mr-2 size-3 animate-spin" />} Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="text-sm font-semibold">Decision & Change History</div>
        <div className="space-y-2 text-xs">
          {detail.productChangeHistory?.length === 0 && detail.auditLogs?.length === 0 && <div className="text-muted-foreground">No history yet.</div>}
          {detail.productChangeHistory?.map((h, i) => (
            <div key={`pch-${i}`} className="rounded border p-2 bg-background/60">
              <div className="flex justify-between">
                <span className="font-semibold">Product {h.type}</span>
                <span>{dayjs(h.at).format('YYYY-MM-DD HH:mm')}</span>
              </div>
              <div className="text-muted-foreground">By {h.by}</div>
              <div className="mt-1">Reason: {h.reason}</div>
            </div>
          ))}
          {detail.auditLogs?.map((l, i) => (
            <div key={`al-${i}`} className="rounded border p-2 bg-background/60">
              <div className="flex justify-between">
                <span className="font-semibold">{l.action}</span>
                <span>{dayjs(l.timestamp).format('YYYY-MM-DD HH:mm')}</span>
              </div>
              <div className="text-muted-foreground text-[11px]">changes: {typeof l.changes === 'object' ? JSON.stringify(l.changes) : String(l.changes)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
