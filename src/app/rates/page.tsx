'use client';

import { useEffect, useState } from 'react';
import type { QuickRate } from '@/app/api/quickrates/route';

export default function RatesPage() {
  const [rates, setRates] = useState<QuickRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/quickrates');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '取得できませんでした');
      } else {
        setRates(data.results ?? []);
        setUpdatedAt(data.nowHM ?? '');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = [...rates].sort((a, b) => {
    if (a.odds12 == null) return 1;
    if (b.odds12 == null) return -1;
    return a.odds12 - b.odds12;
  });

  return (
    <div className="page">
      <header style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600 }}>参考倍率</h1>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            各会場・次締切レースの2連単「1-2」オッズ{updatedAt ? `（${updatedAt}時点）` : ''}
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 12 }}
        >
          {loading ? '更新中…' : '更新'}
        </button>
      </header>

      {error && <div style={{ fontSize: 12, color: 'var(--loss)', textAlign: 'center', marginBottom: 12 }}>{error}</div>}
      {loading && rates.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>取得中…</div>
      )}
      {!loading && !error && rates.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>
          本日開催中の会場が見つかりませんでした
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {sorted.map((r, i) => (
          <div
            key={r.code}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 70px 66px',
              gap: 6,
              alignItems: 'center',
              padding: '12px 14px',
              borderBottom: i === sorted.length - 1 ? 'none' : '1px solid var(--border)'
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.venue}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {r.nextRace ? `次: ${r.nextRace}R` : r.error || '終了'}
                {r.deadline ? `（締切 ${r.deadline}）` : ''}
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'right' }}>1-2</div>
            <div className="mono" style={{ fontSize: 17, fontWeight: 700, textAlign: 'right', color: r.odds12 ? 'var(--accent)' : 'var(--text-muted)' }}>
              {r.odds12 ? `${r.odds12}倍` : '-'}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 14 }}>
        ※ 公式サイトから都度取得しています。頻繁に更新ボタンを連打すると取得に時間がかかったり失敗したりすることがあります。
      </div>
    </div>
  );
}
