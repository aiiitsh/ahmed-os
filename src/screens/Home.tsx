import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { weekStats, reminders } from '../lib/stats'
import { fmtDay, fmtDur, fmtStopwatch, hhmm, localDate, minutesBetween, weekStart } from '../lib/time'
import { deleteEntry, deleteWorkout, focusBreak, focusResume, focusStop, startSession } from '../lib/actions'
import { describeLog } from '../lib/describe'
import { DAYS, EX, GOALS } from '../data/program'
import { surahLatin } from '../data/surahs'
import { Bar, DeleteX, Label, Ring, useNow } from '../components/ui'
import { Icon } from '../components/Icon'
import { openSheet } from '../components/QuickLog'
import { InstallHint } from '../components/InstallHint'
import { dayPlan, tomorrowPreview, trainingPlan, type PlanItem } from '../lib/plan'
import { WeekPlanPanel } from '../components/WeekPlan'
import { TodayTasks, useTodayTaskCount } from '../components/Tasks'
import { SLOT_ICON, SLOT_LABEL } from '../lib/weekplan'
import { countdownText, daysToNext, nextStep } from '../lib/life'

export function Home() {
  const now = useNow(1000)
  const pending = useStore((s) => s.pending)
  const today = localDate(now)
  return (
    <div className="page">
      <div className="hero-light" />
      <header className="home-head">
        <div className="stack" style={{ gap: 8 }}>
          <Label>{fmtDay(today)} · {hhmm(now)}</Label>
          <h1 className="hero-word">AHMED</h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {pending > 0 && <span className="sync-dot" title="Syncing…" aria-label="Syncing" />}
          <a className="btn btn-ghost btn-sq" href="#/life" aria-label="Life plan"><Icon name="life" size={22} /></a>
          <a className="btn btn-ghost btn-sq" href="#/settings" aria-label="Settings"><Icon name="gear" size={22} /></a>
        </div>
      </header>

      <InstallHint />

      <div className="cols">
        <div className="col">
          <TrainCard />
          <FocusBanner />
          <WeekPanel />
        </div>
        <div className="col">
          <TodayPlan />
          <Tomorrow />
          <WeekPlanPanel />
        </div>
        <div className="col">
          <LifeCard />
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
  const meters = [
    { k: 'TRAIN', v: `${w.workouts.length}/${GOALS.sessions}`, p: w.workouts.length / GOALS.sessions },
    { k: 'FOCUS', v: fmtDur(w.fo.total), p: w.fo.total / 60 / GOALS.focusHours },
    { k: 'PROTEIN', v: `${w.proteinDays}/7`, p: w.proteinDays / GOALS.proteinDays },
  ]
  return (
    <section className="panel row" style={{ gap: 18 }}>
      <Ring pct={w.ringPct} size={104}>
        <div className="big-num" style={{ fontSize: 24 }}>{Math.round(w.ringPct * 100)}<span style={{ fontSize: 12 }}>%</span></div>
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
  const forgot = isFocus && ms > 3 * 3600000
  return (
    <section className="panel banner">
      <div className="stack" style={{ gap: 4 }}>
        <Label>{isFocus ? 'Deep focus' : 'Break'}</Label>
        <div className="timer sm pulse-text">{fmtStopwatch(ms)}</div>
      </div>
      {forgot ? (
        <div className="stack" style={{ gap: 8, width: '100%' }}>
          <span className="small">Still going, or did you forget to stop? Save only:</span>
          <div className="row wrap" style={{ gap: 8 }}>
            {[60, 90, 120, 180].map((m) => <button key={m} className="chip" onClick={() => focusStop(m)}>{fmtDur(m)}</button>)}
            <button className="chip on" onClick={() => focusStop()}>It was real · stop now</button>
          </div>
        </div>
      ) : (
        <div className="row wrap" style={{ gap: 8 }}>
          {isFocus ? (
            <>
              <button className="btn" onClick={() => focusBreak('break')}>Break</button>
              <button className="btn" onClick={() => focusBreak('lost_focus')}>Lost focus</button>
            </>
          ) : (
            <button className="btn btn-outline" onClick={focusResume}>Back to it</button>
          )}
          <button className="btn" onClick={() => focusStop()}>Stop</button>
        </div>
      )}
    </section>
  )
}

function TrainCard() {
  const data = useStore()
  const plan = useMemo(() => trainingPlan(data), [data])
  const d = DAYS[plan.day]
  const first = EX[d.keys.find((k) => EX[k].kind !== 'skill') ?? d.keys[0]]
  const label = plan.state === 'done' ? 'Trained today' : plan.state === 'rest' ? 'Recovery' : plan.state === 'off' ? 'Today' : 'Train today'
  const off = plan.state === 'off' ? plan.slot!.kind : null
  const offSheet = off === 'cardio' ? 'cardio' : off === 'swim' || off === 'run' || off === 'hike' || off === 'squash' ? off : null
  return (
    <section className="panel deep stack" style={{ gap: 14 }}>
      <div className="row between">
        <Label>{label}</Label>
        {plan.state !== 'rest' && plan.state !== 'off' && <span className="pill">DAY {plan.state === 'done' ? plan.doneDay : plan.day}</span>}
      </div>
      <div className="row" style={{ gap: 14 }}>
        <Icon name={plan.state === 'done' ? 'check' : plan.state === 'rest' ? 'bed' : off ? SLOT_ICON[off] : first.icon} size={40} strokeWidth={1.3} />
        <div className="stack grow" style={{ gap: 4 }}>
          <div className="title" style={{ fontSize: plan.state === 'rest' ? 24 : 18 }}>{plan.state === 'done' ? `Day ${plan.doneDay} done` : plan.state === 'rest' ? 'REST DAY' : off ? `${SLOT_LABEL[off]} day` : d.name}</div>
          <div className="muted small">{plan.state === 'done' ? d.sub : plan.why}</div>
          {plan.state !== 'done' && plan.note && <span className="chip on sm" style={{ alignSelf: 'flex-start', marginTop: 4 }}>core & posture only</span>}
        </div>
      </div>
      {plan.state === 'go' && (
        <button className="btn btn-big btn-caps btn-outline pulse" onClick={() => startSession(plan.day, plan.skip, plan.note)}>Start</button>
      )}
      {offSheet && (
        <button className="btn btn-big btn-caps btn-outline" onClick={() => openSheet(offSheet as any)}>Log {SLOT_LABEL[off!].toLowerCase()}</button>
      )}
      {(plan.state === 'rest' || plan.state === 'off') && (
        <button className="link" style={{ alignSelf: 'center' }} onClick={() => startSession(plan.day, plan.skip, plan.note)}>Train anyway (Day {plan.day})</button>
      )}
    </section>
  )
}

function PlanRow({ it }: { it: PlanItem }) {
  const run = () => {
    if (it.action?.kind === 'sheet') openSheet(it.action.sheet)
    else if (it.action?.kind === 'session') startSession(it.action.day)
  }
  return (
    <button className="li" style={{ width: '100%', textAlign: 'left', opacity: it.done ? 0.55 : 1, alignItems: 'flex-start' }} disabled={!it.action} onClick={run}>
      <Icon name={it.icon} size={22} glow={!it.done} />
      <span className="stack grow" style={{ gap: 3 }}>
        <span className="row" style={{ gap: 8 }}>
          <span className={it.done ? '' : 'strong'}>{it.title}</span>
          {it.optional && !it.done && <span className="chip dashed sm">optional</span>}
        </span>
        <span className="mono muted" style={{ fontSize: 10, letterSpacing: '.06em' }}>{it.sub}</span>
        {it.why && !it.done && <span className="small muted" style={{ lineHeight: 1.4 }}>{it.why}</span>}
      </span>
      {it.done ? <span className="chip on sm">✓</span> : <Icon name="chevron" size={16} glow={false} />}
    </button>
  )
}

function TodayPlan() {
  const data = useStore()
  const items = useMemo(() => dayPlan(data), [data])
  const core = items.filter((i) => !i.optional)
  const extra = items.filter((i) => i.optional)
  const tasks = useTodayTaskCount()
  const done = core.filter((i) => i.done).length + tasks.done
  const total = core.length + tasks.open + tasks.done
  const byDone = (xs: PlanItem[]) => [...xs].sort((a, b) => Number(a.done) - Number(b.done))
  return (
    <section className="panel">
      <div className="panel-head"><Label>Today's plan</Label><span className="label">{done}/{total} done</span></div>
      <div className="list">{byDone(core).map((it) => <PlanRow key={it.key} it={it} />)}</div>
      <TodayTasks />
      <div className="label" style={{ margin: '14px 0 4px' }}>If you feel like it</div>
      <div className="list">{byDone(extra).map((it) => <PlanRow key={it.key} it={it} />)}</div>
    </section>
  )
}

function Tomorrow() {
  const data = useStore()
  const lines = useMemo(() => tomorrowPreview(data), [data])
  return (
    <section className="panel stack" style={{ gap: 8 }}>
      <Label>Tomorrow · based on today so far</Label>
      {lines.map((l) => <div key={l} className="small">→ {l}</div>)}
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
  const quran = useStore((s) => s.quran)
  const workouts = useStore((s) => s.workouts)
  const focus = useStore((s) => s.focus)
  const today = localDate()
  type Item = { id: string; at: string; icon: string; text: string; del: () => void }
  const items: Item[] = []
  for (const l of logs) if (l.local_date === today) {
    const d = describeLog(l)
    items.push({ id: l.id, at: l.logged_at, ...d, del: () => deleteEntry('logs', l.id) })
  }
  for (const e of quran) if (e.local_date === today) {
    items.push({ id: e.id, at: e.at, icon: 'quran', text: `Quran · ${surahLatin(e.surah)} · ${e.kind}`, del: () => deleteEntry('quran', e.id) })
  }
  for (const w of workouts) if (w.local_date === today) {
    items.push({ id: w.id, at: w.started_at, icon: 'dumbbell', text: `Day ${w.day_code} · ${DAYS[w.day_code].name}${w.ended_early ? ' (ended early)' : ''}`, del: () => deleteWorkout(w.id) })
  }
  for (const f of focus) if (f.local_date === today && f.block_type === 'focus') {
    items.push({ id: f.id, at: f.started_at, icon: 'focus', text: `Focus · ${fmtDur(minutesBetween(f.started_at, f.ended_at))}`, del: () => deleteEntry('focus', f.id) })
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

/** Next life step and how far away it is; opens the Life screen. */
function LifeCard() {
  const plan = useStore((s) => s.appState?.settings?.life_plan)
  const next = plan && nextStep(plan)
  return (
    <a className="panel row between" href="#/life" style={{ textDecoration: 'none', gap: 12 }}>
      <div className="stack" style={{ gap: 6, minWidth: 0 }}>
        <Label>Life plan{next ? ' · next' : ''}</Label>
        <span className="strong">{next ? next.tag : plan ? 'Final step' : 'Set up your plan'}</span>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {next && plan && <span className="big-num" style={{ fontSize: 18, whiteSpace: 'nowrap' }}>{countdownText(daysToNext(plan))}</span>}
        <Icon name="chevron" size={18} />
      </div>
    </a>
  )
}
