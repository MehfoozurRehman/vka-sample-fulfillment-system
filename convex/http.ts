import { httpAction } from './_generated/server';
import { httpRouter } from 'convex/server';
import { resend } from './resend';

const http = httpRouter();

http.route({
  path: '/resend-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

export default http;
