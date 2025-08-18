import VkaLayout from './VkaLayout';

type OrderReadyProps = {
  requestId: string;
  orderId: string;
};

function OrderReady({ requestId, orderId }: OrderReadyProps) {
  const title = `VKA Order [${orderId}] Ready to Pack`;
  const body = `Hello,

Order ${orderId} from request ${requestId} is ready for packing.

Thank you,
VKA`;
  return <VkaLayout title={title} body={body} />;
}

export default OrderReady;
