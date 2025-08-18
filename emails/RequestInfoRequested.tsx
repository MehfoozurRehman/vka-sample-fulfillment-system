import VkaLayout from './VkaLayout';

type RequestInfoRequestedProps = {
  requestId: string;
  message: string;
  requesterName?: string | null;
};

function RequestInfoRequested({ requestId, message, requesterName }: RequestInfoRequestedProps) {
  const title = `VKA Sample Request [${requestId}] – Additional Information Requested`;
  const greeting = requesterName ? `Hello ${requesterName},` : 'Hello,';
  const body = `${greeting}

Additional information has been requested for ${requestId}:
${message}

Please reply at your earliest convenience.

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export default RequestInfoRequested;
