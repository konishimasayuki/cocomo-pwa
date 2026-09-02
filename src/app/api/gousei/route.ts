import { NextRequest, NextResponse } from 'next/server';
import { redis, KEYS } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await redis.get(KEYS.gousei);
  return NextResponse.json({ state: state ?? null });
}

export async function POST(req: NextRequest) {
  const state = await req.json();
  await redis.set(KEYS.gousei, state);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await redis.del(KEYS.gousei);
  return NextResponse.json({ ok: true });
}
