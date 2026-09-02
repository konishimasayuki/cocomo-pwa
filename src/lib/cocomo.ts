export type SlotState = {
  sequence: number[]; // 単位数の数列。既定 [1,1]
  step: number;       // 現在のベットが数列の何番目か（0始まり）
  totalPL: number;    // 累計収支（円）
  peak: number;       // 収支の最高到達点（ドローダウン計算用）
  maxDrawdown: number;
};

export type Settings = {
  baseUnitA: number;
  baseUnitB: number;
  minOdds: number; // 推奨最低オッズ（既定 2.7）
  activeSlot: 'A' | 'B';
  initialCapital: number; // 開始資金（円）
};

export const BET_TYPES = ['単勝', 'ワイド', '二連単', '二連複', '三連単', '三連複'];

export type HistoryEntry = {
  id: string;
  ts: number;
  date: string;   // YYYY-MM-DD
  sport: string;  // 競馬/競艇/競輪/オート
  venue: string;
  race: number;
  slot: 'A' | 'B';
  combo: { type: string; value: string }[]; // 賭け目（例: [{type:"二連単", value:"1-2"}]）複数買い対応
  bet: number;
  odds: number | null;   // オッズで入力した場合
  payout: number | null; // 配当金額で直接入力した場合（複数点買いなど、総賭け金×オッズが正しくないケース用）
  won: boolean;
  pl: number;
  running: number; // そのスロットの累計収支（この記録時点）
};

// 勝敗・ベット額・オッズ or 配当金額から損益を計算する
export function computePL(entry: Pick<HistoryEntry, 'won' | 'bet' | 'odds' | 'payout'>): number {
  if (!entry.won) return -entry.bet;
  if (entry.payout != null) return entry.payout - entry.bet;
  return entry.bet * ((entry.odds ?? 0) - 1);
}

// 履歴一覧（1スロット分）から running・totalPL・maxDrawdown を再計算する。
// entriesは破壊的にrunningを書き換える。ts昇順（古い順）に並んでいる必要はなく内部でソートする。
export function recomputeSlotStats(entries: HistoryEntry[]): { totalPL: number; peak: number; maxDrawdown: number } {
  const sorted = entries.slice().sort((a, b) => a.ts - b.ts);
  let running = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const e of sorted) {
    running += e.pl;
    peak = Math.max(peak, running);
    maxDrawdown = Math.max(maxDrawdown, peak - running);
    e.running = running;
  }
  return { totalPL: running, peak, maxDrawdown };
}

export type FundEntry = {
  id: string;
  ts: number;
  date: string;
  amount: number; // 追加は正の値、引き出しは負の値
  note: string;
};

export function defaultSlotState(): SlotState {
  return { sequence: [1, 1], step: 0, totalPL: 0, peak: 0, maxDrawdown: 0 };
}

export function defaultSettings(): Settings {
  return { baseUnitA: 100, baseUnitB: 200, minOdds: 2.7, activeSlot: 'A', initialCapital: 0 };
}

// ココモ法の数列（1,1,2,3,5,8...）を先頭からn項分返す（資金シミュレーション表示用）
export function cocomoSequence(n: number): number[] {
  const seq = [1, 1];
  while (seq.length < n) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
  return seq.slice(0, n);
}

// 数列が step まで足りない場合は前2項の和で伸ばす（フィボナッチ的な伸び方）
function ensureSequence(sequence: number[], step: number): number[] {
  const seq = sequence.slice();
  while (seq.length <= step) {
    const n = seq.length;
    seq.push(seq[n - 1] + seq[n - 2]);
  }
  return seq;
}

export function computeNextBet(state: SlotState, baseUnit: number): number {
  const seq = ensureSequence(state.sequence, state.step);
  return seq[state.step] * baseUnit;
}

// 現在のサイクルでこれまでに投入した合計額（表示用）
export function cycleInvested(state: SlotState, baseUnit: number): number {
  const seq = ensureSequence(state.sequence, state.step);
  let sum = 0;
  for (let i = 0; i < state.step; i++) sum += seq[i];
  return sum * baseUnit;
}

export function applyResult(
  state: SlotState,
  baseUnit: number,
  won: boolean,
  odds: number | null,
  actualBet?: number,
  payout?: number | null
): { nextState: SlotState; bet: number; pl: number } {
  const seq = ensureSequence(state.sequence, state.step);
  // 実際に賭けた金額（複数点買いやオッズの都合で理論値とずれることがある）を優先する
  const bet = actualBet != null && actualBet > 0 ? actualBet : seq[state.step] * baseUnit;
  const pl = won ? (payout != null ? payout - bet : bet * ((odds ?? 0) - 1)) : -bet;

  const totalPL = state.totalPL + pl;
  const peak = Math.max(state.peak, totalPL);
  const maxDrawdown = Math.max(state.maxDrawdown, peak - totalPL);

  const nextState: SlotState = won
    ? { sequence: [1, 1], step: 0, totalPL, peak, maxDrawdown }
    : { sequence: seq, step: state.step + 1, totalPL, peak, maxDrawdown };

  return { nextState, bet, pl };
}
