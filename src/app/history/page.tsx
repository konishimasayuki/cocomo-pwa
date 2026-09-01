'use client';

import { useEffect, useState } from 'react';
import { HistoryEntry } from '@/lib/cocomo';

function fmt(n: number) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

  const shown = entries.filter((e) => filter === 'ALL' || e.slot === filter);

  return (
    <div className="page">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>履歴</h1>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>直近{entries.length}件</div>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['ALL', 'A', 'B'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
              background: filter === f ? 'rgba(232,163,61,0.12)' : 'var(--panel)',
              color: filter === f ? 'var(--text)' : 'var(--text-muted)',
              fontSize: 12
            }}
          >
            {f === 'ALL' ? '全て' : `ベット${f}`}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>読み込み中…</div>}
      {!loading && shown.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>まだ記録がありません</div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {shown.map((h, i) => (
          <div
            key={h.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '58px 1fr 60px 44px 74px',
              gap: 6,
              fontSize: 11.5,
              padding: '10px 14px',
              borderBottom: i === shown.length - 1 ? 'none' : '1px solid var(--border)',
              alignItems: 'center'
            }}
          >
            <div style={{ color: 'var(--text-muted)' }}>{h.date.slice(5)}</div>
            <div style={{ color: 'var(--text-muted)' }}>
              {h.venue} {h.race}R ・{h.slot}
            </div>
            <div className="mono" style={{ textAlign: 'right' }}>{fmt(h.bet)}</div>
            <div style={{ textAlign: 'center', fontWeight: 700, color: h.won ? 'var(--win)' : 'var(--loss)' }}>
              {h.won ? '勝ち' : '負け'}
            </div>
            <div className="mono" style={{ textAlign: 'right' }}>{fmt(h.running)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
