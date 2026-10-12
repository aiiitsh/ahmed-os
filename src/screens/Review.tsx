import { useEffect, useMemo, useState } from 'react'
import { useStore, putRows, uid } from '../lib/store'
import { addDays, dowShort, fmtClock, fmtDay, fmtDur, hhmm, localMinutes, weekDays, weekStart } from '../lib/time'
import { bedMinutes, fmt1, type WeekStats } from '../lib/stats'
import { buildJson, buildText, buildWeek } from '../lib/export'
import { deleteSleep, shiftSleep } from '../lib/actions'
import { toast } from '../lib/toast'
import { GROUPS, GOALS } from '../data/program'
import type { WeeklyReview } from '../lib/types'
import { isNap, WAKE_LABEL, type Night } from '../lib/sleep'
import { Bar, Label, Stepper, useLongPress } from '../components/ui'
import { Icon } from '../components/Icon'
import { WeekChart } from './Work'
import { Stat } from './Learn'

export function Review() {
  const data = useStore()
  const [which, setWhich] = useState<'this' | 'last'>('this')
  const start = which === 'this' ? weekStart() : addDays(weekStart(), -7)
  const { w, ins, changes } = useMemo(() => buildWeek(data, start), [data, start])
  const prevNotes = data.reviews.find((r) => r.week_start === addDays(start, -7))?.claude_notes
  const thisReview = data.reviews.find((r) => r.week_start === start)

  const saveReview = (notes?: string | null) => {
    const row: WeeklyReview = {
      user_id: uid(), week_start: start, summary: buildJson(data, start),
      claude_notes: notes !== undefined ? notes : thisReview?.claude_notes ?? null,
      created_at: thisReview?.created_at ?? new Date().toISOString(),
    }
    putRows('reviews', [row], 'user_id,week_start')
  }

  const copy = async () => {
    const text = buildText(data, start)
    try {
      await navigator.clipboard.writeText(text)
      toast('Week summary copied · paste it to Claude')
    } catch {
      download(`ahmed-os-week-${start}.txt`, text, 'text/plain')
      toast('Clipboard blocked · saved as a file instead')
    }
    saveReview()
  }
  const json = () => {
    download(`ahmed-os-week-${start}.json`, JSON.stringify(buildJson(data, start), null, 2), 'application/json')
    saveReview()
  }

  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <Label>{fmtDay(w.start)} → {fmtDay(w.end)}</Label>
          <h1 className="hero-word" style={{ fontSize: 34 }}>REVIEW</h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip${which === 'this' ? ' on' : ''}`} onClick={() => setWhich('this')}>This week</button>
          <button className={`chip${which === 'last' ? ' on' : ''}`} onClick={() => setWhich('last')}>Last week</button>
        </div>
      </header>

      {prevNotes && (
        <section className="panel deep stack" style={{ gap: 10 }}>
          <Label>Claude's notes · from last week</Label>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{prevNotes}</p>
        </section>
      )}

      <div className="cols c2">
        <section className="panel">
          <div className="panel-head"><Label>Insights</Label></div>
          <div className="stack" style={{ gap: 8 }}>
            {ins.map((i, k) => (
              <div key={k} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                <span className={`chip sm${i.bad ? ' warn' : ' on'}`} style={{ marginTop: 1 }}>{i.bad ? '!' : '✓'}</span>
                <span className="small" style={{ lineHeight: 1.5 }}>{i.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel stack" style={{ gap: 12 }}>
          <Label>Export for Claude</Label>
          <button className="btn btn-filled btn-big" onClick={copy}><Icon name="copy" size={20} /> Copy week summary</button>
          <button className="btn btn-big" onClick={json}><Icon name="download" size={20} /> Download JSON</button>
          <Notes key={start} initial={thisReview?.claude_notes ?? ''} onSave={(n) => { saveReview(n || null); toast("Claude's notes saved") }} />
        </section>
      </div>

      <div className="cols c2">
        <section className="panel stack" style={{ gap: 14 }}>
          <Label>Body</Label>
          <div className="grid3">
            <Stat v={w.workouts.length} k={`Sessions · A${w.byDayCode.A} B${w.byDayCode.B} C${w.byDayCode.C}`} />
            <Stat v={w.cardio.length} k="Cardio" />
            <Stat v={`${w.routineDays}/7`} k="Core routine" />
            <Stat v={w.swims.length} k="Swims" />
            <Stat v={w.hipFlexor} k="Hip flexor" />
            <Stat v={w.bodyweight.last != null ? `${w.bodyweight.last}` : '—'} k={w.bodyweight.last != null && w.bodyweight.before != null ? `KG · ${w.bodyweight.last - w.bodyweight.before >= 0 ? '+' : ''}${(w.bodyweight.last - w.bodyweight.before).toFixed(1)}` : 'Bodyweight'} />
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {GROUPS.map((g) => (
              <div key={g.key} className="stack" style={{ gap: 4 }}>
                <div className="row between"><span className="small">{g.label}</span><span className="mono small strong">{fmt1(w.groups[g.key])}/{g.hi}</span></div>
                <Bar value={w.groups[g.key]} max={g.hi} thin />
              </div>
            ))}
          </div>
          {changes.length > 0 && (
            <div className="list">
              {changes.map((c) => (
                <div key={c.key} className="li"><span className="grow">{c.name}</span><span className="mono small muted">{c.from} → {c.to}</span>
                  {c.dir > 0 && <Icon name="up" size={14} />}{c.dir < 0 && <Icon name="down" size={14} />}</div>
              ))}
            </div>
          )}
        </section>

        <div className="col">
          <SleepSection rows={w.sleep} start={start} avg={w.sl} />
          <section className="panel stack" style={{ gap: 12 }}>
            <div className="row between"><Label>Focus</Label><span className="mono small strong">{fmtDur(w.fo.total)} / {GOALS.focusHours}H</span></div>
            <WeekChart blocks={data.focus} start={start} />
            <div className="grid3">
              <Stat v={w.fo.blocks} k="Blocks" />
              <Stat v={`${Math.round(w.fo.longest)}M`} k="Longest" />
              <Stat v={w.fo.lost} k="Lost focus" />
            </div>
          </section>
          <section className="panel stack" style={{ gap: 12 }}>
            <Label>Learn</Label>
            <div className="grid3">
              <Stat v={`${w.quranDays}/7`} k="Quran days" />
              <Stat v={w.juzRevised} k="Juz revised" />
              <Stat v={`${w.frenchMin}M`} k="French" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Notes({ initial, onSave }: { initial: string; onSave: (n: string) => void }) {
  const [v, setV] = useState(initial)
  useEffect(() => setV(initial), [initial])
  return (
    <div className="stack" style={{ gap: 8, marginTop: 6 }}>
      <Label>Claude's notes (shown next week)</Label>
      <textarea className="field" placeholder="Paste Claude's feedback here" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn btn-outline" disabled={v === initial} onClick={() => onSave(v)}>Save notes</button>
    </div>
  )
}

const WIN_START = 21 * 60 // 21:00
const WIN_LEN = 14 * 60 // → 11:00

function SleepSection({ rows, start, avg }: { rows: Night[]; start: string; avg: WeekStats['sl'] }) {
  const days = weekDays(start)
  const [edit, setEdit] = useState<string | null>(null)
  const H = 140, W = 280
  const y = (m: number) => Math.max(0, Math.min(H, ((m - WIN_START) / WIN_LEN) * H))
  const wakeY = (iso: string) => { const m = localMinutes(iso); return y(m < 12 * 60 ? m + 1440 : m) }
  return (
    <section className="panel stack" style={{ gap: 12 }}>
      <div className="row between"><Label>Sleep</Label><span className="label">long-press a night to fix</span></div>
      <div className="grid4">
        <Stat v={avg.avgMinutes != null ? fmtDur(avg.avgMinutes) : '—'} k="Avg" />
        <Stat v={avg.avgBed != null ? fmtClock(avg.avgBed) : '—'} k="Bed" />
        <Stat v={avg.avgWake != null ? fmtClock(avg.avgWake) : '—'} k="Wake" />
        <Stat v={avg.bedSpread != null ? `${Math.round(avg.bedSpread)}M` : '—'} k="Spread" />
      </div>
      <div className="grid2">
        <Stat v={avg.avgWakings != null ? avg.avgWakings.toFixed(1) : '—'} k="Wake-ups / night" />
        <Stat v={avg.naps ? `${avg.naps} · ${fmtDur(avg.napMinutes)}` : '0'} k="Naps" />
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" role="img" aria-label="Sleep window 21:00 to 11:00">
        {[21, 0, 3, 6, 9].map((hh) => {
          const m = hh < 12 ? hh * 60 + 1440 : hh * 60
          return <g key={hh}><line x1="28" x2={W} y1={y(m)} y2={y(m)} stroke="#1c1c1c" /><text x="0" y={y(m) + 3} fill="#5c5c5c" style={{ font: '500 7px var(--f-mono)' }}>{String(hh).padStart(2, '0')}:00</text></g>
        })}
        {days.map((d, i) => {
          const cx = 46 + i * ((W - 60) / 6)
          const n = rows.find((x) => x.date === d)
          const good = !!n && n.asleep >= 7.5 * 60
          return (
            <g key={d}>
              {n?.segments.map((g) => {
                const top = g.start_at ? y(bedMinutes(g.start_at)) : null
                const bot = wakeY(g.end_at)
                return top != null && bot > top
                  ? <rect key={g.id} x={cx - 9} y={top} width={18} height={Math.max(2, bot - top)} rx={3} fill={good ? '#fff' : '#9c9ca2'} filter={good ? 'url(#gs)' : undefined} />
                  : <circle key={g.id} cx={cx} cy={bot} r={3} fill="#fff" />
              })}
              <text x={cx} y={H + 13} textAnchor="middle" fill="#8c8c8c" style={{ font: '500 8px var(--f-mono)' }}>{dowShort(d)}</text>
            </g>
          )
        })}
      </svg>
      <div className="list">
        {rows.length === 0 && <div className="empty">No sleep logged this week.</div>}
        {rows.map((n) => <NightItem key={n.date} n={n} open={edit === n.date} onOpen={() => setEdit(edit === n.date ? null : n.date)} />)}
      </div>
    </section>
  )
}

function NightItem({ n, open, onOpen }: { n: Night; open: boolean; onOpen: () => void }) {
  const lp = useLongPress(onOpen)
  const all = [...n.segments, ...n.naps].sort((a, b) => (a.start_at ?? a.end_at).localeCompare(b.start_at ?? b.end_at))
  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="li" {...lp} style={{ cursor: 'pointer' }}>
        <span className="mono small" style={{ width: 92 }}>{fmtDay(n.date)}</span>
        <span className="grow mono small muted">
          {n.bed ? hhmm(n.bed) : '--:--'} → {n.wake ? hhmm(n.wake) : '--:--'}
          {n.wakings ? ` · WOKE ${n.wakings}×` : ''}{n.naps.length ? ` · ${n.naps.length} NAP` : ''}
        </span>
        <span className="mono small strong">{n.asleep ? fmtDur(n.asleep) : '—'}</span>
      </div>
      {open && all.map((g) => (
        <div key={g.id} className="stack" style={{ gap: 6, padding: '8px 0 12px', borderBottom: '1px solid var(--divider)' }}>
          <div className="row between">
            <span className="label">{isNap(g) ? 'Nap' : 'Sleep'}{g.wake_reason ? ` · woke: ${WAKE_LABEL[g.wake_reason] ?? g.wake_reason}` : ''}</span>
            <button className="chip sm" onClick={() => deleteSleep(g)}>Delete</button>
          </div>
          <div className="row wrap" style={{ gap: 14, justifyContent: 'center' }}>
            <Stepper value={g.start_at ? hhmm(g.start_at) : '--:--'} sub="slept ±15" onMinus={() => shiftSleep(g, 'start_at', -15)} onPlus={() => shiftSleep(g, 'start_at', 15)} />
            <Stepper value={hhmm(g.end_at)} sub="woke ±15" onMinus={() => shiftSleep(g, 'end_at', -15)} onPlus={() => shiftSleep(g, 'end_at', 15)} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
