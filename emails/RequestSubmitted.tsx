import * as React from 'react';

import VkaLayout from './VkaLayout';
import { render } from '@react-email/render';

export interface RequestSubmittedProps {
  requestId: string;
  companyName?: string | null;
  products?: Array<{ name: string; quantity: number; notes?: string | null }>;
}

export function RequestSubmitted({ requestId, companyName, products }: RequestSubmittedProps) {
  const title = `VKA Sample Request [${requestId}] Received`;
  const productsText = (products || []).map((p) => `- ${p.name} x ${p.quantity}${p.notes ? ` (${p.notes})` : ''}`).join('\n');
  const body = `Hello,

We have received your sample request ${requestId}${companyName ? ` for ${companyName}` : ''}.

${products && products.length ? `Products:\n${productsText}\n\n` : ''}We will notify you once it is reviewed.

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export function renderRequestSubmittedHtml(props: RequestSubmittedProps) {
  return render(<RequestSubmitted {...props} />);
}

export default RequestSubmitted;
