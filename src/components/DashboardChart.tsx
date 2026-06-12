'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#d946ef',
  '#0ea5e9', '#84cc16', '#f43f5e', '#6366f1', '#a855f7',
  '#10b981', '#f59e0b', '#64748b', '#1d4ed8', '#b91c1c',
]

const TOTAL_MATCHES = 72

function niceScale([rawMin, rawMax]: [number, number], padding = 0.1) {
  if (rawMin === 0 && rawMax === 0) return { min: -100, max: 100, step: 50 }
  const range = rawMax - rawMin
  const paddedMin = rawMin - range * padding
  const paddedMax = rawMax + range * padding
  const full = paddedMax - paddedMin
  const magnitude = Math.pow(10, Math.floor(Math.log10(full)))
  const residual = full / magnitude
  const step =
    residual <= 1.5 ? magnitude * 0.2 :
    residual <= 3 ? magnitude * 0.5 :
    residual <= 7 ? magnitude * 1 :
    magnitude * 2
  return {
    min: Math.floor(paddedMin / step) * step,
    max: Math.ceil(paddedMax / step) * step,
    step,
  }
}

interface User {
  id: number
  display_name: string
}

interface Point {
  matchIndex: number
  matchLabel: string
  date: string
  pl: Record<string, number>
}

interface ChartData {
  users: User[]
  series: Point[]
}

function formatTeam(name: string): string {
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  const point: Point | undefined = payload[0]?.payload
  if (!point) return null

  const items = payload
    .filter((p: any) => p.value !== undefined && p.value !== null)
    .sort((a: any, b: any) => b.value - a.value)

  const gameNum = Number(label)

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-header">
        {gameNum === 0 ? 'Start' : `Game ${gameNum} of ${TOTAL_MATCHES}`}
        {point.matchLabel && <span className="chart-tooltip-subheader">{point.matchLabel}</span>}
        {point.date && <span className="chart-tooltip-date">{point.date}</span>}
      </div>
      {items.map((entry: any) => (
        <div key={entry.dataKey} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ background: entry.color }} />
          <span className="chart-tooltip-name">{entry.name}</span>
          <span className={`chart-tooltip-value ${Number(entry.value) >= 0 ? 'positive' : 'negative'}`}>
            {Number(entry.value) >= 0 ? '+' : ''}${Number(entry.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardChart() {
  const [data, setData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hiddenUsers, setHiddenUsers] = useState<Set<number>>(new Set())

  const toggleUser = (id: number) =>
    setHiddenUsers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  useEffect(() => {
    fetch('/api/chart')
      .then((r) => r.json())
      .then((res) => setData(res))
      .finally(() => setLoading(false))
  }, [])

  const [rawMin, rawMax] = useMemo(() => {
    if (!data) return [0, 0]
    let min = 0, max = 0
    for (const point of data.series) {
      for (const u of data.users) {
        const val = point.pl[u.id]
        if (val < min) min = val
        if (val > max) max = val
      }
    }
    return [min, max]
  }, [data])

  const scale = useMemo(() => niceScale([rawMin, rawMax]), [rawMin, rawMax])

  const ticks = useMemo(() => {
    const result: number[] = []
    for (let v = scale.min; v <= scale.max + scale.step / 2; v += scale.step) {
      result.push(Math.round(v * 100) / 100)
    }
    return result
  }, [scale])

  if (loading) return <div className="chart-status">Loading chart...</div>
  if (!data || data.series.length <= 1) return <div className="chart-status">No completed matches yet</div>

  const completedCount = data.series.length - 1
  const animDuration = Math.max(500, Math.round((2 * Math.log(0.2 * completedCount) + 3) * 1000))

  const visibleUsers = data.users.filter((u) => !hiddenUsers.has(u.id))
  const displayData = data.series

  return (
    <div className="dashboard-chart">
      <h2 className="section-title">Cumulative P/L Over Time</h2>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={displayData} margin={{ top: 10, right: 8, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a45" />
          <XAxis
            dataKey="matchIndex"
            domain={[0, TOTAL_MATCHES]}
            type="number"
            tick={false}
            label={{ value: 'Matches', position: 'insideBottomRight', offset: -8, style: { fill: '#7f8ea3', fontSize: 13 } }}
          />
          <YAxis
            domain={[scale.min, scale.max]}
            ticks={ticks}
            tick={{ fill: '#7f8ea3', fontSize: 12 }}
            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}$${v}`}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />
          {visibleUsers.map((u, i) => {
            const colorIndex = data.users.findIndex((x) => x.id === u.id)
            return (
              <Line
                key={u.id}
                type="monotone"
                dataKey={`pl.${u.id}`}
                name={u.display_name}
                stroke={COLORS[colorIndex % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive
                animationDuration={animDuration}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>

      <div className="chart-legend">
        {data.users.map((u, i) => {
          const visible = !hiddenUsers.has(u.id)
          return (
            <button
              key={u.id}
              className={`chart-legend-btn ${visible ? '' : 'muted'}`}
              onClick={() => toggleUser(u.id)}
            >
              <span className="chart-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="chart-legend-name">{u.display_name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
