import { NextRequest, NextResponse } from 'next/server';
import { fetchOdds2t } from '@/lib/scrape';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1'; // 東京リージョンで実行し、公式サイトへの往復を短縮

// 個人利用の範囲での軽い参照用途を想定（高頻度アクセスは避けること）。
export async function GET(req: NextRequest) {
  const jcd = req.nextUrl.searchParams.get('jcd');
  const hd = req.nextUrl.searchParams.get('hd');
  const rno = req.nextUrl.searchParams.get('rno');

  if (!jcd || !hd || !rno) {
    return NextResponse.json({ error: 'jcd, hd, rno は必須です' }, { status: 400 });
  }

  try {
    const combos = await fetchOdds2t(jcd, hd, Number(rno));
    if (Object.keys(combos).length === 0) {
      return NextResponse.json({ error: 'オッズを解析できませんでした' }, { status: 502 });
    }
    return NextResponse.json({ combos });
  } catch {
    return NextResponse.json({ error: '取得中にエラーが発生しました' }, { status: 500 });
  }
}
