'use client';

import { useEffect, useMemo, useState } from 'react';
import { SPORT_VENUES, SportType } from '@/lib/venues';
import {
  Settings,
  SlotState,
  HistoryEntry,
  defaultSettings,
  defaultSlotState,
  computeNextBet,
  cycleInvested,
  applyResult
} from '@/lib/cocomo';

const SPORTS: SportType[] = ['競艇', '競馬', '競輪', 'オート'];

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
  const [combos, setCombos] = useState<string[]>(['1-2']);
  const [saving, setSaving] = useState(false);

  const [activeVenues, setActiveVenues] = useState<{ code: string; name: string }[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);

  const [winModalOpen, setWinModalOpen] = useState(false);
  const [winOdds, setWinOdds] = useState('');

  // 種目を切り替えたら会場を先頭にリセット
  useEffect(() => {
    setVenue(SPORT_VENUES[sport][0]);
    setActiveVenues([]);
    setRace(1);
  }, [sport]);

  // 競艇のみ: 日付が変わったら「その日に開催中の会場」一覧を取得
  useEffect(() => {
    if (sport !== '競艇') return;
    const hd = date.replace(/-/g, '');
    setVenuesLoading(true);
    fetch(`/api/schedule?hd=${hd}`)
      .then((r) => r.json())
      .then((d) => {
        const venues = d.venues ?? [];
        setActiveVenues(venues);
        if (venues.length > 0 && !venues.some((v: { name: string }) => v.name === venue)) {
          setVenue(venues[0].name);
        }
      })
      .catch(() => setActiveVenues([]))
      .finally(() => setVenuesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, sport]);

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

  function updateCombo(i: number, v: string) {
    setCombos((prev) => prev.map((c, idx) => (idx === i ? v : c)));
  }
  function addCombo() {
    setCombos((prev) => (prev.length >= 10 ? prev : [...prev, '']));
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

  async function recordResult(won: boolean, oddsNum: number | null) {
    const actualBet = Number(actualBetInput) || undefined;
    const { nextState, bet, pl } = applyResult(state, baseUnit, won, oddsNum, actualBet);

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
      combo: combos.map((c) => c.trim()).filter(Boolean).length > 0
        ? combos.map((c) => c.trim()).filter(Boolean)
        : ['-'],
      bet,
      odds: oddsNum,
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
    setWinModalOpen(true);
  }

  function confirmWin() {
    const n = parseFloat(winOdds);
    if (!n || n <= 0) return;
    setWinModalOpen(false);
    recordResult(true, n);
  }

  const winOddsWarn = winOdds !== '' && parseFloat(winOdds) > 0 && parseFloat(winOdds) < settings.minOdds;

  if (loading) {
    return <div className="page" style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-muted)' }}>読み込み中…</div>;
  }

  const venueOptions = sport === '競艇' && activeVenues.length > 0 ? activeVenues.map((v) => v.name) : SPORT_VENUES[sport];

  return (
    <div className="page">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>ココモ法 資金管理</h1>
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
          <span>会場{venuesLoading ? '（更新中…）' : ''}</span>
          <select value={venue} onChange={(e) => setVenue(e.target.value)}>
            {venueOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        {sport === '競艇' && activeVenues.length === 0 && !venuesLoading && (
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'right', marginTop: -6, marginBottom: 8 }}>
            本日開催中の会場が見つかりませんでした（全会場を表示中）
          </div>
        )}
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
              <input
                type="text"
                value={c}
                onChange={(e) => updateCombo(i, e.target.value)}
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
        <div className="mono" style={{ fontSize: 42, fontWeight: 700, color: 'var(--accent)', margin: '4px 0' }}>
          {fmt(nextBet)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {state.step + 1}投目 / 数列 [{state.sequence.slice(0, state.step + 1).join(', ')}
          {state.step >= state.sequence.length ? '…' : ''}]
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          今サイクルの投入累計: {fmt(invested + nextBet)}
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
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, textAlign: 'center' }}>払戻オッズを入力</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>
              {venue} {race}R ・ 賭け目 {combos.filter(Boolean).join(', ') || '-'} ・ ベット額 {fmt(Number(actualBetInput) || 0)}
            </div>
            <input
              type="number"
              step="0.1"
              autoFocus
              value={winOdds}
              onChange={(e) => setWinOdds(e.target.value)}
              placeholder="例: 3.5"
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
                disabled={!winOdds || parseFloat(winOdds) <= 0}
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
