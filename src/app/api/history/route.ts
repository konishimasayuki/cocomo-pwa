import { NextRequest, NextResponse } from 'next/server';
import { redis, KEYS } from '@/lib/redis';
import { HistoryEntry, SlotState, computePL, recomputeSlotStats, replaySlotSequence } from '@/lib/cocomo';

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

async function rewriteAndRecompute(all: HistoryEntry[]) {
  const slotStats: Record<'A' | 'B', { totalPL: number; peak: number; maxDrawdown: number; sequence: number[]; step: number }> = {
    A: { totalPL: 0, peak: 0, maxDrawdown: 0, sequence: [1, 1], step: 0 },
    B: { totalPL: 0, peak: 0, maxDrawdown: 0, sequence: [1, 1], step: 0 }
  };

  (['A', 'B'] as const).forEach((slot) => {
    const slotEntries = all.filter((e) => e.slot === slot);
    // recomputeSlotStatsはentries内のrunningを書き換える（元配列のオブジェクト参照を変更）
    const stats = recomputeSlotStats(slotEntries);
    const { sequence, step } = replaySlotSequence(slotEntries);
    slotStats[slot] = { ...stats, sequence, step };
  });

  await redis.del(KEYS.history);
  if (all.length > 0) {
    await redis.rpush(KEYS.history, ...all);
  }

  const [slotA, slotB] = await Promise.all([
    redis.get<SlotState>(KEYS.slot('A')),
    redis.get<SlotState>(KEYS.slot('B'))
  ]);
  const ops: Promise<unknown>[] = [];
  if (slotA) ops.push(redis.set(KEYS.slot('A'), { ...slotA, ...slotStats.A }));
  if (slotB) ops.push(redis.set(KEYS.slot('B'), { ...slotB, ...slotStats.B }));
  await Promise.all(ops);
}

// 1件だけ削除（idで指定）。全件読み出して該当分を除いて書き戻し、
// 各スロットの収支・最大ドローダウン・数列（何投目か）を残った履歴から再計算する。
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 });

  const all = await redis.lrange<HistoryEntry>(KEYS.history, 0, -1);
  const remaining = all.filter((e) => e.id !== id);

  await rewriteAndRecompute(remaining);

  return NextResponse.json({ ok: true });
}

// 1件を編集（idで指定、bodyは更新後の全フィールド）。
// pl・runningを再計算し、両スロットの収支・数列も再計算する。
export async function PATCH(req: NextRequest) {
  const updated = (await req.json()) as HistoryEntry;
  if (!updated?.id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 });

  const all = await redis.lrange<HistoryEntry>(KEYS.history, 0, -1);
  const idx = all.findIndex((e) => e.id === updated.id);
  if (idx === -1) return NextResponse.json({ error: '対象の記録が見つかりません' }, { status: 404 });

  const merged: HistoryEntry = {
    ...all[idx],
    ...updated,
    pl: computePL(updated)
  };
  all[idx] = merged;

  await rewriteAndRecompute(all);

  return NextResponse.json({ ok: true });
}
