'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, defaultSettings, cocomoSequence } from '@/lib/cocomo';
import PasswordConfirmModal from '@/components/PasswordConfirmModal';

function fmt(n: number) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | { title: string; run: () => void }>(null);

  // 数値入力はキー入力のたびに保存すると通信の順序次第で古い値が勝ってしまう
  // （例: 10000と打っている途中の1000が後から上書きしてしまう）ため、
  // ローカルで文字列として保持し、フォーカスが外れた時だけ保存する
  const [baseUnitAInput, setBaseUnitAInput] = useState('');
  const [baseUnitBInput, setBaseUnitBInput] = useState('');
  const [minOddsInput, setMinOddsInput] = useState('');
  const [initialCapitalInput, setInitialCapitalInput] = useState('');

  async function logout() {
    await fetch('/api/login', { method: 'DELETE' });
    router.push('/login');
  }

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setBaseUnitAInput(String(d.settings.baseUnitA));
        setBaseUnitBInput(String(d.settings.baseUnitB));
        setMinOddsInput(String(d.settings.minOdds));
        setInitialCapitalInput(String(d.settings.initialCapital));
      })
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

  function commitBaseUnitA() {
    save({ ...settings, baseUnitA: Number(baseUnitAInput) || 0 });
  }
  function commitBaseUnitB() {
    save({ ...settings, baseUnitB: Number(baseUnitBInput) || 0 });
  }
  function commitMinOdds() {
    save({ ...settings, minOdds: Number(minOddsInput) || 0 });
  }
  function commitInitialCapital() {
    const value = Number(initialCapitalInput) || 0;
    if (value === settings.initialCapital) return;
    setConfirmAction({
      title: `開始資金を ${value.toLocaleString('ja-JP')}円 に変更します`,
      run: () => save({ ...settings, initialCapital: value })
    });
  }

  function requestResetSlot(slot: 'A' | 'B') {
    setConfirmAction({
      title: `ベット${slot}の数列・収支をリセットします`,
      run: async () => {
        await fetch(`/api/state?slot=${slot}`, { method: 'DELETE' });
        setMsg(`ベット${slot}をリセットしました`);
      }
    });
  }

  function requestResetAll() {
    setConfirmAction({
      title: '設定・収支・履歴をすべてリセットします',
      run: async () => {
        await fetch('/api/state', { method: 'DELETE' });
        setSettings(defaultSettings());
        setMsg('全体をリセットしました');
      }
    });
  }

  const simRows = useMemo(() => {
    const seq = cocomoSequence(15);
    let cumA = 0;
    let cumB = 0;
    return seq.map((units, i) => {
      const betA = units * settings.baseUnitA;
      const betB = units * settings.baseUnitB;
      cumA += betA;
      cumB += betB;
      return { n: i + 1, betA, betB, cumA, cumB };
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
            value={baseUnitAInput}
            onChange={(e) => setBaseUnitAInput(e.target.value)}
            onBlur={commitBaseUnitA}
          />
        </div>
        <div className="field-row">
          <span>基本ベット単位（ベットB）</span>
          <input
            type="number"
            value={baseUnitBInput}
            onChange={(e) => setBaseUnitBInput(e.target.value)}
            onBlur={commitBaseUnitB}
          />
        </div>
        <div className="field-row">
          <span>推奨最低オッズ</span>
          <input
            type="number"
            step="0.1"
            value={minOddsInput}
            onChange={(e) => setMinOddsInput(e.target.value)}
            onBlur={commitMinOdds}
          />
        </div>
        <div className="field-row">
          <span>開始資金（変更には確認あり）</span>
          <input
            type="number"
            value={initialCapitalInput}
            onChange={(e) => setInitialCapitalInput(e.target.value)}
            onBlur={commitInitialCapital}
          />
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          15連敗までの資金の流れ（いくら用意すべきか・その回にいくら賭けるか）
        </div>
        <div style={{ minWidth: 400 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 1fr 1fr', gap: 4, fontSize: 10.5, color: 'var(--text-muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
            <div>連敗</div>
            <div style={{ textAlign: 'right' }}>Aベット額</div>
            <div style={{ textAlign: 'right' }}>A累計</div>
            <div style={{ textAlign: 'right' }}>Bベット額</div>
            <div style={{ textAlign: 'right' }}>B累計</div>
          </div>
          {simRows.map((r) => (
            <div
              key={r.n}
              style={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 1fr 1fr', gap: 4, fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}
            >
              <div style={{ color: 'var(--text-muted)' }}>{r.n}回目</div>
              <div className="mono" style={{ textAlign: 'right' }}>{fmt(r.betA)}</div>
              <div className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(r.cumA)}</div>
              <div className="mono" style={{ textAlign: 'right' }}>{fmt(r.betB)}</div>
              <div className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(r.cumB)}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 10 }}>
          「n回目」はn連敗した時点でのそのベットの金額(ベット額)と、そこまでの投入合計(累計)です。例えば13回目ならその時点で賭ける金額が「Aベット額」の列で分かります。
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>リセット</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={() => requestResetSlot('A')} style={resetBtnStyle}>ベットAのみ</button>
          <button onClick={() => requestResetSlot('B')} style={resetBtnStyle}>ベットBのみ</button>
        </div>
        <button onClick={requestResetAll} style={{ ...resetBtnStyle, width: '100%', color: 'var(--loss)' }}>
          全体をリセット（履歴も削除）
        </button>
      </div>

      <div className="card">
        <button onClick={logout} style={{ ...resetBtnStyle, width: '100%' }}>ログアウト</button>
      </div>

      {msg && <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{msg}</div>}

      <PasswordConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title ?? ''}
        onCancel={() => setConfirmAction(null)}
        onSuccess={() => {
          confirmAction?.run();
          setConfirmAction(null);
        }}
      />
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
