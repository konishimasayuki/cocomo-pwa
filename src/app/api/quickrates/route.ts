import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveVenues, fetchRaceTimes, fetchOdds2t, todayHdJST, nowHMJST } from '@/lib/scrape';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1'; // 東京リージョンで実行し、公式サイトへの往復を短縮

export type QuickRate = {
  code: string;
  venue: string;
  nextRace: number | null;
  deadline: string | null;
  odds12: number | null;
  error?: string;
};

const CACHE_KEY = 'cocomo:quickrates';
const CACHE_TTL_SEC = 12; // 短時間キャッシュ。更新ボタン(force=1)では無視される

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === '1';
  const hd = todayHdJST();
  const nowHM = nowHMJST();

  if (!force) {
    try {
      const cached = await redis.get<{ hd: string; nowHM: string; results: QuickRate[] }>(CACHE_KEY);
      if (cached && cached.hd === hd) {
        return NextResponse.json({ ...cached, cached: true });
      }
    } catch {
      // キャッシュ取得に失敗しても致命的ではないのでそのまま続行
    }
  }

  let venues: { code: string; name: string }[];
  try {
    venues = await fetchActiveVenues(hd);
  } catch {
    return NextResponse.json({ error: '開催会場の取得に失敗しました' }, { status: 500 });
  }

  const results: QuickRate[] = await Promise.all(
    venues.map(async (v) => {
      try {
        const races = await fetchRaceTimes(v.code, hd);
        const next = races.find((r) => !r.deadline || r.deadline >= nowHM);
        if (!next) {
          return { code: v.code, venue: v.name, nextRace: null, deadline: null, odds12: null, error: '本日終了' };
        }
        const combos = await fetchOdds2t(v.code, hd, next.race);
        return {
          code: v.code,
          venue: v.name,
          nextRace: next.race,
          deadline: next.deadline,
          odds12: combos['1-2'] ?? null
        };
      } catch {
        return { code: v.code, venue: v.name, nextRace: null, deadline: null, odds12: null, error: '取得失敗' };
      }
    })
  );

  results.sort((a, b) => a.code.localeCompare(b.code));

  const payload = { hd, nowHM, results };
  redis.set(CACHE_KEY, payload, { ex: CACHE_TTL_SEC }).catch(() => {});

  return NextResponse.json(payload);
}
