'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoryEntry, FundEntry } from '@/lib/cocomo';

function fmt(n: number) {
  const sign = n < 0 ? '-' : '';
  return sign + '¥' + Math.abs(Math.round(n)).toLocaleString('ja-JP');
}

type Point = { n: number; funds: number; pl: number };

function buildPoints(entries: HistoryEntry[], funds: FundEntry[], initialCapital: number): Point[] {
  type Ev = { ts: number; kind: 'bet' | 'fund'; delta: number; affectsFunds: boolean };
  const events: Ev[] = [
    ...entries.map((e) => ({ ts: e.ts, kind: 'bet' as const, delta: e.pl, affectsFunds: true })),
    ...funds.map((f) => ({ ts: f.ts, kind: 'fund' as const, delta: f.amount, affectsFunds: true }))
  ].sort((a, b) => a.ts - b.ts);

  let runningPL = 0;
  let runningFunds = initialCapital;
  return events.map((ev, i) => {
    if (ev.kind === 'bet') runningPL += ev.delta;
    runningFunds += ev.delta;
    return { n: i + 1, funds: runningFunds, pl: runningPL };
  });
}

function ScrollChart({
  points,
  dataKey,
  color,
  label
}: {
  points: Point[];
  dataKey: 'funds' | 'pl';
  color: string;
  label: string;
}) {
  const width = Math.max(320, points.length * 34);

  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ width }}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={points} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="n"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                label={{ value: '回数', position: 'insideBottomRight', fill: 'var(--text-muted)', fontSize: 10, dy: 10 }}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={54}
                tickFormatter={(v) => fmt(v)}
              />
              <Tooltip
                contentStyle={{ background: 'var(--panel-2)', border: '1px solid var(--border)', fontSize: 11 }}
                labelFormatter={(v) => `${v}回目`}
                formatter={(v: number) => [fmt(v), label]}
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default function TrendCharts({
  entries,
  funds,
  initialCapital
}: {
  entries: HistoryEntry[];
  funds: FundEntry[];
  initialCapital: number;
}) {
  const points = buildPoints(entries, funds, initialCapital);

  if (points.length < 2) {
    return (
      <div className="card">
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
          記録が増えると資金・収支の推移グラフが表示されます
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <ScrollChart points={points} dataKey="funds" color="var(--accent)" label="資金の推移" />
      <div style={{ height: 18 }} />
      <ScrollChart points={points} dataKey="pl" color="var(--win)" label="累計損益の推移" />
    </div>
  );
}
