import { NextRequest, NextResponse } from 'next/server';
import { VENUES } from '@/lib/venues';

export const dynamic = 'force-dynamic';

// 指定日に開催中の会場一覧を「本日のレース」ページから取得する
export async function GET(req: NextRequest) {
  const hd = req.nextUrl.searchParams.get('hd');
  if (!hd) return NextResponse.json({ error: 'hd は必須です' }, { status: 400 });

  const url = `https://www.boatrace.jp/owpc/pc/race/index?hd=${hd}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: `公式サイト取得失敗 (${res.status})` }, { status: 502 });
    }

    const html = await res.text();
    const codes = Array.from(new Set(Array.from(html.matchAll(/raceindex\?jcd=(\d{2})/g)).map((m) => m[1])));
    const venues = codes
      .map((code) => ({ code, name: VENUES[Number(code) - 1] }))
      .filter((v) => !!v.name)
      .sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ venues });
  } catch {
    return NextResponse.json({ error: '取得中にエラーが発生しました' }, { status: 500 });
  }
}
