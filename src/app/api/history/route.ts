import { NextRequest, NextResponse } from 'next/server';
import { redis, KEYS } from '@/lib/redis';
import { HistoryEntry } from '@/lib/cocomo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '200');
  // 新しい順（LPUSHしているので先頭が最新）
  const raw = await redis.lrange<HistoryEntry>(KEYS.history, 0, limit - 1);
  return NextResponse.json({ entries: raw });
}

export async function POST(req: NextRequest) {
  const entry = (await req.json()) as HistoryEntry;
  await redis.lpush(KEYS.history, entry);
  await redis.ltrim(KEYS.history, 0, 999); // 直近1000件まで保持
  return NextResponse.json({ ok: true });
}
