import { httpAction } from './_generated/server';
import { httpRouter } from 'convex/server';
import { resend } from './resend';

const http = httpRouter();

http.route({
  path: '/resend-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    try {
      return await resend.handleResendEventWebhook(ctx, req);
    } catch (err) {
      console.error('Resend webhook handling failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      return new Response(`Bad webhook: ${message}`, { status: 400 });
    }
  }),
});

export default http;
