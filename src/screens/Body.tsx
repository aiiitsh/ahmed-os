import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { weekStats, fmt1 } from '../lib/stats'
import { addDays, fmtDay, localDate, weekStart } from '../lib/time'
import { adjustTarget, bumpSkillPct, levelUp, logBodyweight, startSession, swimPlan } from '../lib/actions'
import { fmtW } from '../lib/format'
import { DAYS, EX, EXERCISES, GROUPS, isSecs, repStep, type Exercise } from '../data/program'
import type { DayCode } from '../lib/types'
import { Bar, Label, Sparkline, Stepper } from '../components/ui'
import { Icon } from '../components/Icon'
import { BodyMap } from '../components/BodyMap'
import { Tile, openSheet, useCardioToday } from '../components/QuickLog'

export function Body() {
  const data = useStore()
  const start = weekStart()
  const w = useMemo(() => weekStats(data, start), [data, start])
  const totalSets = w.sets.filter((s) => !s.skipped && EX[s.exercise_key]?.kind !== 'stretch').reduce((a, s) => a + (s.sets ?? 0), 0)

  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <Label>Week · {fmtDay(start)} → {fmtDay(w.end)}</Label>
          <h1 className="hero-word" style={{ fontSize: 34 }}>BODY</h1>
        </div>
        <div className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
          <div className="big-num">{totalSets}</div>
          <Label>Sets this week</Label>
        </div>
      </header>

      <div className="cols c2">
        <section className="panel"><BodyMap groups={w.groups} /></section>
        <section className="panel">
          <div className="panel-head"><Label>Sets by muscle · target</Label></div>
          <div className="stack" style={{ gap: 12 }}>
            {GROUPS.map((g) => {
              const v = w.groups[g.key]
              return (
                <div key={g.key} className="stack" style={{ gap: 5 }}>
                  <div className="row between">
                    <span className="small">{g.label}</span>
                    {v === 0 ? <span className="chip warn sm">0/{g.hi}</span> : <span className="mono small strong">{fmt1(v)}/{g.hi}</span>}
                  </div>
                  <Bar value={v} max={g.hi} />
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <div className="cols c2">
        <NextPreview />
        <div className="col">
          <Cardio />
          <Skills />
        </div>
      </div>

      <div className="cols c2">
        <Targets />
        <Bodyweight />
      </div>
    </div>
  )
}

/** "3×12 · 10 KG", "3×30S", "3×30S · 16 KG" */
function targetText(e: Exercise, w: number | null | undefined, r: number | undefined) {
  if (e.kind === 'skill') return 'THENX'
  if (e.kind === 'stretch') return `${e.sets}×${e.lo}S`
  const reps = `${e.sets}×${r ?? e.lo}${isSecs(e) ? 'S' : ''}`
  return e.kind === 'weighted' ? `${reps} · ${fmtW(w ?? e.start)}` : reps
}

function NextPreview() {
  const next = useStore((s) => s.appState?.rotation_next ?? 'A')
  const targets = useStore((s) => s.targets)
  const [pick, setPick] = useState<DayCode>(next)
  const day = DAYS[pick]
  return (
    <section className="panel deep stack" style={{ gap: 14 }}>
      <div className="row between">
        <Label>{pick === next ? 'Next session' : 'Other day'}</Label>
        <div className="row" style={{ gap: 6 }}>
          {(['A', 'B', 'C'] as DayCode[]).map((d) => (
            <button key={d} className={`chip${pick === d ? ' on' : ''}`} onClick={() => setPick(d)}>{d}</button>
          ))}
        </div>
      </div>
      <div className="title" style={{ fontSize: 18 }}>Day {pick} · {day.name}</div>
      <div className="list">
        {day.keys.map((k) => {
          const e = EX[k]
          const t = targets[k]
          const tgt = targetText(e, t?.weight_kg, t?.reps)
          return (
            <div key={k} className="li">
              <Icon name={e.icon} size={22} />
              <span className="grow">{e.short}</span>
              <span className="mono small muted">{tgt}</span>
            </div>
          )
        })}
      </div>
      <button className="btn btn-outline btn-big btn-caps pulse" onClick={() => startSession(pick)}>Start</button>
    </section>
  )
}

function Cardio() {
  const s = useCardioToday()
  const logs = useStore((st) => st.logs)
  useStore((st) => st.appState?.settings?.swim)
  const plan = swimPlan()
  const swims = logs.filter((l) => l.type === 'cardio' && l.data.sport === 'swim').sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  const recent = swims.slice(-5).reverse()
  return (
    <section className="stack">
      <Label>Cardio</Label>
      <div className="panel stack" style={{ gap: 12, padding: 16 }}>
        <div className="row between">
          <div className="row" style={{ gap: 10 }}>
            <Icon name="swim" size={26} />
            <div className="stack" style={{ gap: 3 }}>
              <span className="strong">Next swim</span>
              <span className="label">25 m sprints · belly then back</span>
            </div>
          </div>
          {s.swim && <span className="chip on sm">{s.swim}</span>}
        </div>
        <div className="grid2">
          <div className="stack" style={{ gap: 3 }}><span className="big-num" style={{ fontSize: 20 }}>{plan.rest_s}s</span><Label>Rest between 25s</Label></div>
          <div className="stack" style={{ gap: 3 }}><span className="big-num" style={{ fontSize: 20 }}>{plan.target_min} min</span><Label>Aim to last</Label></div>
        </div>
        {swims.length > 1 && (
          <div className="stack" style={{ gap: 4 }}>
            <Label>Minutes lasted · last {Math.min(10, swims.length)}</Label>
            <Sparkline values={swims.slice(-10).map((l) => Number(l.data.minutes) || null)} height={40} />
          </div>
        )}
        {recent.length > 0 && (
          <div className="list">
            {recent.map((l) => (
              <div key={l.id} className="li" style={{ minHeight: 36, padding: '8px 0' }}>
                <span className="mono small" style={{ width: 92 }}>{fmtDay(l.local_date)}</span>
                <span className="grow mono small strong">{l.data.minutes} MIN</span>
                {l.data.intensity && <span className={`chip sm${l.data.intensity === 'intense' ? ' warn' : ''}`}>{l.data.intensity}</span>}
                {l.data.rest_s != null && <span className="mono small muted">{l.data.rest_s}S REST</span>}
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-outline btn-caps" onClick={() => openSheet('swim')}>Log swim</button>
      </div>
      <div className="grid2">
        <Tile icon="run" label="Run" sub={s.run} done={!!s.run} onClick={() => openSheet('run')} />
        <Tile icon="squash" label="Squash" sub={s.squash} done={!!s.squash} onClick={() => openSheet('squash')} />
      </div>
    </section>
  )
}

function Skills() {
  const skills = useStore((s) => s.appState?.skills ?? {})
  const [showAll, setShowAll] = useState(false)
  const entries = Object.entries(skills)
  const active = entries.filter(([, s]) => s.active)
  const inactive = entries.filter(([, s]) => !s.active)
  return (
    <section className="stack">
      <Label>Thenx skills</Label>
      {active.map(([k, s]) => (
        <div key={k} className="panel stack" style={{ gap: 10, padding: 16 }}>
          <div className="row between">
            <div className="row" style={{ gap: 10 }}>
              <Icon name={k === 'planche' ? 'planche' : 'muscleup'} size={26} />
              <div className="stack" style={{ gap: 3 }}>
                <span className="strong">{s.name}</span>
                <span className="label">Lvl {s.level} · {s.level_name}</span>
              </div>
            </div>
            <div className="big-num" style={{ fontSize: 22 }}>{s.pct}%</div>
          </div>
          <Bar value={s.pct} max={100} />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn grow" onClick={() => bumpSkillPct(k, -5)}>−5%</button>
            <button className="btn grow" onClick={() => bumpSkillPct(k, 5)}>+5%</button>
            <button className="btn btn-outline grow" onClick={() => levelUp(k)}>Level up</button>
          </div>
        </div>
      ))}
      {inactive.length > 0 && (
        <button className="link" style={{ textAlign: 'left' }} onClick={() => setShowAll((v) => !v)}>
          {showAll ? '− Hide' : '+'} {inactive.length} inactive skills
        </button>
      )}
      {showAll && inactive.map(([k, s]) => (
        <div key={k} className="li" style={{ padding: '6px 4px' }}>
          <span className="grow dim">{s.name}</span>
          <span className="label">Lvl {s.level} · {s.level_name} · {s.pct}%</span>
        </div>
      ))}
    </section>
  )
}

function Targets() {
  const targets = useStore((s) => s.targets)
  const workouts = useStore((s) => s.workouts)
  const sets = useStore((s) => s.sets)
  const [open, setOpen] = useState<string | null>(null)
  const start = weekStart()
  const weekIds = new Set(workouts.filter((w) => w.local_date >= start).map((w) => w.id))
  const firstThisWeek = (key: string) =>
    sets.filter((s) => weekIds.has(s.workout_id) && s.exercise_key === key && !s.skipped).sort((a, b) => a.position - b.position)[0]

  return (
    <section className="panel">
      <div className="panel-head"><Label>Targets</Label><span className="label">tap to adjust</span></div>
      <div className="list">
        {EXERCISES.filter((e) => e.kind !== 'skill' && e.kind !== 'stretch').map((e) => {
          const t = targets[e.key]
          if (!t) return null
          const f = firstThisWeek(e.key)
          let arrow: 'up' | 'down' | null = null
          if (f) {
            const dw = (t.weight_kg ?? 0) - (f.weight_kg ?? 0)
            const dr = t.reps - (f.reps ?? 0)
            const d = dw !== 0 ? dw : dr
            arrow = d > 0 ? 'up' : d < 0 ? 'down' : null
          }
          const unit = isSecs(e) ? ' S' : e.kind === 'weighted' ? '' : ' REPS'
          const val = e.kind === 'weighted' ? `${fmtW(t.weight_kg)} × ${t.reps}${unit}` : `${t.reps}${unit}`
          return (
            <div key={e.key} className="stack" style={{ gap: 0 }}>
              <button className="li" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(open === e.key ? null : e.key)}>
                <Icon name={e.icon} size={20} />
                <span className="grow">{e.short}{!t.calibrated && <span className="dim small"> · set start</span>}</span>
                {t.last_feel && <span className={`chip sm${t.last_feel === 'hard' ? ' warn' : ''}`}>{t.last_feel}</span>}
                <span className="mono small strong">{val}</span>
                {arrow && <Icon name={arrow} size={14} />}
              </button>
              {open === e.key && (
                <div className="row wrap" style={{ gap: 16, padding: '6px 0 14px', justifyContent: 'center' }}>
                  {e.kind === 'weighted' && (
                    <Stepper value={fmtW(t.weight_kg, false)} sub={`weight · step ${e.step}`} onMinus={() => adjustTarget(e.key, -e.step, 0)} onPlus={() => adjustTarget(e.key, e.step, 0)} />
                  )}
                  <Stepper value={t.reps} sub={isSecs(e) ? 'seconds' : 'reps'}
                    onMinus={() => adjustTarget(e.key, 0, -repStep(e))} onPlus={() => adjustTarget(e.key, 0, repStep(e))} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Bodyweight() {
  const logs = useStore((s) => s.logs)
  const bw = logs.filter((l) => l.type === 'bodyweight').sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  const last = bw.at(-1)?.data.kg as number | undefined
  const [val, setVal] = useState<number | null>(null)
  const v = val ?? last ?? 70
  const today = localDate()
  const loggedThisWeek = bw.some((l) => l.local_date >= weekStart(today))
  const weeks = Array.from({ length: 8 }, (_, i) => weekStart(addDays(today, -7 * (7 - i))))
  const series = weeks.map((ws) => {
    const inW = bw.filter((l) => l.local_date >= ws && l.local_date <= addDays(ws, 6))
    return inW.length ? (inW.at(-1)!.data.kg as number) : null
  })
  return (
    <section className="panel stack" style={{ gap: 14 }}>
      <div className="row between">
        <Label>Bodyweight · weekly</Label>
        {loggedThisWeek ? <span className="chip on sm">✓ this week</span> : <span className="chip warn sm">due</span>}
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Stepper value={v.toFixed(1)} sub="kg" onMinus={() => setVal(Math.round((v - 0.1) * 10) / 10)} onPlus={() => setVal(Math.round((v + 0.1) * 10) / 10)} />
      </div>
      <button className="btn btn-filled btn-caps btn-block" onClick={() => { logBodyweight(v); setVal(null) }}>Save</button>
      <Label>8 weeks</Label>
      <Sparkline values={series} />
    </section>
  )
}
