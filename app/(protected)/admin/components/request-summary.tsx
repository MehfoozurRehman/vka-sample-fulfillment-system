'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import dayjs from 'dayjs';
import { useQuery } from 'convex/react';

type DetailShape = { request?: { requestId: string; status: string; applicationType: string; projectName: string; createdAt: number }; stakeholder?: { companyName?: string } };

export default function RequestSummary({ requestId }: { requestId: string }) {
  const id = requestId as unknown as Id<'requests'>;
  const detail = useQuery(api.screener.detail, { id }) as DetailShape | undefined;
  const order = useQuery(api.request.orderSummary, { requestId: id }) as
    | { id: Id<'orders'>; orderId: string; status: string; packedDate?: number; shippedDate?: number; carrier?: string; trackingNumber?: string }
    | null
    | undefined;

  const statusBadge = useMemo(() => {
    const status = detail?.request?.status?.toLowerCase?.() || '';
    let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';
    if (status.includes('pending')) variant = 'outline';
    else if (['approved', 'open'].some((s) => status.includes(s))) variant = 'default';
    else if (['rejected', 'cancel', 'error'].some((s) => status.includes(s))) variant = 'destructive';
    return <Badge variant={variant}>{detail?.request?.status || '—'}</Badge>;
  }, [detail]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {!detail ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
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
