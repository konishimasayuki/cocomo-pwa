'use client';

import { useEffect, useMemo, useState } from 'react';
import { HistoryEntry, FundEntry, Settings, SlotState, defaultSettings, defaultSlotState } from '@/lib/cocomo';
import PasswordConfirmModal from '@/components/PasswordConfirmModal';
import EditHistoryModal from '@/components/EditHistoryModal';
import TrendCharts from '@/components/TrendCharts';

function fmt(n: number) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const COLS = '78px 40px 150px 90px 64px 50px 44px 78px 78px 32px 32px';

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [funds, setFunds] = useState<FundEntry[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [slotA, setSlotA] = useState<SlotState>(defaultSlotState());
  const [slotB, setSlotB] = useState<SlotState>(defaultSlotState());
  const [filter, setFilter] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [loading, setLoading] = useState(true);

  const [showAddFund, setShowAddFund] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [fundNote, setFundNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [fundError, setFundError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<null | { type: 'history' | 'fund'; id: string }>(null);
  const [editTarget, setEditTarget] = useState<HistoryEntry | null>(null);

  async function loadAll() {
    const [h, f, s] = await Promise.all([
      fetch('/api/history').then((r) => r.json()),
      fetch('/api/funds').then((r) => r.json()),
      fetch('/api/state').then((r) => r.json())
    ]);
    setEntries(h.entries ?? []);
    setFunds(f.entries ?? []);
    setSettings(s.settings);
    setSlotA(s.slotA);
    setSlotB(s.slotB);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const totalPL = slotA.totalPL + slotB.totalPL;
  const depositTotal = useMemo(() => funds.reduce((a, f) => a + f.amount, 0), [funds]);
  const currentFunds = settings.initialCapital + depositTotal + totalPL;

  const shown = entries.filter((e) => filter === 'ALL' || e.slot === filter);

  async function submitFund() {
    const amount = Number(fundAmount);
    if (!amount) {
      setFundError('金額を入力してください');
      return;
    }
    setFundError('');
    setSaving(true);
    const entry: FundEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      date: todayStr(),
      amount,
      note: fundNote
    };
    try {
      const res = await fetch('/api/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFundError(data.error || '保存に失敗しました');
        setSaving(false);
        return;
      }
      setFundAmount('');
      setFundNote('');
      setShowAddFund(false);
      await loadAll();
    } catch {
      setFundError('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    const path = deleteTarget.type === 'history' ? '/api/history' : '/api/funds';
    await fetch(`${path}?id=${deleteTarget.id}`, { method: 'DELETE' }).catch(() => {});
    setDeleteTarget(null);
    loadAll();
  }

  return (
    <div className="page">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>履歴</h1>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>直近{entries.length}件</div>
      </header>

      {/* 資金サマリー */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>今の資金</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{fmt(currentFunds)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>収支（ベットのみ）</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: totalPL >= 0 ? 'var(--win)' : 'var(--loss)' }}>
              {fmt(totalPL)}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 10 }}>
          開始資金 {fmt(settings.initialCapital)} + 入出金合計 {fmt(depositTotal)} + 収支 {fmt(totalPL)}
        </div>

        {!showAddFund && (
          <button
            onClick={() => setShowAddFund(true)}
            style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 12.5 }}
          >
            + 資金を追加・引き出し登録
          </button>
        )}

        {showAddFund && (
          <div>
            <div className="field-row">
              <span>金額（引き出しはマイナス）</span>
              <input type="number" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} placeholder="10000" />
            </div>
            <div className="field-row">
              <span>メモ</span>
              <input type="text" value={fundNote} onChange={(e) => setFundNote(e.target.value)} placeholder="任意" style={{ textAlign: 'left' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={submitFund}
                disabled={saving}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#0B1F33', fontWeight: 700, fontSize: 12.5 }}
              >
                {saving ? '登録中…' : '登録'}
              </button>
              <button
                onClick={() => { setShowAddFund(false); setFundError(''); }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12.5 }}
              >
                キャンセル
              </button>
            </div>
            {fundError && <div style={{ fontSize: 11, color: 'var(--loss)', textAlign: 'center', marginTop: 8 }}>{fundError}</div>}
          </div>
        )}
      </div>

      {/* 資金・損益の推移グラフ */}
      <TrendCharts entries={entries} funds={funds} initialCapital={settings.initialCapital} />

      {/* 入出金履歴 */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '18px 0 8px' }}>入出金履歴</div>
      <div className="card" style={{ padding: 0 }}>
        {funds.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>まだ記録がありません</div>
        ) : (
          funds.map((f, i) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                fontSize: 11.5,
                padding: '9px 14px',
                borderBottom: i === funds.length - 1 ? 'none' : '1px solid var(--border)'
              }}
            >
              <span className="mono" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                {f.date.slice(5)} {fmtTime(f.ts)}
              </span>
              <span style={{ color: 'var(--text-muted)', flex: 1, minWidth: 0, textAlign: 'right', overflowWrap: 'break-word' }}>
                {f.note || (f.amount >= 0 ? '資金追加' : '引き出し')}
              </span>
              <span className="mono" style={{ flexShrink: 0, color: f.amount >= 0 ? 'var(--win)' : 'var(--loss)' }}>
                {fmt(f.amount)}
              </span>
              <button
                onClick={() => setDeleteTarget({ type: 'fund', id: f.id })}
                style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13 }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* ベット履歴フィルタ */}
      <div style={{ display: 'flex', gap: 8, margin: '18px 0 14px' }}>
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

      {shown.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ minWidth: 790 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: COLS,
                gap: 4,
                fontSize: 10,
                color: 'var(--text-muted)',
                padding: '8px 10px',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <div>日時</div>
              <div>戦目</div>
              <div>内容</div>
              <div>賭け目</div>
              <div style={{ textAlign: 'right' }}>ベット額</div>
              <div style={{ textAlign: 'right' }}>オッズ</div>
              <div style={{ textAlign: 'center' }}>結果</div>
              <div style={{ textAlign: 'right' }}>当選金額</div>
              <div style={{ textAlign: 'right' }}>累計収支</div>
              <div></div>
              <div></div>
            </div>
            {shown.map((h, i) => {
              const payout = h.won ? (h.payout ?? (h.odds ? h.bet * h.odds : null)) : null;
              return (
                <div
                  key={h.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: COLS,
                    gap: 4,
                    fontSize: 11,
                    padding: '9px 10px',
                    borderBottom: i === shown.length - 1 ? 'none' : '1px solid var(--border)',
                    alignItems: 'center'
                  }}
                >
                  <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>
                    {h.date.slice(5)} {fmtTime(h.ts)}
                  </div>
                  <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>
                    {h.step ? `${h.step}戦目` : '-'}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>
                    {h.sport ? `[${h.sport}] ` : ''}{h.venue} {h.race}R・{h.slot}
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    {Array.isArray(h.combo)
                      ? h.combo.map((c: any) => (typeof c === 'string' ? c : `${c.type} ${c.value}`)).join(', ')
                      : h.combo || '-'}
                  </div>
                  <div className="mono" style={{ textAlign: 'right' }}>{fmt(h.bet)}</div>
                  <div className="mono" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{h.odds ?? '-'}</div>
                  <div style={{ textAlign: 'center', fontWeight: 700, color: h.won ? 'var(--win)' : 'var(--loss)' }}>
                    {h.won ? '勝ち' : '負け'}
                  </div>
                  <div className="mono" style={{ textAlign: 'right', color: 'var(--win)' }}>{payout ? fmt(payout) : '-'}</div>
                  <div className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(h.running)}</div>
                  <button
                    onClick={() => setEditTarget(h)}
                    style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, justifySelf: 'center' }}
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: 'history', id: h.id })}
                    style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, justifySelf: 'center' }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editTarget && (
        <EditHistoryModal
          entry={editTarget}
          onCancel={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            loadAll();
          }}
        />
      )}

      <PasswordConfirmModal
        open={!!deleteTarget}
        title="この記録を削除します"
        onCancel={() => setDeleteTarget(null)}
        onSuccess={doDelete}
      />
    </div>
  );
}
