import VkaLayout from './VkaLayout';
import { render } from '@react-email/render';

type OrderReadyProps = {
  requestId: string;
  orderId: string;
};

export function OrderReady({ requestId, orderId }: OrderReadyProps) {
  const title = `VKA Order [${orderId}] Ready to Pack`;
  const body = `Hello,

Order ${orderId} from request ${requestId} is ready for packing.

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export function renderOrderReadyHtml(props: OrderReadyProps) {
  return render(<OrderReady {...props} />);
}

export default OrderReady;
