import { NextRequest, NextResponse } from 'next/server';
import { fetchRaceTimes } from '@/lib/scrape';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1'; // 東京リージョンで実行し、公式サイトへの往復を短縮

export async function GET(req: NextRequest) {
  const jcd = req.nextUrl.searchParams.get('jcd');
  const hd = req.nextUrl.searchParams.get('hd');
  if (!jcd || !hd) return NextResponse.json({ error: 'jcd, hd は必須です' }, { status: 400 });

  try {
    const races = await fetchRaceTimes(jcd, hd);
    if (races.length === 0) {
      return NextResponse.json({ error: 'レース時刻を取得できませんでした' }, { status: 502 });
    }
    return NextResponse.json({ races });
  } catch {
    return NextResponse.json({ error: '取得中にエラーが発生しました' }, { status: 500 });
  }
}
