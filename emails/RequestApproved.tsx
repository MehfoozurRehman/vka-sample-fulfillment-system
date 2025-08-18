import VkaLayout from './VkaLayout';

type RequestApprovedProps = {
  requestId: string;
};

function RequestApproved({ requestId }: RequestApprovedProps) {
  const title = `VKA Sample Request [${requestId}] Approved`;
  const body = `Hello,

Your sample request ${requestId} has been approved and is moving to packing.

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export default RequestApproved;
