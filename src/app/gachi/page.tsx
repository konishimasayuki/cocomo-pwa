'use client';

import { useEffect, useState } from 'react';

type GachiRace = {
  label: string;
  href: string;
  probability: string;
  deadline: string | null;
};

export default function GachiPage() {
  const [races, setRaces] = useState<GachiRace[]>([]);
  const [fetchedAt, setFetchedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(force = false) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/poseidon${force ? '?force=1' : ''}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '取得できませんでした');
      } else {
        setRaces(data.races ?? []);
        setFetchedAt(data.fetchedAt ?? '');
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

  const fetchedAtLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric' })
    : '';

  return (
    <div className="page">
      <header style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600 }}>ガチガチレース</h1>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            イン逃げ濃厚レース（ポセイドンAI予想）{fetchedAtLabel ? ` ・ 取得: ${fetchedAtLabel}` : ''}
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 12, flexShrink: 0 }}
        >
          {loading ? '更新中…' : '更新'}
        </button>
      </header>

      {error && <div style={{ fontSize: 12, color: 'var(--loss)', textAlign: 'center', marginBottom: 12 }}>{error}</div>}
      {loading && races.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>取得中…</div>
      )}
      {!loading && !error && races.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>
          データがありません
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {races.map((r, i) => (
          <div
            key={r.href || i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '11px 14px',
              borderBottom: i === races.length - 1 ? 'none' : '1px solid var(--border)'
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {r.deadline ? `締切 ${r.deadline}` : '-'}
              </div>
            </div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
              {r.probability}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 14 }}>
        ※ 毎朝8時頃に自動取得し、以後はその内容を保持します（更新ボタンで手動再取得も可能）。データの的中を保証するものではありません。
      </div>
    </div>
  );
}
