import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { weekStats, reminders } from '../lib/stats'
import { fmtDay, fmtDur, fmtStopwatch, hhmm, localDate, localMinutes, minutesBetween, weekStart } from '../lib/time'
import { deleteEntry, deleteSleep, focusBreak, focusResume, focusStop, goToSleep, setWakeReason, startSession, wokeUp } from '../lib/actions'
import { describeLog } from '../lib/describe'
import { DAYS, EX, GOALS } from '../data/program'
import { Bar, DeleteX, Label, Ring, useNow } from '../components/ui'
import { Icon } from '../components/Icon'
import { openSheet } from '../components/QuickLog'
import { groupNights, isNap, isNightWake, segMinutes, WAKE_LABEL, WAKE_REASONS } from '../lib/sleep'
import { todayPlan, trainingPlan } from '../lib/plan'
import { InstallHint } from '../components/InstallHint'

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

      <InstallHint />

      <div className="cols">
        <div className="col">
          <WeekPanel />
          <FocusBanner />
          <SleepCard />
        </div>
        <div className="col">
          <NextSession />
          <TodayPlan />
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

function SleepCard() {
  const pendingBed = useStore((s) => s.appState?.pending_bed_at)
  const segs = useStore((s) => s.sleep)
  const now = useNow(30000)
  const asleep = !!pendingBed && minutesBetween(pendingBed, now) <= 16 * 60
  const m = localMinutes(now)
  const night = m >= 19 * 60 || m < 6 * 60
  const nights = useMemo(() => groupNights(segs), [segs])
  const today = localDate(now)
  const last = nights.filter((n) => n.date <= today && n.asleep > 0).at(-1)
  const napsToday = nights.find((n) => n.date === today)?.naps ?? []
  // Reason chips for a night wake-up that just happened.
  const latest = [...segs].sort((a, b) => a.end_at.localeCompare(b.end_at)).at(-1)
  const askReason = !!latest && !latest.wake_reason && !isNap(latest) && isNightWake(latest.end_at) && now - new Date(latest.end_at).getTime() < 30 * 60000
  const sleepHot = !asleep && night

  return (
    <section className="panel stack" style={{ gap: 12 }}>
      <div className="row between">
        <Label>Sleep</Label>
        {asleep && <span className="chip on sm">asleep {fmtDur(minutesBetween(pendingBed!, now))}</span>}
      </div>
      <div className="grid2">
        <button className={`btn btn-big${sleepHot ? ' btn-filled' : ''}`} style={{ flexDirection: 'column', gap: 6, minHeight: 76 }} onClick={goToSleep}>
          <span className="row" style={{ gap: 8 }}><Icon name="bed" size={20} glow={!sleepHot} /> Sleep</span>
          <span className="label" style={{ color: sleepHot ? '#000' : undefined }}>{asleep ? `SINCE ${hhmm(pendingBed!)}` : 'NAP OR NIGHT'}</span>
        </button>
        <button className={`btn btn-big${asleep ? ' btn-filled' : ''}`} style={{ flexDirection: 'column', gap: 6, minHeight: 76 }} onClick={wokeUp}>
          <span className="row" style={{ gap: 8 }}><Icon name="wake" size={20} glow={!asleep} /> Woke up</span>
          <span className="label" style={{ color: asleep ? '#000' : undefined }}>{asleep ? 'TAP WHEN AWAKE' : 'ANY TIME'}</span>
        </button>
      </div>
      {askReason && (
        <div className="stack" style={{ gap: 8 }}>
          <Label>Why did you wake up?</Label>
          <div className="row wrap" style={{ gap: 8 }}>
            {WAKE_REASONS.map(([k, l]) => <button key={k} className="chip" onClick={() => setWakeReason(latest!, k)}>{l}</button>)}
          </div>
        </div>
      )}
      {last && (
        <div className="mono small muted" style={{ lineHeight: 1.6 }}>
          LAST NIGHT · <span className="strong">{fmtDur(last.asleep)}</span>
          {last.bed && last.wake ? ` · ${hhmm(last.bed)} → ${hhmm(last.wake)}` : ''}
          {` · WOKE ${last.wakings}×`}
          {last.reasons.length ? ` (${last.reasons.map((r) => WAKE_LABEL[r] ?? r).join(', ').toUpperCase()})` : ''}
          {napsToday.length ? ` · NAPS TODAY ${napsToday.length} (${fmtDur(napsToday.reduce((a, n) => a + (segMinutes(n) ?? 0), 0))})` : ''}
        </div>
      )}
    </section>
  )
}

