'use client';

import { useEffect, useState } from 'react';

type GachiRace = {
  label: string;
  href: string;
  probability: string;
  deadline: string | null;
};

export default function GachiPage() {
  const [sport, setSport] = useState<'boat' | 'keirin'>('boat');
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
    if (sport === 'boat') load();
  }, [sport]);

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
          disabled={loading || sport !== 'boat'}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: 12, flexShrink: 0 }}
        >
          {loading ? '更新中…' : '更新'}
        </button>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          onClick={() => setSport('boat')}
          style={{
            flex: 1,
            padding: '9px 0',
            borderRadius: 8,
            border: `1px solid ${sport === 'boat' ? 'var(--accent)' : 'var(--border)'}`,
            background: sport === 'boat' ? 'rgba(232,163,61,0.12)' : 'var(--panel)',
            color: sport === 'boat' ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: 13
          }}
        >
          競艇
        </button>
        <button
          onClick={() => setSport('keirin')}
          style={{
            flex: 1,
            padding: '9px 0',
            borderRadius: 8,
            border: `1px solid ${sport === 'keirin' ? 'var(--accent)' : 'var(--border)'}`,
            background: sport === 'keirin' ? 'rgba(232,163,61,0.12)' : 'var(--panel)',
            color: sport === 'keirin' ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: 13
          }}
        >
          競輪
        </button>
      </div>

      {sport === 'keirin' && (
        <div className="card" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          競輪のガチガチレース(gamboo.jp)は、サイト側のrobots.txtで自動取得(クローラー・bot)が明示的に禁止されているため、この方法では取得できません。ルールを守れる形で使える別の競輪予想サイトが分かれば、そちらで対応します。
        </div>
      )}

      {sport === 'boat' && (
        <>
      {error && <div style={{ fontSize: 12, color: 'var(--loss)', textAlign: 'center', marginBottom: 12 }}>{error}</div>}
      {loading && races.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>取得中…</div>
      )}
      {!loading && !error && races.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0' }}>
          データがありません
        </div>
      )}

      {races.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 14px 6px', fontSize: 10.5, color: 'var(--text-muted)' }}>
          <span>レース</span>
          <span>AI予想確率</span>
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
        </>
      )}
    </div>
  );
}
