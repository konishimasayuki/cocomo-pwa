import { NextRequest, NextResponse } from 'next/server';
import { redis, KEYS } from '@/lib/redis';
import { FundEntry } from '@/lib/cocomo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100');
  const raw = await redis.lrange<FundEntry>(KEYS.funds, 0, limit - 1);
  return NextResponse.json({ entries: raw });
}

export async function POST(req: NextRequest) {
  const entry = (await req.json()) as FundEntry;
  await redis.lpush(KEYS.funds, entry);
  await redis.ltrim(KEYS.funds, 0, 499);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 });

  const all = await redis.lrange<FundEntry>(KEYS.funds, 0, -1);
  const remaining = all.filter((e) => e.id !== id);

  await redis.del(KEYS.funds);
  if (remaining.length > 0) {
    await redis.rpush(KEYS.funds, ...remaining);
  }

  return NextResponse.json({ ok: true });
}
