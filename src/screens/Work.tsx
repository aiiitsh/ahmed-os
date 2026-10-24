import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { focusStats } from '../lib/stats'
import { addDays, dowShort, fmtClock, fmtDur, fmtStopwatch, localDate, localMinutes, minutesBetween, weekDays, weekStart } from '../lib/time'
import { focusBreak, focusResume, focusStop, startFocus } from '../lib/actions'
import { GOALS } from '../data/program'
import { Bar, Label, useNow } from '../components/ui'
import { Icon } from '../components/Icon'
import { Stat } from './Learn'
import type { FocusBlock } from '../lib/types'
import { TasksPanel } from '../components/Tasks'

export function Work() {
  const focus = useStore((s) => s.appState?.focus)
  const blocks = useStore((s) => s.focus)
  const now = useNow(1000)
  const today = localDate(now)

  const todays = blocks.filter((b) => b.local_date === today)
  const st = focusStats(todays)
  const start = weekStart(today)
  const week = useMemo(() => focusStats(blocks.filter((b) => b.local_date >= start)), [blocks, start])
  const lastWeek = useMemo(() => focusStats(blocks.filter((b) => b.local_date >= addDays(start, -7) && b.local_date < start)), [blocks, start])
  const running = focus ? now - new Date(focus.started_at).getTime() : 0

  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <h1 className="hero-word" style={{ fontSize: 34 }}>WORK</h1>
        <Label>Focus · {fmtDur(week.total)} this week</Label>
      </header>

      <section className="panel deep stack" style={{ gap: 20, padding: 26, alignItems: 'center' }}>
        {!focus ? (
          <>
            <Label>Real, deep focus · phone away</Label>
            <div className="timer dim" style={{ textShadow: 'none', color: 'var(--dim)' }}>00:00</div>
            <button className="btn btn-big btn-filled btn-caps btn-block" style={{ minHeight: 72 }} onClick={() => startFocus()}><Icon name="focus" size={22} glow={false} /> Start focus</button>
          </>
        ) : focus.mode === 'focus' ? (
          <>
            <Label>Deep focus</Label>
            <div className="timer pulse-text" style={{ fontSize: 'clamp(48px, 16vw, 84px)' }}>{fmtStopwatch(running)}</div>
            {running > 3 * 3600000 ? (
              <div className="stack" style={{ gap: 8, alignItems: 'center' }}>
                <span className="small">Still going, or did you forget to stop? Save only:</span>
                <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
                  {[60, 90, 120, 180].map((m) => <button key={m} className="chip" onClick={() => focusStop(m)}>{fmtDur(m)}</button>)}
                  <button className="chip on" onClick={() => focusStop()}>It was real · stop now</button>
                </div>
              </div>
            ) : (
              <div className="grid3" style={{ width: '100%' }}>
                <button className="btn btn-big" onClick={() => focusBreak('break')}>Break</button>
                <button className="btn btn-big" onClick={() => focusBreak('lost_focus')}>Lost focus</button>
                <button className="btn btn-big btn-filled" onClick={() => focusStop()}>Stop</button>
              </div>
            )}
          </>
        ) : (
          <>
            <Label>Break</Label>
            <div className="timer sm" style={{ fontSize: 'clamp(40px, 12vw, 60px)' }}>{fmtStopwatch(running)}</div>
            <div className="grid2" style={{ width: '100%' }}>
              <button className="btn btn-big btn-filled btn-caps" onClick={focusResume}>Back to it</button>
              <button className="btn btn-big" onClick={() => focusStop()}>Stop</button>
            </div>
          </>
        )}
      </section>

      <TasksPanel />

      <div className="cols c2">
        <section className="panel stack" style={{ gap: 16 }}>
          <Label>Today</Label>
          <div className="grid3">
            <Stat v={fmtDur(st.total)} k="Total focus" />
            <Stat v={st.blocks} k="Blocks" />
            <Stat v={fmtDur(st.longest)} k="Longest" />
            <Stat v={fmtDur(st.average)} k="Average" />
            <Stat v={fmtDur(st.rest)} k="Rest" />
            <Stat v={st.ratio == null ? '—' : `${st.ratio.toFixed(1)}:1`} k="Focus:rest" />
          </div>
          <div className="row between"><Label>Lost focus</Label><span className="mono strong">{st.lost}×</span></div>
          <Timeline blocks={todays} focus={focus ?? null} now={now} />
        </section>

        <section className="panel stack" style={{ gap: 16 }}>
          <div className="row between"><Label>This week</Label><span className="mono small strong">{(week.total / 60).toFixed(1)} / {GOALS.focusHours} H</span></div>
          <Bar value={week.total / 60} max={GOALS.focusHours} />
          <WeekChart blocks={blocks} start={start} />
          <div className="row between">
            <Label>Longest block vs last week</Label>
            <span className={`chip sm${week.longest >= lastWeek.longest ? ' on' : ' warn'}`}>
              {Math.round(week.longest)}M {week.longest >= lastWeek.longest ? '↑' : '↓'} {Math.round(lastWeek.longest)}M
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}

