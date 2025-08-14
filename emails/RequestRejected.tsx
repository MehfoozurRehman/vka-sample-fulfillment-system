import VkaLayout from './VkaLayout';
import { render } from '@react-email/render';

export type RequestRejectedProps = {
  requestId: string;
  reason: string;
};

export function RequestRejected({ requestId, reason }: RequestRejectedProps) {
  const title = `VKA Sample Request [${requestId}] Status Update`;
  const body = `Hello,

We are sorry to inform you that request ${requestId} was rejected.
Reason: ${reason}

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export function renderRequestRejectedHtml(props: RequestRejectedProps) {
  return render(<RequestRejected {...props} />);
}

export default RequestRejected;
