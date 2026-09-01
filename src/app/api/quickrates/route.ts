import { NextResponse } from 'next/server';
import { fetchActiveVenues, fetchRaceTimes, fetchOdds2t, todayHdJST, nowHMJST } from '@/lib/scrape';

export const dynamic = 'force-dynamic';

export type QuickRate = {
  code: string;
  venue: string;
  nextRace: number | null;
  deadline: string | null;
  odds12: number | null;
  error?: string;
};

export async function GET() {
  const hd = todayHdJST();
  const nowHM = nowHMJST();

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

  return NextResponse.json({ hd, nowHM, results });
}
