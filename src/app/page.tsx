'use client';

import { useEffect, useMemo, useState } from 'react';
import { VENUES, venueCode } from '@/lib/venues';
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

  const [date, setDate] = useState(todayStr());
  const [venue, setVenue] = useState(VENUES[0]);
  const [race, setRace] = useState(1);
  const [combo, setCombo] = useState('1-2');
  const [odds, setOdds] = useState('2.7');
  const [saving, setSaving] = useState(false);

  const [activeVenues, setActiveVenues] = useState<{ code: string; name: string }[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [raceTimes, setRaceTimes] = useState<{ race: number; deadline: string | null }[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);

  const [oddsGrid, setOddsGrid] = useState<Record<string, number> | null>(null);
  const [oddsLoading, setOddsLoading] = useState(false);
  const [oddsError, setOddsError] = useState('');

  // 日付が変わったら「その日に開催中の会場」一覧を取得
  useEffect(() => {
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
  }, [date]);

  // 会場か日付が変わったら、その会場の各レース締切時刻を取得
  useEffect(() => {
    const hd = date.replace(/-/g, '');
    const jcd = venueCode(venue);
    setRacesLoading(true);
    fetch(`/api/racetimes?jcd=${jcd}&hd=${hd}`)
      .then((r) => r.json())
      .then((d) => setRaceTimes(d.races ?? []))
      .catch(() => setRaceTimes([]))
      .finally(() => setRacesLoading(false));
  }, [date, venue]);

  const isToday = date === todayStr();
  const nowHM = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  const availableRaces = useMemo(() => {
    if (raceTimes.length === 0) return Array.from({ length: 12 }, (_, i) => i + 1);
    return raceTimes
      .filter((r) => !isToday || !r.deadline || r.deadline >= nowHM)
      .map((r) => r.race);
  }, [raceTimes, isToday, nowHM]);

  useEffect(() => {
    if (availableRaces.length > 0 && !availableRaces.includes(race)) {
      setRace(availableRaces[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRaces]);

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

  async function recordResult(won: boolean) {
    const oddsNum = won ? parseFloat(odds) || 0 : null;
    const { nextState, bet, pl } = applyResult(state, baseUnit, won, oddsNum);

    const nextSlotA = activeSlot === 'A' ? nextState : slotA;
    const nextSlotB = activeSlot === 'B' ? nextState : slotB;
    setSlotA(nextSlotA);
    setSlotB(nextSlotB);

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      date,
      venue,
      race,
      slot: activeSlot,
      combo: combo.trim() || '-',
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

  const oddsWarn = odds !== '' && parseFloat(odds) < settings.minOdds;

  async function fetchOdds() {
    setOddsLoading(true);
    setOddsError('');
    setOddsGrid(null);
    try {
      const hd = date.replace(/-/g, '');
      const jcd = venueCode(venue);
      const res = await fetch(`/api/odds?jcd=${jcd}&hd=${hd}&rno=${race}`);
      const data = await res.json();
      if (!res.ok) {
        setOddsError(data.error || 'オッズを取得できませんでした');
      } else {
        setOddsGrid(data.combos);
      }
    } catch {
      setOddsError('通信エラーが発生しました');
    } finally {
      setOddsLoading(false);
    }
  }

  if (loading) {
    return <div className="page" style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-muted)' }}>読み込み中…</div>;
  }

  return (
    <div className="page">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>ココモ法 資金管理</h1>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>競艇 / 推奨オッズ {settings.minOdds}倍以上</div>
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
        <div className="field-row">
          <span>会場{venuesLoading ? '（更新中…）' : ''}</span>
          <select value={venue} onChange={(e) => setVenue(e.target.value)}>
            {(activeVenues.length > 0 ? activeVenues.map((v) => v.name) : VENUES).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        {activeVenues.length === 0 && !venuesLoading && (
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'right', marginTop: -6, marginBottom: 8 }}>
            本日開催中の会場が見つかりませんでした（全会場を表示中）
          </div>
        )}
        <div className="field-row">
          <span>レース{racesLoading ? '（更新中…）' : ''}</span>
          <select value={race} onChange={(e) => setRace(Number(e.target.value))}>
            {availableRaces.map((r) => (
              <option key={r} value={r}>{r}R</option>
            ))}
          </select>
        </div>
        {isToday && availableRaces.length === 0 && !racesLoading && (
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'right', marginTop: -6 }}>
            本日はこの後の発売中レースがありません
          </div>
        )}
      </div>

      {/* トートボード風表示 */}
      <div className="card" style={{ textAlign: 'center', padding: '22px 16px 16px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>次のベット額（ベット{activeSlot}）</div>
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
      </div>

      <div className="card">
        <div className="field-row">
          <span>賭け目（例: 1-2）</span>
          <input type="text" value={combo} onChange={(e) => setCombo(e.target.value)} placeholder="1-2" style={{ textAlign: 'right' }} />
        </div>
        <div className="field-row">
          <span>払戻オッズ（勝った場合）</span>
          <input type="number" step="0.1" value={odds} onChange={(e) => setOdds(e.target.value)} />
        </div>
        {oddsWarn && (
          <div style={{ fontSize: 11, color: 'var(--loss)', marginTop: 6, textAlign: 'right' }}>
            推奨オッズ({settings.minOdds}倍)未満です
          </div>
        )}
        <button
          onClick={fetchOdds}
          disabled={oddsLoading}
          style={{ width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12 }}
        >
          {oddsLoading ? '取得中…' : `${venue} ${race}R の2連単オッズを取得`}
        </button>
        {oddsError && <div style={{ fontSize: 11, color: 'var(--loss)', marginTop: 8, textAlign: 'center' }}>{oddsError}</div>}
        {oddsGrid && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 6, textAlign: 'center' }}>
              タップすると上のオッズ欄に反映されます
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
              {Object.entries(oddsGrid)
                .sort((a, b) => a[1] - b[1])
                .map(([combo, v]) => (
                  <button
                    key={combo}
                    onClick={() => {
                      setOdds(String(v));
                      setCombo(combo);
                    }}
                    style={{
                      padding: '6px 2px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--panel-2)',
                      color: 'var(--text)',
                      fontSize: 10.5
                    }}
                  >
                    <div className="mono" style={{ color: 'var(--text-muted)' }}>{combo}</div>
                    <div className="mono" style={{ fontWeight: 600 }}>{v}</div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => recordResult(true)}
          style={{ flex: 1, padding: '16px 0', borderRadius: 10, border: 'none', background: 'var(--win)', color: '#0B1F33', fontWeight: 700, fontSize: 16 }}
        >
          勝ち
        </button>
        <button
          onClick={() => recordResult(false)}
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
    </div>
  );
}
