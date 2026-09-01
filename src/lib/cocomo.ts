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

export type HistoryEntry = {
  id: string;
  ts: number;
  date: string;   // YYYY-MM-DD
  sport: string;  // 競馬/競艇/競輪/オート
  venue: string;
  race: number;
  slot: 'A' | 'B';
  combo: string;  // 賭け目（例: "1-2"）
  bet: number;
  odds: number | null;
  won: boolean;
  pl: number;
  running: number; // そのスロットの累計収支（この記録時点）
};

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
  odds: number | null
): { nextState: SlotState; bet: number; pl: number } {
  const seq = ensureSequence(state.sequence, state.step);
  const bet = seq[state.step] * baseUnit;
  const pl = won ? bet * ((odds ?? 0) - 1) : -bet;

  const totalPL = state.totalPL + pl;
  const peak = Math.max(state.peak, totalPL);
  const maxDrawdown = Math.max(state.maxDrawdown, peak - totalPL);

  const nextState: SlotState = won
    ? { sequence: [1, 1], step: 0, totalPL, peak, maxDrawdown }
    : { sequence: seq, step: state.step + 1, totalPL, peak, maxDrawdown };

  return { nextState, bet, pl };
}
