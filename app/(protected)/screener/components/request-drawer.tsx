import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { LabelVal, RecentRequestsPanel } from './request-drawer.parts';
import React, { useEffect, useState, useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMutation, useQuery } from 'convex/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Loader } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';

interface PendingRowLite {
  id: Id<'requests'>;
  requestId: string;
}

export default function RequestDrawer({
  open,
  onOpenChange,
  row,
  reviewerEmail,
  afterAction,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: PendingRowLite | null;
  reviewerEmail: string;
  afterAction: () => void;
}) {
  const approveMut = useMutation(api.screener.approve);

  const rejectMut = useMutation(api.screener.reject);

  const [notes, setNotes] = useState('');

  const [reason, setReason] = useState('');

  const [isSaving, startSaving] = useTransition();

  const [currentId, setCurrentId] = useState<Id<'requests'> | null>(null);

  useEffect(() => {
    if (row) setCurrentId(row.id);
  }, [row]);

  const canReject = reason.trim().length > 2;
  const detailData = useQuery(api.screener.detail, currentId ? { id: currentId } : 'skip');

  const vip = !!detailData?.stakeholder?.vipFlag;

  const handleSelect = (id: Id<'requests'>) => {
    setCurrentId(id);
    setNotes('');
    setReason('');
  };

  return (
    <Drawer direction={'right'} open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-xl">
        <DrawerHeader>
          <DrawerTitle>Request Details</DrawerTitle>
          <DrawerDescription>{row ? 'Review & take action' : 'Select a request'}</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-6">
          {!row && <div className="text-xs text-muted-foreground">No request selected.</div>}
          {row && !detailData && <div className="text-xs text-muted-foreground animate-pulse">Loading details...</div>}
          {row && detailData && (
            <>
              <div className={`rounded-md border p-4 bg-card/40 backdrop-blur-sm space-y-3 relative ${vip ? 'ring-2 ring-destructive/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm font-mono">{detailData.request.requestId}</div>
                  {vip && <Badge variant="destructive">VIP</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] leading-relaxed">
                  <LabelVal label="Company" value={detailData.stakeholder?.companyName} />
                  <LabelVal label="Application" value={detailData.request.applicationType} />
                  <LabelVal label="Project" value={detailData.request.projectName} />
                  <LabelVal label="Submitted" value={dayjs(detailData.request.createdAt).format('MMM D, YYYY h:mm A')} />
                </div>
              </div>
              {detailData.productsDetailed && detailData.productsDetailed.length > 0 && (
                <Card className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Requested Products</CardTitle>
                    <CardDescription className="text-xs">Items included in this request</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="max-h-48 overflow-auto rounded-md border">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-10">
                          <TableRow>
                            <TableHead className="w-28">Product ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-16 text-right">Qty</TableHead>
                            <TableHead className="hidden lg:table-cell">Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailData.productsDetailed.map((p: { id: string; productId?: string; name?: string; quantity: number; notes?: string }) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs">{p.productId || '—'}</TableCell>
                              <TableCell className="truncate" title={p.name}>
                                {p.name || '—'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-xs">{p.quantity}</TableCell>
                              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground max-w-[200px] truncate" title={p.notes}>
                                {p.notes || ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
              <RecentRequestsPanel data={detailData.lastFive} total={detailData.totalSamples12mo} onSelect={handleSelect} activeId={currentId} />
              <div className="space-y-3">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" className="resize-none h-24" />
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason (required to reject)" />
                <div className="flex gap-2">
                  <Button
                    disabled={isSaving || !currentId}
                    onClick={() => {
                      if (!currentId) return;
                      startSaving(async () => {
                        await approveMut({ id: currentId, reviewedBy: reviewerEmail, notes: notes || undefined });
                        afterAction();
                      });
                    }}
                  >
                    {isSaving && <Loader className="mr-2 size-4 animate-spin" />} Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isSaving || !currentId || !canReject}
                    onClick={() => {
                      if (!currentId || !canReject) return;
                      startSaving(async () => {
                        await rejectMut({ id: currentId, reviewedBy: reviewerEmail, reason: reason.trim(), notes: notes || undefined });
                        afterAction();
                      });
                    }}
                  >
                    {isSaving && <Loader className="mr-2 size-4 animate-spin" />} Reject
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground">Approvals create an order. Rejections require a reason. All actions are audit logged.</div>
              </div>
            </>
          )}
        </div>
        <DrawerFooter>
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
