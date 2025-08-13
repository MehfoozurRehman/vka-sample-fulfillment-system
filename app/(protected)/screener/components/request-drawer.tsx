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

interface PriorNote {
  requestId: string;
  status: string;
  reviewDate?: number;
  reviewDateFmt?: string | null;
  reviewNotes?: string;
  rejectionReason?: string;
}
interface FrequentProduct {
  name: string;
  count: number;
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
  afterAction: (processedId: Id<'requests'>, action: 'approve' | 'reject') => void;
}) {
  const approveMut = useMutation(api.screener.approve);
  const rejectMut = useMutation(api.screener.reject);
  const requestInfoMut = useMutation(api.screener.requestInfo);

  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isRequesting, startRequesting] = useTransition();
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
    setInfoMsg('');
    setShowInfoForm(false);
  };

  const status = detailData?.request?.status || '';
  const awaitingInfo = status === 'Pending Info';

  return (
    <Drawer direction={'right'} open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-xl h-screen sm:h-auto flex flex-col">
        <DrawerHeader>
          <DrawerTitle>Request Details</DrawerTitle>
          <DrawerDescription>{row ? 'Review & take action' : 'Select a request'}</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col w-full overflow-y-auto p-4 space-y-6">
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
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="border">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium">Decision Counts</CardTitle>
                    <CardDescription className="text-xs">History for this customer</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 text-[11px] grid grid-cols-3 gap-2">
                    <div>
                      <span className="font-semibold">Approved:</span> {detailData.decisionCounts?.approved ?? 0}
                    </div>
                    <div>
                      <span className="font-semibold">Rejected:</span> {detailData.decisionCounts?.rejected ?? 0}
                    </div>
                    <div>
                      <span className="font-semibold">Pending:</span> {detailData.decisionCounts?.pending ?? 0}
                    </div>
                  </CardContent>
                </Card>
                {detailData.frequentProductsTop?.length ? (
                  <Card className="border">
                    <CardHeader className="pb-1">
                      <CardTitle className="text-sm font-medium">Frequent Products</CardTitle>
                      <CardDescription className="text-xs">Top 5 for this customer</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 text-[11px] space-y-1 max-h-28 overflow-auto">
                      {detailData.frequentProductsTop.map((p: FrequentProduct) => (
                        <div key={p.name} className="flex justify-between">
                          <span>{p.name}</span>
                          <span className="text-muted-foreground">{p.count}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
              {detailData.priorNotes?.length ? (
                <Card className="border">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium">Prior Notes & Reasons</CardTitle>
                    <CardDescription className="text-xs">From previous decisions</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 text-[11px] space-y-2 max-h-40 overflow-auto">
                    {detailData.priorNotes.slice(0, 10).map((n: PriorNote) => (
                      <div key={n.requestId} className="rounded border p-2 bg-background/50">
                        <div className="flex justify-between font-mono text-[10px] mb-1">
                          <span>{n.requestId}</span>
                          <span>{n.reviewDateFmt || '—'}</span>
                        </div>
                        <div className="flex gap-2 flex-wrap text-[10px] mb-1">
                          <span className="font-semibold">{n.status}</span>
                          {n.rejectionReason && <span className="text-destructive">({n.rejectionReason})</span>}
                        </div>
                        {n.reviewNotes && <div className="text-[10px] whitespace-pre-wrap text-muted-foreground">{n.reviewNotes}</div>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
              <div className="space-y-3">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" className="resize-none h-24" />
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason (required to reject)" />
                <div className="text-[10px] text-muted-foreground">
                  Approvals create an order. Rejections require a reason. All actions are audit logged. {awaitingInfo && 'Awaiting requester info response.'}
                </div>
              </div>
              {(detailData.request.infoRequestedAt || detailData.request.infoRequestMessage) && (
                <Card className="border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">Info Request {awaitingInfo && <Badge variant="outline">Awaiting Response</Badge>}</CardTitle>
                    <CardDescription className="text-xs">History of information requested from requester</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="font-semibold">Requested</div>
                      <div className="text-muted-foreground">{detailData.request.infoRequestedAt ? dayjs(detailData.request.infoRequestedAt).format('MMM D, YYYY h:mm A') : '—'}</div>
                      {detailData.request.infoRequestMessage && <div className="rounded-md bg-muted p-2 whitespace-pre-wrap text-[11px]">{detailData.request.infoRequestMessage}</div>}
                    </div>
                    {(detailData.request.infoResponseAt || detailData.request.infoResponseMessage) && (
                      <div className="space-y-1">
                        <div className="font-semibold">Response</div>
                        <div className="text-muted-foreground">{detailData.request.infoResponseAt ? dayjs(detailData.request.infoResponseAt).format('MMM D, YYYY h:mm A') : '—'}</div>
                        {detailData.request.infoResponseMessage && <div className="rounded-md bg-background border p-2 whitespace-pre-wrap text-[11px]">{detailData.request.infoResponseMessage}</div>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {!detailData.request.infoResponseMessage && !awaitingInfo && status.toLowerCase().includes('pending') && (
                <div className="space-y-2">
                  {!showInfoForm && (
                    <Button variant="secondary" size="sm" onClick={() => setShowInfoForm(true)} disabled={!currentId}>
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
                            if (!currentId || !infoMsg.trim()) return;
                            startRequesting(async () => {
                              await requestInfoMut({ id: currentId, screenerEmail: reviewerEmail, message: infoMsg.trim() });
                              setShowInfoForm(false);
                              setInfoMsg('');
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
            </>
          )}
        </div>
        <DrawerFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                disabled={isSaving || !currentId || awaitingInfo}
                onClick={() => {
                  if (!currentId || awaitingInfo) return;
                  startSaving(async () => {
                    await approveMut({ id: currentId, reviewedBy: reviewerEmail, notes: notes || undefined });
                    afterAction(currentId, 'approve');
                  });
                }}
              >
                {isSaving && <Loader className="mr-2 size-4 animate-spin" />} Approve
              </Button>
              <Button
                variant="destructive"
                disabled={isSaving || !currentId || !canReject || awaitingInfo}
                onClick={() => {
                  if (!currentId || !canReject || awaitingInfo) return;
                  startSaving(async () => {
                    await rejectMut({ id: currentId, reviewedBy: reviewerEmail, reason: reason.trim(), notes: notes || undefined });
                    afterAction(currentId, 'reject');
                  });
                }}
              >
                {isSaving && <Loader className="mr-2 size-4 animate-spin" />} Reject
              </Button>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
