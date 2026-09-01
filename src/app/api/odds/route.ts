import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic';

// 公式サイトの「オッズ（2連単・2連複）」ページをサーバー側で取得し、
// 2連単オッズだけを { "1-2": 5.4, ... } の形に変換して返す。
// 個人利用の範囲での軽い参照用途を想定（高頻度アクセスは避けること）。
export async function GET(req: NextRequest) {
  const jcd = req.nextUrl.searchParams.get('jcd');
  const hd = req.nextUrl.searchParams.get('hd');
  const rno = req.nextUrl.searchParams.get('rno');

  if (!jcd || !hd || !rno) {
    return NextResponse.json({ error: 'jcd, hd, rno は必須です' }, { status: 400 });
  }

  const url = `https://www.boatrace.jp/owpc/pc/race/odds2tf?rno=${rno}&jcd=${jcd}&hd=${hd}`;

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

    // 「2連単オッズ」の見出し(h3)の直後にある兄弟 div.table1 内のテーブルを取得
    let table: cheerio.Cheerio<any> = $();
    $('h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('2連単オッズ')) {
        const found = $(el).parent().next('.table1').find('table').first();
        if (found.length) table = found;
      }
    });

    // フォールバック: ページ内で最初に出てくる table1 table（2連単が先頭にあるレイアウト）
    if (table.length === 0) {
      table = $('.table1 table').first();
    }

    if (table.length === 0) {
      return NextResponse.json({ error: 'オッズ表が見つかりませんでした（ページ構成が変わった可能性）' }, { status: 502 });
    }

    const headerBoats: string[] = [];
    table
      .find('thead th')
      .each((i, th) => {
        const text = $(th).text().trim();
        if (i % 2 === 0 && /^\d$/.test(text)) headerBoats.push(text);
      });

    const combos: Record<string, number> = {};

    table.find('tbody tr').each((_, tr) => {
      const tds = $(tr).find('td');
      // 12個のtdが (2着艇番号, オッズ) x6組で並んでいる
      for (let g = 0; g < headerBoats.length; g++) {
        const boatTd = tds.eq(g * 2);
        const oddsTd = tds.eq(g * 2 + 1);
        const secondBoat = boatTd.text().trim();
        const oddsText = oddsTd.text().trim();
        const odds = parseFloat(oddsText);
        if (secondBoat && !Number.isNaN(odds)) {
          combos[`${headerBoats[g]}-${secondBoat}`] = odds;
        }
      }
    });

    if (Object.keys(combos).length === 0) {
      return NextResponse.json({ error: 'オッズを解析できませんでした' }, { status: 502 });
    }

    return NextResponse.json({ combos, sourceUrl: url });
  } catch (e) {
    return NextResponse.json({ error: '取得中にエラーが発生しました' }, { status: 500 });
  }
}
