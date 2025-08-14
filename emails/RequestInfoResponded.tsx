import VkaLayout from './VkaLayout';
import { render } from '@react-email/render';

export type RequestInfoRespondedProps = {
  requestId: string;
  message: string;
};

export function RequestInfoResponded({ requestId, message }: RequestInfoRespondedProps) {
  const title = `VKA Sample Request [${requestId}] – Information Provided`;
  const body = `Hello,

The requester has provided additional information for ${requestId}:
${message}

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export function renderRequestInfoRespondedHtml(props: RequestInfoRespondedProps) {
  return render(<RequestInfoResponded {...props} />);
}

export default RequestInfoResponded;
