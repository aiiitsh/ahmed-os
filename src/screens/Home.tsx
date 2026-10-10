import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { weekStats, reminders } from '../lib/stats'
import { fmtDay, fmtDur, fmtStopwatch, hhmm, localDate, localMinutes, minutesBetween, weekStart } from '../lib/time'
import { deleteEntry, focusBreak, focusResume, focusStop, goingToBed, startSession, wokeUp } from '../lib/actions'
import { describeLog } from '../lib/describe'
import { DAYS, EX, GOALS } from '../data/program'
import { Bar, DeleteX, Label, Ring, useNow } from '../components/ui'
import { Icon } from '../components/Icon'
import { QuickGrid } from '../components/QuickLog'

export function Home() {
  const now = useNow(1000)
  const pending = useStore((s) => s.pending)
  const today = localDate(now)
  const time = hhmm(now)
  return (
    <div className="page">
      <div className="hero-light" />
      <header className="home-head">
        <div className="stack" style={{ gap: 8 }}>
          <Label>{fmtDay(today)} · {time}</Label>
          <h1 className="hero-word">AHMED</h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {pending > 0 && <span className="sync-dot" title="Syncing…" aria-label="Syncing" />}
          <a className="btn btn-ghost btn-sq" href="#/settings" aria-label="Settings"><Icon name="gear" size={22} /></a>
        </div>
      </header>

      <div className="cols">
        <div className="col">
          <WeekPanel />
          <FocusBanner />
          <SleepButtons />
        </div>
        <div className="col">
          <NextSession />
          <section className="stack">
            <Label>Quick log</Label>
            <QuickGrid />
          </section>
        </div>
        <div className="col">
          <Reminders />
          <TodayList />
        </div>
      </div>
    </div>
  )
}

function WeekPanel() {
  const data = useStore()
  const w = useMemo(() => weekStats(data, weekStart()), [data])
  const sleepH = (w.sl.avgMinutes ?? 0) / 60
  const meters = [
    { k: 'TRAIN', v: `${w.workouts.length}/${GOALS.sessions}`, p: w.workouts.length / GOALS.sessions },
    { k: 'SLEEP', v: `${sleepH.toFixed(1)}H`, p: sleepH / GOALS.sleepHours },
    { k: 'FOCUS', v: fmtDur(w.fo.total), p: w.fo.total / 60 / GOALS.focusHours },
    { k: 'QURAN', v: `${w.quranDays}/7`, p: w.quranDays / GOALS.quranDays },
  ]
  return (
    <section className="panel row" style={{ gap: 18 }}>
      <Ring pct={w.ringPct} size={116}>
        <div className="big-num" style={{ fontSize: 26 }}>{Math.round(w.ringPct * 100)}<span style={{ fontSize: 13 }}>%</span></div>
        <Label>Week</Label>
      </Ring>
      <div className="stack grow" style={{ gap: 12 }}>
        {meters.map((m) => (
          <div key={m.k} className="stack" style={{ gap: 5 }}>
            <div className="row between"><Label>{m.k}</Label><span className="mono small strong">{m.v}</span></div>
            <Bar value={Math.min(1, m.p)} max={1} thin />
          </div>
        ))}
      </div>
    </section>
  )
}

export function FocusBanner() {
  const focus = useStore((s) => s.appState?.focus)
  const now = useNow(1000)
  if (!focus) return null
  const ms = now - new Date(focus.started_at).getTime()
  const isFocus = focus.mode === 'focus'
  return (
    <section className="panel banner">
      <div className="stack" style={{ gap: 4 }}>
        <Label>{isFocus ? `Focus · ${focus.kind}` : 'Break'}</Label>
        <div className="timer sm pulse-text">{fmtStopwatch(ms)}</div>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {isFocus ? (
          <>
            <button className="btn" onClick={() => focusBreak('break')}>Break</button>
            <button className="btn" onClick={() => focusBreak('lost_focus')}>Lost focus</button>
          </>
        ) : (
          <button className="btn btn-outline" onClick={focusResume}>Back to it</button>
        )}
        <button className="btn" onClick={focusStop}>Stop</button>
      </div>
    </section>
  )
}

