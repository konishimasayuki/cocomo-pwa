import { NextRequest, NextResponse } from 'next/server';
import { redis, KEYS } from '@/lib/redis';
import { HistoryEntry, SlotState } from '@/lib/cocomo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '200');
  // 新しい順（LPUSHしているので先頭が最新）
  const raw = await redis.lrange<HistoryEntry>(KEYS.history, 0, limit - 1);
  return NextResponse.json({ entries: raw });
}

export async function POST(req: NextRequest) {
  const entry = (await req.json()) as HistoryEntry;
  await redis.lpush(KEYS.history, entry);
  await redis.ltrim(KEYS.history, 0, 999); // 直近1000件まで保持
  return NextResponse.json({ ok: true });
}

// 1件だけ削除（idで指定）。全件読み出して該当分を除いて書き戻し、
// 各スロットの収支・最大ドローダウンを残った履歴から再計算する（数列・投目はそのまま）。
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 });

  const all = await redis.lrange<HistoryEntry>(KEYS.history, 0, -1);
  const remaining = all.filter((e) => e.id !== id);

  const slotStats: Record<'A' | 'B', { totalPL: number; peak: number; maxDrawdown: number }> = {
    A: { totalPL: 0, peak: 0, maxDrawdown: 0 },
    B: { totalPL: 0, peak: 0, maxDrawdown: 0 }
  };

  (['A', 'B'] as const).forEach((slot) => {
    const sorted = remaining.filter((e) => e.slot === slot).sort((a, b) => a.ts - b.ts);
    let running = 0;
    let peak = 0;
    let maxDD = 0;
    for (const e of sorted) {
      running += e.pl;
      peak = Math.max(peak, running);
      maxDD = Math.max(maxDD, peak - running);
      e.running = running; // 表示用の累計収支も再計算して整合させる
    }
    slotStats[slot] = { totalPL: running, peak, maxDrawdown: maxDD };
  });

  await redis.del(KEYS.history);
  if (remaining.length > 0) {
    await redis.rpush(KEYS.history, ...remaining);
  }

  const [slotA, slotB] = await Promise.all([
    redis.get<SlotState>(KEYS.slot('A')),
    redis.get<SlotState>(KEYS.slot('B'))
  ]);
  const ops: Promise<unknown>[] = [];
  if (slotA) ops.push(redis.set(KEYS.slot('A'), { ...slotA, ...slotStats.A }));
  if (slotB) ops.push(redis.set(KEYS.slot('B'), { ...slotB, ...slotStats.B }));
  await Promise.all(ops);

  return NextResponse.json({ ok: true });
}
