import VkaLayout from './VkaLayout';

type RequestInfoRespondedProps = {
  requestId: string;
  message: string;
};

function RequestInfoResponded({ requestId, message }: RequestInfoRespondedProps) {
  const title = `VKA Sample Request [${requestId}] – Information Provided`;
  const body = `Hello,

The requester has provided additional information for ${requestId}:
${message}

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export default RequestInfoResponded;
