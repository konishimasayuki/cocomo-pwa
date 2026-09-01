'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, defaultSettings, cocomoSequence } from '@/lib/cocomo';

function fmt(n: number) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' });
    router.push('/login');
  }

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .finally(() => setLoading(false));
  }, []);

  async function save(next: Settings) {
    setSettings(next);
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: next })
    }).catch(() => {});
  }

  async function resetSlot(slot: 'A' | 'B') {
    if (!confirm(`ベット${slot}の数列・収支をリセットします。よろしいですか？`)) return;
    await fetch(`/api/state?slot=${slot}`, { method: 'DELETE' });
    setMsg(`ベット${slot}をリセットしました`);
  }

  async function resetAll() {
    if (!confirm('設定・収支・履歴をすべてリセットします。よろしいですか？')) return;
    await fetch('/api/state', { method: 'DELETE' });
    setSettings(defaultSettings());
    setMsg('全体をリセットしました');
  }

  const simRows = useMemo(() => {
    const seq = cocomoSequence(15);
    let cumA = 0;
    let cumB = 0;
    return seq.map((units, i) => {
      cumA += units * settings.baseUnitA;
      cumB += units * settings.baseUnitB;
      return { n: i + 1, cumA, cumB };
    });
  }, [settings.baseUnitA, settings.baseUnitB]);

  if (loading) {
    return <div className="page" style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-muted)' }}>読み込み中…</div>;
  }

  return (
    <div className="page">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>設定</h1>
      </header>

      <div className="card">
        <div className="field-row">
          <span>基本ベット単位（ベットA）</span>
          <input
            type="number"
            value={settings.baseUnitA}
            onChange={(e) => save({ ...settings, baseUnitA: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="field-row">
          <span>基本ベット単位（ベットB）</span>
          <input
            type="number"
            value={settings.baseUnitB}
            onChange={(e) => save({ ...settings, baseUnitB: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="field-row">
          <span>推奨最低オッズ</span>
          <input
            type="number"
            step="0.1"
            value={settings.minOdds}
            onChange={(e) => save({ ...settings, minOdds: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="field-row">
          <span>開始資金</span>
          <input
            type="number"
            value={settings.initialCapital}
            onChange={(e) => save({ ...settings, initialCapital: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          15連敗までの資金の流れ（いくら用意すべきかの目安）
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr', gap: 4, fontSize: 11, color: 'var(--text-muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
          <div>連敗</div>
          <div style={{ textAlign: 'right' }}>ベットA累計</div>
          <div style={{ textAlign: 'right' }}>ベットB累計</div>
        </div>
        {simRows.map((r) => (
          <div
            key={r.n}
            style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr', gap: 4, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ color: 'var(--text-muted)' }}>{r.n}回目</div>
            <div className="mono" style={{ textAlign: 'right' }}>{fmt(r.cumA)}</div>
            <div className="mono" style={{ textAlign: 'right' }}>{fmt(r.cumB)}</div>
          </div>
        ))}
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 10 }}>
          「n回目」はn連敗した時点でそのベットに賭ける金額の累計です。この金額まで負け続けても賭け続けられる資金を用意しておくと安心です。
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>リセット</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => resetSlot('A')} style={resetBtnStyle}>ベットAのみ</button>
          <button onClick={() => resetSlot('B')} style={resetBtnStyle}>ベットBのみ</button>
        </div>
        <button onClick={resetAll} style={{ ...resetBtnStyle, width: '100%', color: 'var(--loss)' }}>
          全体をリセット（履歴も削除）
        </button>
      </div>

      <div className="card">
        <button onClick={logout} style={{ ...resetBtnStyle, width: '100%' }}>ログアウト</button>
      </div>

      {msg && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{msg}</div>}

      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 16 }}>
        ※ ココモ法は配当3倍前後のベットを想定した投資法です。推奨最低オッズはあくまで目安なので、実際の運用ルールに合わせて調整してください。
      </div>
    </div>
  );
}

const resetBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 0',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: 12.5
};
