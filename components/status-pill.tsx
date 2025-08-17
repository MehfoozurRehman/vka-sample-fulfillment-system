import { Badge } from '@/components/ui/badge';
import React from 'react';

type Variant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info' | 'neutral';

export type StatusKind = 'status' | 'stage' | 'user';

export function mapToVariant(value?: string, kind: StatusKind = 'status'): Variant {
  const v = (value || '').toLowerCase();

  if (/(reject|error|fail|inactive|blocked|cancel)/.test(v)) return 'destructive';
  if (/(vip)/.test(v)) return 'warning';
  if (/(approve|success|complete|active|open)/.test(v)) return 'success';
  if (/(pending info|await|hold|review|pending)/.test(v)) return 'warning';

  if (kind === 'stage') {
    if (/(submitted|new)/.test(v)) return 'info';
    if (/(review|reviewed)/.test(v)) return 'warning';
    if (/(order|processing)/.test(v)) return 'secondary';
    if (/(packed)/.test(v)) return 'info';
    if (/(shipped|delivered)/.test(v)) return 'success';
  }

  if (kind === 'user') {
    if (/(invited|invite)/.test(v)) return 'outline';
    if (/(active)/.test(v)) return 'success';
    if (/(inactive|disabled)/.test(v)) return 'destructive';
  }

  return 'neutral';
}

export function StatusPill({ value, kind = 'status', className }: { value?: string; kind?: StatusKind; className?: string }) {
  const variant = mapToVariant(value, kind);

  return (
    <Badge variant={variant} className={className}>
      {value || '—'}
    </Badge>
  );
}

export default StatusPill;