function NextSession() {
  const data = useStore()
  const plan = useMemo(() => trainingPlan(data), [data])
  const d = DAYS[plan.day]
  const first = EX[d.keys[0]]
  const label = plan.state === 'done' ? 'Trained today' : plan.state === 'rest' ? 'Recovery day suggested' : 'Train today'
  const sub = plan.state === 'done' ? `Next time: Day ${plan.day} · ${d.name}`
    : plan.state === 'rest' ? `You trained 2 days in a row. Do the core routine and swim; Day ${plan.day} tomorrow.`
    : d.sub
  return (
    <section className="panel deep stack" style={{ gap: 14 }}>
      <div className="row between">
        <Label>{label}</Label>
        <span className="pill">DAY {plan.day}</span>
      </div>
      <div className="row" style={{ gap: 14 }}>
        <Icon name={plan.state === 'done' ? 'check' : first.icon} size={40} strokeWidth={1.3} />
        <div className="stack grow" style={{ gap: 4 }}>
          <div className="title" style={{ fontSize: 18 }}>{plan.state === 'done' ? `Day ${plan.doneDay} done` : d.name}</div>
          <div className="muted small">{sub}</div>
        </div>
      </div>
      {plan.state !== 'done' && (
        <button className={`btn btn-big btn-caps${plan.state === 'go' ? ' btn-outline pulse' : ''}`} onClick={() => startSession(plan.day)}>
          {plan.state === 'rest' ? 'Train anyway' : 'Start'}
        </button>
      )}
    </section>
  )
}

function TodayPlan() {
  const data = useStore()
  const items = useMemo(() => todayPlan(data), [data])
  const done = items.filter((i) => i.done).length
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done))
  const run = (a: (typeof items)[number]['action']) => {
    if (a?.kind === 'sheet') openSheet(a.sheet)
    else if (a?.kind === 'session') startSession(a.day)
  }
  return (
    <section className="panel">
      <div className="panel-head"><Label>Today's plan</Label><span className="label">{done}/{items.length} done</span></div>
      <div className="list">
        {sorted.map((it) => (
          <button key={it.key} className="li" style={{ width: '100%', textAlign: 'left', opacity: it.done ? 0.55 : 1 }}
            disabled={!it.action} onClick={() => run(it.action)}>
            <Icon name={it.icon} size={22} glow={!it.done} />
            <span className="stack grow" style={{ gap: 3 }}>
              <span className={it.done ? '' : 'strong'}>{it.title}</span>
              <span className="mono muted" style={{ fontSize: 10, letterSpacing: '.06em' }}>{it.sub}</span>
            </span>
            {it.done ? <span className="chip on sm">✓</span> : <Icon name="chevron" size={16} glow={false} />}
          </button>
        ))}
      </div>
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
  const segs = useStore((s) => s.sleep)
  const workouts = useStore((s) => s.workouts)
  const focus = useStore((s) => s.focus)
  const today = localDate()
  type Item = { id: string; at: string; icon: string; text: string; del: () => void }
  const items: Item[] = []
  for (const l of logs) if (l.local_date === today) {
    const d = describeLog(l)
    items.push({ id: l.id, at: l.logged_at, ...d, del: () => deleteEntry('logs', l.id) })
  }
  for (const s of segs) if (localDate(s.end_at) === today) {
    const mins = segMinutes(s)
    const why = s.wake_reason ? ` (${(WAKE_LABEL[s.wake_reason] ?? s.wake_reason).toLowerCase()})` : ''
    items.push({ id: s.id, at: s.end_at, icon: 'wake', text: `${isNap(s) ? 'Nap' : 'Woke up'}${mins != null ? ` · slept ${fmtDur(mins)}` : ''}${why}`, del: () => deleteSleep(s) })
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
      <div className="panel-head"><Label>Logged today</Label><span className="label">{items.length}</span></div>
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
