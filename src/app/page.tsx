'use client';

import { useEffect, useMemo, useState } from 'react';
import { SPORT_VENUES, SportType } from '@/lib/venues';
import {
  Settings,
  SlotState,
  HistoryEntry,
  BET_TYPES,
  defaultSettings,
  defaultSlotState,
  computeNextBet,
  cycleInvested,
  cocomoSequence,
  applyResult
} from '@/lib/cocomo';

const SPORTS: SportType[] = ['競艇', '競馬', '競輪', 'オート'];

type ComboEntry = { type: string; value: string };

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmt(n: number) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [slotA, setSlotA] = useState<SlotState>(defaultSlotState());
  const [slotB, setSlotB] = useState<SlotState>(defaultSlotState());

  const [sport, setSport] = useState<SportType>('競艇');
  const [date, setDate] = useState(todayStr());
  const [venue, setVenue] = useState(SPORT_VENUES['競艇'][0]);
  const [race, setRace] = useState(1);
  const [combos, setCombos] = useState<ComboEntry[]>([{ type: '二連単', value: '1-2' }]);
  const [saving, setSaving] = useState(false);

  const [winModalOpen, setWinModalOpen] = useState(false);
  const [winMode, setWinMode] = useState<'odds' | 'payout'>('odds');
  const [winOdds, setWinOdds] = useState('');
  const [winPayout, setWinPayout] = useState('');

  // 種目を切り替えたら会場を先頭にリセット
  useEffect(() => {
    setVenue(SPORT_VENUES[sport][0]);
    setRace(1);
  }, [sport]);

  // レースは常に1〜12Rを表示（締切時刻での絞り込みは重いため撤去）
  const availableRaces = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setSlotA(d.slotA);
        setSlotB(d.slotB);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeSlot = settings.activeSlot;
  const state = activeSlot === 'A' ? slotA : slotB;
  const baseUnit = activeSlot === 'A' ? settings.baseUnitA : settings.baseUnitB;

  const nextBet = useMemo(() => computeNextBet(state, baseUnit), [state, baseUnit]);
  const invested = useMemo(() => cycleInvested(state, baseUnit), [state, baseUnit]);

  const [actualBetInput, setActualBetInput] = useState(String(nextBet));

  // 理論上の次ベット額が変わったら（スロット切替・勝敗確定後など）実際のベット額欄も追従させる
  useEffect(() => {
    setActualBetInput(String(nextBet));
  }, [nextBet]);

  const actualBetDiffers = actualBetInput !== '' && Number(actualBetInput) !== nextBet;

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

  async function saveAll(newSettings: Settings, newSlotA: SlotState, newSlotB: SlotState) {
    setSaving(true);
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: newSettings, slotA: newSlotA, slotB: newSlotB })
    }).catch(() => {});
    setSaving(false);
  }

  function switchSlot(slot: 'A' | 'B') {
    const next = { ...settings, activeSlot: slot };
    setSettings(next);
    saveAll(next, slotA, slotB);
  }

  function adjustStep(delta: number) {
    const newStep = Math.max(0, state.step + delta);
    const sequence = cocomoSequence(newStep + 1);
    const nextState: SlotState = { ...state, sequence, step: newStep };

    const nextSlotA = activeSlot === 'A' ? nextState : slotA;
    const nextSlotB = activeSlot === 'B' ? nextState : slotB;
    setSlotA(nextSlotA);
    setSlotB(nextSlotB);
    saveAll(settings, nextSlotA, nextSlotB);
  }

  async function recordResult(won: boolean, oddsNum: number | null, payoutNum: number | null = null) {
    const actualBet = Number(actualBetInput) || undefined;
    const { nextState, bet, pl } = applyResult(state, baseUnit, won, oddsNum, actualBet, payoutNum);

    const nextSlotA = activeSlot === 'A' ? nextState : slotA;
    const nextSlotB = activeSlot === 'B' ? nextState : slotB;
    setSlotA(nextSlotA);
    setSlotB(nextSlotB);

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      date,
      sport,
      venue,
      race,
      slot: activeSlot,
      step: state.step + 1,
      combo: combos.map((c) => ({ ...c, value: c.value.trim() })).filter((c) => c.value).length > 0
        ? combos.map((c) => ({ ...c, value: c.value.trim() })).filter((c) => c.value)
        : [{ type: combos[0]?.type || '二連単', value: '-' }],
      bet,
      odds: oddsNum,
      payout: payoutNum,
      won,
      pl,
      running: nextState.totalPL
    };

    await Promise.all([
      saveAll(settings, nextSlotA, nextSlotB),
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      }).catch(() => {})
    ]);
  }

  function openWinModal() {
    setWinOdds('');
    setWinPayout('');
    setWinMode('odds');
    setWinModalOpen(true);
  }

  function confirmWin() {
    if (winMode === 'odds') {
      const n = parseFloat(winOdds);
      if (!n || n <= 0) return;
      setWinModalOpen(false);
      recordResult(true, n, null);
    } else {
      const n = parseFloat(winPayout);
      if (!n || n <= 0) return;
      setWinModalOpen(false);
      recordResult(true, null, n);
    }
  }

  const winOddsWarn = winMode === 'odds' && winOdds !== '' && parseFloat(winOdds) > 0 && parseFloat(winOdds) < settings.minOdds;
  const winConfirmDisabled = winMode === 'odds' ? !winOdds || parseFloat(winOdds) <= 0 : !winPayout || parseFloat(winPayout) <= 0;


  if (loading) {
    return <div className="page" style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-muted)' }}>読み込み中…</div>;
  }

  const venueOptions = SPORT_VENUES[sport];

  return (
    <div className="page">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>資金管理</h1>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>推奨オッズ {settings.minOdds}倍以上</div>
      </header>

      {/* スロット切替 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['A', 'B'] as const).map((s) => (
          <button
            key={s}
            onClick={() => switchSlot(s)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 8,
              border: `1px solid ${activeSlot === s ? 'var(--accent)' : 'var(--border)'}`,
              background: activeSlot === s ? 'rgba(232,163,61,0.12)' : 'var(--panel)',
              color: activeSlot === s ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: 13
            }}
          >
            ベット{s}
          </button>
        ))}
      </div>

      {/* レース入力 */}
      <div className="card">
        <div className="field-row">
          <span>日付</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>種目</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {SPORTS.map((s) => (
              <button
                key={s}
                onClick={() => setSport(s)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 8,
                  border: `1px solid ${sport === s ? 'var(--accent)' : 'var(--border)'}`,
                  background: sport === s ? 'rgba(232,163,61,0.12)' : 'var(--panel-2)',
                  color: sport === s ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: 12
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="field-row">
          <span>会場</span>
          <select value={venue} onChange={(e) => setVenue(e.target.value)}>
            {venueOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <span>レース</span>
          <select value={race} onChange={(e) => setRace(Number(e.target.value))}>
            {availableRaces.map((r) => (
              <option key={r} value={r}>{r}R</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>賭け目（例: 1-2）</div>
          {combos.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <select
                value={c.type}
                onChange={(e) => updateComboType(i, e.target.value)}
                style={{
                  width: 84,
                  flexShrink: 0,
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 6,
                  padding: '7px 4px',
                  fontSize: 11.5
                }}
              >
                {BET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="text"
                value={c.value}
                onChange={(e) => updateComboValue(i, e.target.value)}
                placeholder="1-2"
                style={{
                  flex: 1,
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 6,
                  padding: '7px 9px',
                  fontSize: 13,
                  textAlign: 'left'
                }}
              />
              {combos.length > 1 && (
                <button
                  onClick={() => removeCombo(i)}
                  style={{ width: 36, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 14 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {combos.length < 10 && (
            <button
              onClick={addCombo}
              style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12.5, marginTop: 2 }}
            >
              + 賭け目を追加
            </button>
          )}
        </div>
      </div>

      {/* トートボード風表示 */}
      <div className="card" style={{ textAlign: 'center', padding: '22px 16px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>次のベット額（理論値・ベット{activeSlot}）</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '4px 0' }}>
          <span className="mono" style={{ fontSize: 16, color: 'var(--text-muted)' }}>{state.step + 1}戦目</span>
          <span className="mono" style={{ fontSize: 42, fontWeight: 700, color: 'var(--accent)' }}>
            {fmt(nextBet)}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              onClick={() => adjustStep(1)}
              style={{ width: 26, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1 }}
            >
              ▲
            </button>
            <button
              onClick={() => adjustStep(-1)}
              disabled={state.step === 0}
              style={{ width: 26, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--panel-2)', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1 }}
            >
              ▼
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          今サイクルの投入累計: {fmt(invested)}
        </div>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            実際に賭けた金額（複数点買いなどでズレる場合はここを修正）
          </div>
          <input
            type="number"
            value={actualBetInput}
            onChange={(e) => setActualBetInput(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 10px',
              fontSize: 22,
              fontWeight: 700,
              textAlign: 'center',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--panel-2)',
              color: 'var(--text)'
            }}
          />
          {actualBetDiffers && (
            <div style={{ fontSize: 10.5, color: 'var(--accent)', marginTop: 6 }}>
              理論値から{fmt(Number(actualBetInput) - nextBet)}のズレ
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button
          onClick={openWinModal}
          style={{ flex: 1, padding: '16px 0', borderRadius: 10, border: 'none', background: 'var(--win)', color: '#0B1F33', fontWeight: 700, fontSize: 16 }}
        >
          勝ち
        </button>
        <button
          onClick={() => recordResult(false, null)}
          style={{ flex: 1, padding: '16px 0', borderRadius: 10, border: 'none', background: 'var(--loss)', color: '#F5EAE8', fontWeight: 700, fontSize: 16 }}
        >
          負け
        </button>
      </div>

      <div className="card" style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ベットA 収支</div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: slotA.totalPL >= 0 ? 'var(--win)' : 'var(--loss)' }}>
            {fmt(slotA.totalPL)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ベットB 収支</div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: slotB.totalPL >= 0 ? 'var(--win)' : 'var(--loss)' }}>
            {fmt(slotB.totalPL)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>合計</div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
            {fmt(slotA.totalPL + slotB.totalPL)}
          </div>
        </div>
      </div>

      {saving && <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>保存中…</div>}

      {/* 払戻オッズ入力モーダル（勝ち押下時） */}
      {winModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20
          }}
          onClick={() => setWinModalOpen(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 340, margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textAlign: 'center' }}>払戻の入力</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>
              {venue} {race}R ・ 賭け目 {combos.filter((c) => c.value).map((c) => `${c.type} ${c.value}`).join(', ') || '-'} ・ ベット額 {fmt(Number(actualBetInput) || 0)}
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                onClick={() => setWinMode('odds')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 8,
                  border: `1px solid ${winMode === 'odds' ? 'var(--accent)' : 'var(--border)'}`,
                  background: winMode === 'odds' ? 'rgba(232,163,61,0.12)' : 'var(--panel-2)',
                  color: winMode === 'odds' ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: 12
                }}
              >
                オッズで入力
              </button>
              <button
                onClick={() => setWinMode('payout')}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 8,
                  border: `1px solid ${winMode === 'payout' ? 'var(--accent)' : 'var(--border)'}`,
                  background: winMode === 'payout' ? 'rgba(232,163,61,0.12)' : 'var(--panel-2)',
                  color: winMode === 'payout' ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: 12
                }}
              >
                配当金額で入力
              </button>
            </div>

            {winMode === 'odds' ? (
              <>
                <input
                  type="number"
                  step="0.1"
                  autoFocus
                  value={winOdds}
                  onChange={(e) => setWinOdds(e.target.value)}
                  placeholder="オッズ 例: 3.5"
                  style={{
                    width: '100%',
                    padding: '14px 12px',
                    fontSize: 20,
                    textAlign: 'center',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--panel-2)',
                    color: 'var(--text)',
                    marginBottom: 8
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8 }}>
                  ベット額全体×オッズで計算されます。複数点買いなど当たった点だけのオッズでは正しく出ない場合は「配当金額で入力」を使ってください。
                </div>
              </>
            ) : (
              <>
                <input
                  type="number"
                  autoFocus
                  value={winPayout}
                  onChange={(e) => setWinPayout(e.target.value)}
                  placeholder="配当金額（受け取った総額）"
                  style={{
                    width: '100%',
                    padding: '14px 12px',
                    fontSize: 20,
                    textAlign: 'center',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--panel-2)',
                    color: 'var(--text)',
                    marginBottom: 8
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 8 }}>
                  払戻金の合計金額をそのまま入力してください（オッズからは計算しません）。
                </div>
              </>
            )}

            {winOddsWarn && (
              <div style={{ fontSize: 11, color: 'var(--loss)', textAlign: 'center', marginBottom: 8 }}>
                推奨オッズ({settings.minOdds}倍)未満です
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setWinModalOpen(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13 }}
              >
                キャンセル
              </button>
              <button
                onClick={confirmWin}
                disabled={winConfirmDisabled}
                style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', background: 'var(--win)', color: '#0B1F33', fontWeight: 700, fontSize: 13 }}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
