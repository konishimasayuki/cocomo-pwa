import * as cheerio from 'cheerio';
import { VENUES } from '@/lib/venues';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store', signal: controller.signal });
    if (!res.ok) throw new Error(`fetch failed (${res.status})`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function todayHdJST(): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  const d = parts.find((p) => p.type === 'day')!.value;
  return `${y}${m}${d}`;
}

export function nowHMJST(): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === 'hour')!.value.padStart(2, '0');
  const min = parts.find((p) => p.type === 'minute')!.value.padStart(2, '0');
  return `${h}:${min}`;
}

export async function fetchActiveVenues(hd: string): Promise<{ code: string; name: string }[]> {
  const html = await fetchHtml(`https://www.boatrace.jp/owpc/pc/race/index?hd=${hd}`);
  const codes = Array.from(new Set(Array.from(html.matchAll(/raceindex\?jcd=(\d{2})/g)).map((m) => m[1])));
  return codes
    .map((code) => ({ code, name: VENUES[Number(code) - 1] }))
    .filter((v) => !!v.name)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function fetchRaceTimes(
  jcd: string,
  hd: string
): Promise<{ race: number; deadline: string | null }[]> {
  const html = await fetchHtml(`https://www.boatrace.jp/owpc/pc/race/raceindex?jcd=${jcd}&hd=${hd}`);
  const $ = cheerio.load(html);
  const races: { race: number; deadline: string | null }[] = [];
  $('.table1 table tbody tr').each((_, tr) => {
    const tds = $(tr).find('td');
    const raceLabel = tds.eq(0).text().trim();
    const m = raceLabel.match(/^(\d+)R/);
    if (!m) return;
    const timeText = tds.eq(1).text().trim();
    const deadline = /^\d{1,2}:\d{2}$/.test(timeText) ? timeText : null;
    races.push({ race: Number(m[1]), deadline });
  });
  return races;
}

export type GachiRace = {
  label: string;   // 例: "大村9R"
  href: string;     // 例: "/race/20260902/24/9R"
  probability: string; // 例: "90.23%"
  deadline: string | null; // 例: "21:25"
};

// ポセイドン（poseidon-boatrace.net）の「本日の注目レース」から
// ガチガチレース（イン逃げ濃厚レースランキング）を取得する
export async function fetchPoseidonGachigachi(): Promise<GachiRace[]> {
  const html = await fetchHtml('https://poseidon-boatrace.net/pickup');
  const $ = cheerio.load(html);

  const races: GachiRace[] = [];
  $('#nigeru table tbody tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length === 0) return;
    const a = tds.eq(0).find('a');
    const label = a.text().trim();
    const href = a.attr('href') || '';
    const probability = tds.eq(1).text().trim();
    const resultCell = $(tr).find('td[colspan]');
    const cellText = resultCell.text();
    const m = cellText.match(/(\d{1,2}:\d{2})/);
    const deadline = m ? m[1] : null;
    if (label) races.push({ label, href, probability, deadline });
  });

  return races;
}

export async function fetchOdds2t(jcd: string, hd: string, rno: number): Promise<Record<string, number>> {
  const html = await fetchHtml(`https://www.boatrace.jp/owpc/pc/race/odds2tf?rno=${rno}&jcd=${jcd}&hd=${hd}`);
  const $ = cheerio.load(html);

  let table: cheerio.Cheerio<any> = $();
  $('h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text.includes('2連単オッズ')) {
      const found = $(el).parent().next('.table1').find('table').first();
      if (found.length) table = found;
    }
  });
  if (table.length === 0) table = $('.table1 table').first();

  const headerBoats: string[] = [];
  table.find('thead th').each((i, th) => {
    const text = $(th).text().trim();
    if (i % 2 === 0 && /^\d$/.test(text)) headerBoats.push(text);
  });

  const combos: Record<string, number> = {};
  table.find('tbody tr').each((_, tr) => {
    const tds = $(tr).find('td');
    for (let g = 0; g < headerBoats.length; g++) {
      const boatTd = tds.eq(g * 2);
      const oddsTd = tds.eq(g * 2 + 1);
      const secondBoat = boatTd.text().trim();
      const odds = parseFloat(oddsTd.text().trim());
      if (secondBoat && !Number.isNaN(odds)) combos[`${headerBoats[g]}-${secondBoat}`] = odds;
    }
  });
  return combos;
}
