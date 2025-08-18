import VkaLayout from './VkaLayout';

type RequestRejectedProps = {
  requestId: string;
  reason: string;
};

function RequestRejected({ requestId, reason }: RequestRejectedProps) {
  const title = `VKA Sample Request [${requestId}] Status Update`;
  const body = `Hello,

We are sorry to inform you that request ${requestId} was rejected.
Reason: ${reason}

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export default RequestRejected;
