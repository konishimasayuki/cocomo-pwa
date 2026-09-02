'use client';

import { useState } from 'react';
import { HistoryEntry, BET_TYPES } from '@/lib/cocomo';

function fmt(n: number) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

export default function EditHistoryModal({
  entry,
  onCancel,
  onSaved
}: {
  entry: HistoryEntry;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(entry.date);
  const [venue, setVenue] = useState(entry.venue);
  const [race, setRace] = useState(String(entry.race));
  const [bet, setBet] = useState(String(entry.bet));
  const [combos, setCombos] = useState(
    entry.combo.length > 0 ? entry.combo.map((c) => ({ ...c })) : [{ type: '二連単', value: '' }]
  );
  const [won, setWon] = useState(entry.won);
  const [mode, setMode] = useState<'odds' | 'payout'>(entry.payout != null ? 'payout' : 'odds');
  const [odds, setOdds] = useState(entry.odds != null ? String(entry.odds) : '');
  const [payout, setPayout] = useState(entry.payout != null ? String(entry.payout) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateComboValue(i: number, v: string) {
    setCombos((prev) => prev.map((c, idx) => (idx === i ? { ...c, value: v } : c)));
  }
  function updateComboType(i: number, t: string) {
    setCombos((prev) => prev.map((c, idx) => (idx === i ? { ...c, type: t } : c)));
  }
  function addCombo() {
    setCombos((prev) => (prev.length >= 10 ? prev : [...prev, { type: '二連単', value: '' }]));
  }
  function removeCombo(i: number) {
    setCombos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save() {
    const betNum = Number(bet);
    if (!betNum || betNum <= 0) {
      setError('ベット額を入力してください');
      return;
    }
    const oddsNum = mode === 'odds' && odds ? parseFloat(odds) : null;
    const payoutNum = mode === 'payout' && payout ? parseFloat(payout) : null;
    if (won && mode === 'odds' && (!oddsNum || oddsNum <= 0)) {
      setError('オッズを入力してください');
      return;
    }
    if (won && mode === 'payout' && (!payoutNum || payoutNum <= 0)) {
      setError('配当金額を入力してください');
      return;
    }

    const updated: HistoryEntry = {
      ...entry,
      date,
      venue,
      race: Number(race) || entry.race,
      bet: betNum,
      combo: combos.map((c) => ({ ...c, value: c.value.trim() })).filter((c) => c.value),
      won,
      odds: won ? oddsNum : null,
      payout: won ? payoutNum : null
    };

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '保存に失敗しました');
        return;
      }
      onSaved();
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: 20,
        overflowY: 'auto'
      }}
      onClick={onCancel}
    >
      <div className="card" style={{ width: '100%', maxWidth: 360, margin: '20px 0' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>記録を編集</div>

        <div className="field-row">
          <span>日付</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field-row">
          <span>会場</span>
          <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} style={{ textAlign: 'left' }} />
        </div>
        <div className="field-row">
          <span>レース</span>
          <input type="number" value={race} onChange={(e) => setRace(e.target.value)} />
        </div>
        <div className="field-row">
          <span>ベット額</span>
          <input type="number" value={bet} onChange={(e) => setBet(e.target.value)} />
        </div>

        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, marginBottom: 6 }}>賭け目</div>
          {combos.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <select
                value={c.type}
                onChange={(e) => updateComboType(i, e.target.value)}
                style={{ width: 78, flexShrink: 0, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '6px 3px', fontSize: 11 }}
              >
                {BET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="text"
                value={c.value}
                onChange={(e) => updateComboValue(i, e.target.value)}
                style={{ flex: 1, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '6px 8px', fontSize: 12.5 }}
              />
              {combos.length > 1 && (
                <button onClick={() => removeCombo(i)} style={{ width: 32, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13 }}>×</button>
              )}
            </div>
          ))}
          {combos.length < 10 && (
            <button onClick={addCombo} style={{ width: '100%', padding: '7px 0', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11.5 }}>
              + 賭け目を追加
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setWon(true)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${won ? 'var(--win)' : 'var(--border)'}`, background: won ? 'rgba(63,167,150,0.15)' : 'var(--panel-2)', color: won ? 'var(--win)' : 'var(--text-muted)', fontWeight: 700, fontSize: 12.5 }}
          >
            勝ち
          </button>
          <button
            onClick={() => setWon(false)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${!won ? 'var(--loss)' : 'var(--border)'}`, background: !won ? 'rgba(209,85,74,0.15)' : 'var(--panel-2)', color: !won ? 'var(--loss)' : 'var(--text-muted)', fontWeight: 700, fontSize: 12.5 }}
          >
            負け
          </button>
        </div>

        {won && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => setMode('odds')}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${mode === 'odds' ? 'var(--accent)' : 'var(--border)'}`, background: mode === 'odds' ? 'rgba(232,163,61,0.12)' : 'var(--panel-2)', color: mode === 'odds' ? 'var(--text)' : 'var(--text-muted)', fontSize: 11.5 }}
              >
                オッズで入力
              </button>
              <button
                onClick={() => setMode('payout')}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${mode === 'payout' ? 'var(--accent)' : 'var(--border)'}`, background: mode === 'payout' ? 'rgba(232,163,61,0.12)' : 'var(--panel-2)', color: mode === 'payout' ? 'var(--text)' : 'var(--text-muted)', fontSize: 11.5 }}
              >
                配当金額で入力
              </button>
            </div>
            {mode === 'odds' ? (
              <input
                type="number"
                step="0.1"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                placeholder="オッズ"
                style={{ width: '100%', padding: '11px 10px', fontSize: 16, textAlign: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', marginBottom: 10 }}
              />
            ) : (
              <input
                type="number"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                placeholder="配当金額"
                style={{ width: '100%', padding: '11px 10px', fontSize: 16, textAlign: 'center', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text)', marginBottom: 10 }}
              />
            )}
          </>
        )}

        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8 }}>
          この記録の収支: {fmt(won ? (mode === 'payout' && payout ? Number(payout) - Number(bet) : Number(bet) * ((Number(odds) || 0) - 1)) : -Number(bet || 0))}
        </div>

        {error && <div style={{ fontSize: 11, color: 'var(--loss)', textAlign: 'center', marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13 }}>
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 1, padding: '11px 0', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#0B1F33', fontWeight: 700, fontSize: 13 }}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
