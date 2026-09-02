import { NextRequest, NextResponse } from 'next/server';
import { redis, KEYS } from '@/lib/redis';
import { fetchPoseidonGachigachi, todayHdJST, GachiRace } from '@/lib/scrape';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1';

type CachedPayload = { date: string; fetchedAt: string; races: GachiRace[] };

function sortByDeadline(races: GachiRace[]): GachiRace[] {
  return races.slice().sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
}

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === '1';
  const date = todayHdJST();

  if (!force) {
    const cached = await redis.get<CachedPayload>(KEYS.poseidon(date));
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const races = sortByDeadline(await fetchPoseidonGachigachi());
    const payload: CachedPayload = {
      date,
      fetchedAt: new Date().toISOString(),
      races
    };
    await redis.set(KEYS.poseidon(date), payload, { ex: 60 * 60 * 24 * 3 }); // 3日保持
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
  }
}
