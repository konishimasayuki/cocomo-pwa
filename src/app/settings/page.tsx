'use client';

import { useEffect, useState } from 'react';
import { Settings, defaultSettings } from '@/lib/cocomo';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

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
