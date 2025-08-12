import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchMutation } from 'convex/nextjs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, name } = body as { email?: string; name?: string };

    if (!email || !name) {
      return NextResponse.json({ error: 'email and name are required' }, { status: 400 });
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 });
    }

    const user = await fetchMutation(api.user.createFirstAdmin, { email, name });

    return NextResponse.json({ ok: true, user });
  } catch (err: unknown) {
    const msg = typeof err === 'object' && err && 'message' in err ? String((err as { message: string }).message) : 'Internal error';
    const status = msg.includes('Initial admin already created') ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
