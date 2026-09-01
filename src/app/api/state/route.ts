import { NextRequest, NextResponse } from 'next/server';
import { redis, KEYS } from '@/lib/redis';
import { defaultSettings, defaultSlotState, Settings, SlotState } from '@/lib/cocomo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [settings, slotA, slotB] = await Promise.all([
    redis.get<Settings>(KEYS.settings),
    redis.get<SlotState>(KEYS.slot('A')),
    redis.get<SlotState>(KEYS.slot('B'))
  ]);

  return NextResponse.json({
    settings: settings ?? defaultSettings(),
    slotA: slotA ?? defaultSlotState(),
    slotB: slotB ?? defaultSlotState()
  });
}

// body: { settings?: Settings, slotA?: SlotState, slotB?: SlotState }
// 送られたキーだけを上書き保存する
export async function POST(req: NextRequest) {
  const body = await req.json();
  const ops: Promise<unknown>[] = [];

  if (body.settings) ops.push(redis.set(KEYS.settings, body.settings));
  if (body.slotA) ops.push(redis.set(KEYS.slot('A'), body.slotA));
  if (body.slotB) ops.push(redis.set(KEYS.slot('B'), body.slotB));

  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}

// 個別スロットのリセット用: DELETE ?slot=A / DELETE ?slot=B / DELETE (全体)
export async function DELETE(req: NextRequest) {
  const slot = req.nextUrl.searchParams.get('slot');
  if (slot === 'A' || slot === 'B') {
    await redis.set(KEYS.slot(slot), defaultSlotState());
  } else {
    await Promise.all([
      redis.set(KEYS.slot('A'), defaultSlotState()),
      redis.set(KEYS.slot('B'), defaultSlotState()),
      redis.set(KEYS.settings, defaultSettings()),
      redis.del(KEYS.history),
      redis.del(KEYS.funds)
    ]);
  }
  return NextResponse.json({ ok: true });
}