function SleepButtons() {
  const pendingBed = useStore((s) => s.appState?.pending_bed_at)
  const sleep = useStore((s) => s.sleep)
  const now = useNow(60000)
  const lastBed = [...sleep].filter((s) => s.bed_at).sort((a, b) => a.wake_date.localeCompare(b.wake_date)).at(-1)?.bed_at
  const lastSlept = [...sleep].filter((s) => s.minutes != null).sort((a, b) => a.wake_date.localeCompare(b.wake_date)).at(-1)?.minutes
  const m = localMinutes(now)
  const bedPending = !!pendingBed && minutesBetween(pendingBed, now) <= 16 * 60
  const wakeActive = bedPending || (m >= 4 * 60 && m < 12 * 60)
  const bedActive = !wakeActive && m >= 19 * 60
  return (
    <section className="grid2">
      <button className={`btn btn-big${bedActive ? ' btn-filled' : ''}`} style={{ flexDirection: 'column', gap: 6, minHeight: 84 }} onClick={goingToBed}>
        <span className="row" style={{ gap: 8 }}><Icon name="bed" size={20} /> Going to bed</span>
        <span className="label" style={{ color: bedActive ? '#000' : undefined }}>
          {bedPending ? `IN BED ${hhmm(pendingBed!)}` : lastBed ? `LAST ${hhmm(lastBed)}` : 'NO DATA'}
        </span>
      </button>
      <button className={`btn btn-big${wakeActive ? ' btn-filled' : ''}`} style={{ flexDirection: 'column', gap: 6, minHeight: 84 }} onClick={wokeUp}>
        <span className="row" style={{ gap: 8 }}><Icon name="wake" size={20} /> Woke up</span>
        <span className="label" style={{ color: wakeActive ? '#000' : undefined }}>
          {lastSlept != null ? `SLEPT ${fmtDur(lastSlept)}` : 'NO DATA'}
        </span>
      </button>
    </section>
  )
}

function NextSession() {
  const day = useStore((s) => s.appState?.rotation_next ?? 'A')
  const d = DAYS[day]
  const first = EX[d.keys[0]]
  return (
    <section className="panel deep stack" style={{ gap: 14 }}>
      <div className="row between">
        <Label>Next session</Label>
        <span className="pill">DAY {day}</span>
      </div>
      <div className="row" style={{ gap: 14 }}>
        <Icon name={first.icon} size={40} strokeWidth={1.3} />
        <div className="stack grow" style={{ gap: 4 }}>
          <div className="title" style={{ fontSize: 18 }}>{d.name}</div>
          <div className="muted small">{d.sub}</div>
        </div>
      </div>
      <button className="btn btn-outline btn-big btn-caps pulse" onClick={() => startSession(day)}>Start</button>
    </section>
  )
}

function Reminders() {
  const data = useStore()
  const list = useMemo(() => reminders(data), [data])
  if (!list.length) return null
  return (
    <section className="row wrap" style={{ gap: 8 }}>
      {list.map((r) => <span key={r} className="chip warn">{r}</span>)}
    </section>
  )
}

function TodayList() {
  const logs = useStore((s) => s.logs)
  const sleep = useStore((s) => s.sleep)
  const workouts = useStore((s) => s.workouts)
  const focus = useStore((s) => s.focus)
  const today = localDate()
  type Item = { id: string; at: string; icon: string; text: string; del: () => void }
  const items: Item[] = []
  for (const l of logs) if (l.local_date === today) {
    const d = describeLog(l)
    items.push({ id: l.id, at: l.logged_at, ...d, del: () => deleteEntry('logs', l.id) })
  }
  for (const s of sleep) if (s.wake_date === today && s.wake_at) {
    items.push({ id: s.id, at: s.wake_at, icon: 'wake', text: s.minutes != null ? `Woke up · slept ${fmtDur(s.minutes)}` : 'Woke up', del: () => deleteEntry('sleep', s.id) })
  }
  for (const w of workouts) if (w.local_date === today) {
    items.push({ id: w.id, at: w.started_at, icon: 'dumbbell', text: `Day ${w.day_code} · ${DAYS[w.day_code].name}${w.ended_early ? ' (ended early)' : ''}`, del: () => deleteEntry('workouts', w.id) })
  }
  for (const f of focus) if (f.local_date === today && f.block_type === 'focus') {
    items.push({ id: f.id, at: f.started_at, icon: 'focus', text: `Focus · ${f.kind} · ${fmtDur(minutesBetween(f.started_at, f.ended_at))}`, del: () => deleteEntry('focus', f.id) })
  }
  items.sort((a, b) => b.at.localeCompare(a.at))
  return (
    <section className="panel">
      <div className="panel-head"><Label>Today</Label><span className="label">{items.length}</span></div>
      {items.length === 0 ? <div className="empty">Nothing logged yet today.</div> : (
        <div className="list">
          {items.map((it) => (
            <div key={it.id} className="li">
              <span className="t">{hhmm(it.at)}</span>
              <Icon name={it.icon} size={18} />
              <span className="grow">{it.text}</span>
              <DeleteX onDelete={it.del} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
