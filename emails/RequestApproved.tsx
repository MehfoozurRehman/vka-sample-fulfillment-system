import VkaLayout from './VkaLayout';
import { render } from '@react-email/render';

export type RequestApprovedProps = {
  requestId: string;
};

export function RequestApproved({ requestId }: RequestApprovedProps) {
  const title = `VKA Sample Request [${requestId}] Approved`;
  const body = `Hello,

Your sample request ${requestId} has been approved and is moving to packing.

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export function renderRequestApprovedHtml(props: RequestApprovedProps) {
  return render(<RequestApproved {...props} />);
}

export default RequestApproved;
