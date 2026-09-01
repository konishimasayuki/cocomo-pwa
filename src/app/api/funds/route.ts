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
