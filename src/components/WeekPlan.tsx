import { useState } from 'react'
import { useStore } from '../lib/store'
import { saveWeekPlan, setPlanSlot } from '../lib/actions'
import { addDays, dow, fmtDay, localDate, weekStart } from '../lib/time'
import { SLOT_ICON, WEEKDAYS, generateWeekPlan, planFor, slotStatus, slotText, unplanned } from '../lib/weekplan'
import type { PlanSlot, WeekPlan } from '../lib/types'
import { Icon } from './Icon'
import { Label, Sheet } from './ui'

const CHOICES: [string, PlanSlot][] = [
  ['Gym · Day A', { kind: 'gym', day: 'A' }], ['Gym · Day B', { kind: 'gym', day: 'B' }], ['Gym · Day C', { kind: 'gym', day: 'C' }],
  ['Swim', { kind: 'swim' }], ['Run', { kind: 'run' }], ['Hike', { kind: 'hike' }], ['Squash', { kind: 'squash' }],
  ['Any cardio', { kind: 'cardio' }], ['Rest', { kind: 'rest' }],
]

/** This week's plan (and next week's from Thursday on), or a button to make one. */
export function WeekPlanPanel() {
  const data = useStore()
  const today = localDate()
  const ws = weekStart(today)
  const next = addDays(ws, 7)
  const wd = (dow(today) + 1) % 7 // Sat = 0 … Fri = 6
  const cur = planFor(data, ws)
  const nxt = planFor(data, next)
  const make = (start: string) => saveWeekPlan(generateWeekPlan(useStore.getState(), start))
  return (
    <div className="stack" style={{ gap: 12 }}>
      {cur ? <PlanWeek plan={cur} title="This week's plan" /> : wd >= 5 ? null : (
        <section className="panel stack" style={{ gap: 10 }}>
          <Label>This week's plan</Label>
          <p className="small muted">No plan yet. It's built from last week: gym days, cardio, rest days, posture every day.</p>
          <button className="btn btn-outline btn-caps" onClick={() => make(ws)}>Make this week's plan</button>
        </section>
      )}
      {wd >= 5 && (nxt ? <PlanWeek plan={nxt} title={`Next week · from ${fmtDay(next)}`} /> : (
        <section className="panel deep stack" style={{ gap: 10 }}>
          <Label>Next week · starts {fmtDay(next)}</Label>
          <p className="small muted">Make next week's plan from this week's data. You can change any day after.</p>
          <button className="btn btn-filled btn-caps" onClick={() => make(next)}>Plan next week</button>
        </section>
      ))}
    </div>
  )
}

function PlanWeek({ plan, title }: { plan: WeekPlan; title: string }) {
  const data = useStore()
  const today = localDate()
  const [edit, setEdit] = useState<number | null>(null)
  const [showWhy, setShowWhy] = useState(false)
  return (
    <section className="panel stack" style={{ gap: 12 }}>
      <div className="row between">
        <Label>{title}</Label>
        <button className="link" style={{ padding: 0, minHeight: 0 }} onClick={() => setShowWhy((v) => !v)}>{showWhy ? 'Hide why' : 'Why?'}</button>
      </div>
      <div className="week-grid">
        {plan.days.map((slot, i) => {
          const d = addDays(plan.week_start, i)
          const st = slotStatus(data, d, slot, today)
          const extra = unplanned(data, d, slot)
          return (
            <button key={i} className={`wk${d === today ? ' today' : ''} ${st}`} onClick={() => setEdit(i)}>
              <span className="wk-d">{WEEKDAYS[i]}</span>
              <Icon name={SLOT_ICON[slot.kind]} size={18} glow={st !== 'missed'} />
              <span className="wk-l">{slot.kind === 'gym' ? slot.day : slotText(slot)}</span>
              <span className="wk-s">{st === 'done' ? '✓' : st === 'missed' ? '·' : ''}{extra.length ? '+' : ''}</span>
            </button>
          )
        })}
      </div>
      {showWhy && (
        <div className="stack" style={{ gap: 6 }}>
          {plan.why.map((w) => <div key={w} className="small muted" style={{ lineHeight: 1.45 }}>→ {w}</div>)}
          <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => saveWeekPlan(generateWeekPlan(useStore.getState(), plan.week_start))}>Rebuild this plan</button>
        </div>
      )}
      <Sheet open={edit != null} onClose={() => setEdit(null)} title={edit != null ? `${WEEKDAYS[edit]} · ${fmtDay(addDays(plan.week_start, edit))}` : ''}>
        {edit != null && (
          <div className="grid3">
            {CHOICES.map(([label, slot]) => {
              const cur = plan.days[edit]
              const on = cur.kind === slot.kind && cur.day === slot.day
              return (
                <button key={label} className={`btn${on ? ' btn-filled' : ''}`} style={{ minHeight: 64, flexDirection: 'column', gap: 4, fontSize: 12 }}
                  onClick={() => { setPlanSlot(plan.week_start, edit, slot); setEdit(null) }}>
                  <Icon name={SLOT_ICON[slot.kind]} size={20} glow={!on} />{label}
                </button>
              )
            })}
          </div>
        )}
      </Sheet>
    </section>
  )
}
