import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

// 会場の当日12レース分の締切予定時刻を取得する
export async function GET(req: NextRequest) {
  const jcd = req.nextUrl.searchParams.get('jcd');
  const hd = req.nextUrl.searchParams.get('hd');
  if (!jcd || !hd) return NextResponse.json({ error: 'jcd, hd は必須です' }, { status: 400 });

  const url = `https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${jcd}&hd=${hd}`;

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
    const $ = cheerio.load(html);

    const races: { race: number; deadline: string | null }[] = [];
    $('.table1 table tbody tr').each((_, tr) => {
      const tds = $(tr).find('td');
      const raceLabel = tds.eq(0).text().trim(); // 例: "1R"
      const m = raceLabel.match(/^(\d+)R/);
      if (!m) return;
      const raceNum = Number(m[1]);
      const timeText = tds.eq(1).text().trim(); // 例: "15:26"
      const deadline = /^\d{1,2}:\d{2}$/.test(timeText) ? timeText : null;
      races.push({ race: raceNum, deadline });
    });

    if (races.length === 0) {
      return NextResponse.json({ error: 'レース時刻を取得できませんでした' }, { status: 502 });
    }

    return NextResponse.json({ races });
  } catch {
    return NextResponse.json({ error: '取得中にエラーが発生しました' }, { status: 500 });
  }
}
