'use client';

import { useState } from 'react';

const ROWS = 5;

function fmt(n: number) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

type RowResult = { stake: number; payout: number } | null;

export default function GouseiPage() {
  const [oddsInputs, setOddsInputs] = useState<string[]>(Array(ROWS).fill(''));
  const [totalStake, setTotalStake] = useState('');
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [combinedOdds, setCombinedOdds] = useState<number | null>(null);
  const [actualStakeTotal, setActualStakeTotal] = useState<number | null>(null);
  const [error, setError] = useState('');

  function updateOdds(i: number, v: string) {
    setOddsInputs((prev) => prev.map((o, idx) => (idx === i ? v : o)));
    setResults(null);
    setCombinedOdds(null);
    setActualStakeTotal(null);
  }

  function calculate() {
    setError('');
    const total = Number(totalStake);
    const parsed = oddsInputs.map((v) => {
      const n = parseFloat(v);
      return n && n > 0 ? n : null;
    });
    const validCount = parsed.filter((n) => n != null).length;

    if (!total || total <= 0) {
      setError('賭け金を入力してください');
      return;
    }
    if (validCount === 0) {
      setError('オッズを1つ以上入力してください');
      return;
    }

    const W = parsed.reduce((s: number, o) => s + (o ? 1 / o : 0), 0);

    // 理論上の配分を出したあと、賭け金は100円単位（最低100円）に丸める
    const rowResults: RowResult[] = parsed.map((o) => {
      if (!o) return null;
      const rawStake = (total * (1 / o)) / W;
      const stake = Math.max(100, Math.round(rawStake / 100) * 100);
      const payout = stake * o;
      return { stake, payout };
    });

    const actualTotal = rowResults.reduce((s, r) => s + (r ? r.stake : 0), 0);
    const payouts = rowResults.filter((r): r is { stake: number; payout: number } => !!r).map((r) => r.payout);
    const minPayout = Math.min(...payouts);

    setResults(rowResults);
    setActualStakeTotal(actualTotal);
    setCombinedOdds(actualTotal > 0 ? minPayout / actualTotal : null);
  }

  return (
    <div className="page">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>合成オッズ計算</h1>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          複数の目に分けて賭けたとき、どの目が来ても配当が同じになるよう賭け金を配分します
        </div>
      </header>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 74px 74px', gap: 6, fontSize: 10.5, color: 'var(--text-muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div>オッズ</div>
          <div style={{ textAlign: 'right' }}>賭け金</div>
          <div style={{ textAlign: 'right' }}>配当</div>
        </div>
        {oddsInputs.map((v, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 74px 74px', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <input
              type="number"
              step="0.1"
              value={v}
              onChange={(e) => updateOdds(i, e.target.value)}
              placeholder={`${i + 1}点目のオッズ`}
              style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: 6,
                padding: '8px 9px',
                fontSize: 13
              }}
            />
            <div className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>
              {results && results[i] ? fmt(results[i]!.stake) : '-'}
            </div>
            <div className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--win)' }}>
              {results && results[i] ? fmt(results[i]!.payout) : '-'}
            </div>
          </div>
        ))}

        <div className="field-row" style={{ marginTop: 4 }}>
          <span>賭け金（合計）</span>
          <input
            type="number"
            value={totalStake}
            onChange={(e) => {
              setTotalStake(e.target.value);
              setResults(null);
              setCombinedOdds(null);
              setActualStakeTotal(null);
            }}
            placeholder="例: 3000"
          />
        </div>

        {error && <div style={{ fontSize: 11, color: 'var(--loss)', textAlign: 'center', margin: '8px 0' }}>{error}</div>}

        <button
          onClick={calculate}
          style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#0B1F33', fontWeight: 700, fontSize: 14, marginTop: 8 }}
        >
          計算実行
        </button>
      </div>

      {combinedOdds != null && actualStakeTotal != null && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>実質合成オッズ（最低保証ライン）</div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--accent)', margin: '4px 0' }}>
            {combinedOdds.toFixed(2)}倍
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            賭け金は100円単位に調整済み・実際の合計賭け金 {fmt(actualStakeTotal)}
            {Number(totalStake) && actualStakeTotal !== Number(totalStake) && (
              <> （入力值 {fmt(Number(totalStake))} から調整）</>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
            どの目が的中しても、配当は最低{fmt(combinedOdds * actualStakeTotal)}以上になります
          </div>
        </div>
      )}
    </div>
  );
}
