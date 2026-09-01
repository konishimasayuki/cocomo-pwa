import { NextRequest, NextResponse } from 'next/server';
import { fetchActiveVenues } from '@/lib/scrape';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1'; // 東京リージョンで実行し、公式サイトへの往復を短縮

export async function GET(req: NextRequest) {
  const hd = req.nextUrl.searchParams.get('hd');
  if (!hd) return NextResponse.json({ error: 'hd は必須です' }, { status: 400 });

  try {
    const venues = await fetchActiveVenues(hd);
    return NextResponse.json({ venues });
  } catch {
    return NextResponse.json({ error: '取得中にエラーが発生しました' }, { status: 500 });
  }
}