function Timeline({ blocks, focus, now }: { blocks: FocusBlock[]; focus: { mode: string; started_at: string } | null; now: number }) {
  const all = [...blocks.map((b) => ({ type: b.block_type, s: b.started_at, e: b.ended_at }))]
  if (focus && localDate(focus.started_at) === localDate(now)) all.push({ type: focus.mode as 'focus' | 'break', s: focus.started_at, e: new Date(now).toISOString() })
  if (!all.length) return <div className="empty">No focus blocks yet today.</div>
  const t0 = Math.min(...all.map((b) => new Date(b.s).getTime()))
  const t1 = Math.max(now, ...all.map((b) => new Date(b.e).getTime()))
  const span = Math.max(1, t1 - t0)
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div style={{ position: 'relative', height: 22, background: 'var(--track)', borderRadius: 4, overflow: 'hidden' }}>
        {all.map((b, i) => {
          const l = ((new Date(b.s).getTime() - t0) / span) * 100
          const w = Math.max(0.6, (minutesBetween(b.s, b.e) * 60000 / span) * 100)
          return (
            <i key={i} style={{
              position: 'absolute', top: b.type === 'focus' ? 0 : 7, bottom: b.type === 'focus' ? 0 : 7, left: `${l}%`, width: `${w}%`,
              background: b.type === 'focus' ? '#fff' : '#5c5c5c', boxShadow: b.type === 'focus' ? '0 0 8px rgba(255,255,255,.8)' : 'none', borderRadius: 2,
            }} />
          )
        })}
      </div>
      <div className="row between"><span className="label">{fmtClock(localMinutes(t0))}</span><span className="label">NOW {fmtClock(localMinutes(now))}</span></div>
    </div>
  )
}

export function WeekChart({ blocks, start }: { blocks: FocusBlock[]; start: string }) {
  const days = weekDays(start)
  const data = days.map((d) => {
    const s = focusStats(blocks.filter((b) => b.local_date === d))
    return { d, h: s.total / 60, longest: s.longest / 60 }
  })
  const max = Math.max(4, ...data.map((x) => x.h))
  const H = 110, W = 280, bw = 24
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" role="img" aria-label="Focus hours per day">
      {data.map((x, i) => {
        const cx = 20 + i * ((W - 40) / 6)
        const h = (x.h / max) * H
        const p = x.h / (GOALS.focusHours / 5)
        const fill = p >= 0.8 ? '#fff' : p >= 0.34 ? '#9c9ca2' : '#4a4a50'
        return (
          <g key={x.d}>
            <rect x={cx - bw / 2} y={0} width={bw} height={H} rx={2} fill="#161616" />
            {h > 0 && <rect x={cx - bw / 2} y={H - h} width={bw} height={h} rx={2} fill={fill} filter={p >= 0.8 ? 'url(#gs)' : undefined} />}
            {x.longest > 0 && <circle cx={cx} cy={H - (x.longest / max) * H} r={3.2} fill="#000" stroke="#fff" strokeWidth={1.4} />}
            <text x={cx} y={H + 13} textAnchor="middle" fill="#8c8c8c" style={{ font: '500 8px var(--f-mono)', letterSpacing: '.1em' }}>{dowShort(x.d)}</text>
          </g>
        )
      })}
    </svg>
  )
}
