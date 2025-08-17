'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useMemo, useState, useTransition } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { Button } from '@/components/ui/button';
import { Id } from '@/convex/_generated/dataModel';
import StatusPill from '@/components/status-pill';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import toastError from '@/utils/toastError';
import { useAuth } from '@/hooks/use-user';

type DetailShape = { request?: { requestId: string; status: string; applicationType: string; projectName: string; createdAt: number }; stakeholder?: { companyName?: string } };

export default function RequestSummary({ requestId }: { requestId: string }) {
  const id = requestId as unknown as Id<'requests'>;

  const detail = useQuery(api.screener.detail, { id }) as DetailShape | undefined;

  const auth = useAuth();

  const setBriefMut = useMutation(api.request.setBusinessBrief);

  const [editingBrief, setEditingBrief] = useState(false);

  const [briefText, setBriefText] = useState('');

  const [isSavingBrief, startSavingBrief] = useTransition();

  const order = useQuery(api.request.orderSummary, { requestId: id }) as
    | { id: Id<'orders'>; orderId: string; status: string; packedDate?: number; shippedDate?: number; carrier?: string; trackingNumber?: string }
    | null
    | undefined;

  const statusBadge = useMemo(() => {
    return <StatusPill value={detail?.request?.status} kind="status" />;
  }, [detail]);

  const businessBrief = (detail?.request as unknown as { businessBrief?: string } | undefined)?.businessBrief;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {!detail ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Request ID" value={detail.request?.requestId} />
              <Info label="Company" value={detail.stakeholder?.companyName || 'Unknown'} />
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="font-medium">{statusBadge}</div>
              </div>
              <Info label="Application" value={detail.request?.applicationType} />
              <Info label="Project" value={detail.request?.projectName} />
              {detail.request?.createdAt && <Info label="Submitted" value={dayjs(detail.request.createdAt).format('YYYY-MM-DD HH:mm')} />}
              {order && <Info label="Order" value={`${order.orderId} · ${order.status}`} />}
              {order?.packedDate && <Info label="Packed" value={dayjs(order.packedDate).format('YYYY-MM-DD HH:mm')} />}
              {order?.shippedDate && <Info label="Shipped" value={`${dayjs(order.shippedDate).format('YYYY-MM-DD HH:mm')}${order.trackingNumber ? ` · ${order.trackingNumber}` : ''}`} />}
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Business Brief</div>
                {!editingBrief ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                      setBriefText((businessBrief || '').trim());
                      setEditingBrief(true);
                    }}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      disabled={isSavingBrief || !briefText.trim()}
                      onClick={() => {
                        startSavingBrief(async () => {
                          try {
                            await setBriefMut({ userId: auth.id, id, businessBrief: briefText.trim() });
                            setEditingBrief(false);
                            toast.success('Business brief updated');
                          } catch (e) {
                            toastError(e);
                          }
                        });
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        setBriefText((businessBrief || '').trim());
                        setEditingBrief(false);
                      }}
                      disabled={isSavingBrief}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              {!editingBrief ? (
                businessBrief?.trim() ? (
                  <div className="text-sm whitespace-pre-wrap break-words border rounded-md p-2 bg-background/40">{businessBrief}</div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No brief provided.</div>
                )
              ) : (
                <Textarea value={briefText} onChange={(e) => setBriefText(e.target.value)} className="min-h-24" placeholder="Describe the business problem/use-case and desired outcome" />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium break-all">{value || '—'}</div>
    </div>
  );
}
