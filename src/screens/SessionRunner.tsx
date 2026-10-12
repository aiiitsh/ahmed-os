import { useState } from 'react'
import { create } from 'zustand'
import { useStore } from '../lib/store'
import { completeStep, discardSession, finishSession, goToStep, levelUp, updateStep, type FinishSummary } from '../lib/actions'
import { fmtStopwatch, minutesBetween } from '../lib/time'
import { fmtW } from '../lib/format'
import { DAYS, EX, isSecs, repStep } from '../data/program'
import type { Feel, StepState } from '../lib/types'
import { Label, Stepper, useNow } from '../components/ui'
import { Icon } from '../components/Icon'

const useFinish = create<{ summary: FinishSummary | null; day: string | null }>(() => ({ summary: null, day: null }))

export function SessionRunner() {
  const s = useStore((st) => st.appState?.active_session)
  const summary = useFinish((f) => f.summary)
  const now = useNow(1000)
  const [confirmEnd, setConfirmEnd] = useState(false)

  if (summary) return <FinishScreen summary={summary} />
  if (!s) return null

  const day = DAYS[s.day]
  const finish = (early: boolean) => {
    const res = finishSession(early)
    if (res) useFinish.setState({ summary: res, day: `DAY ${s.day} · ${day.name}` })
  }

  const cur = s.steps[s.step] as StepState | undefined

  return (
    <div className="runner">
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="hero-light" />
        <header className="stack" style={{ gap: 10 }}>
          <div className="row between">
            <Label>Day {s.day} · {day.name}</Label>
            <span className="mono strong glow-text">{fmtStopwatch(now - new Date(s.started_at).getTime())}</span>
          </div>
          <div className="row between">
            <div className="dots">
              {s.steps.map((st, i) => (
                <button key={i} aria-label={`Step ${i + 1}`} onClick={() => goToStep(i)} style={{ padding: 4, margin: -4 }}>
                  <i className={st.done ? 'done' : st.skipped ? 'skip' : i === s.step ? 'cur' : ''} style={{ display: 'block' }} />
                </button>
              ))}
            </div>
            {confirmEnd ? (
              <div className="row" style={{ gap: 6 }}>
                <button className="chip warn" onClick={() => finish(true)}>End & save</button>
                <button className="chip" onClick={() => setConfirmEnd(false)}>Cancel</button>
              </div>
            ) : (
              <button className="link" onClick={() => setConfirmEnd(true)}>End session early</button>
            )}
          </div>
        </header>

        {cur ? <Step key={s.step} idx={s.step} st={cur} stepStartedAt={s.step_started_at} /> : (
          <section className="panel deep stack" style={{ gap: 18, alignItems: 'center', textAlign: 'center', padding: 28 }}>
            <Icon name="check" size={48} />
            <div className="title">All steps done</div>
            <p className="muted">Save the session to update your targets and move to Day {s.day === 'A' ? 'B' : s.day === 'B' ? 'C' : 'A'}.</p>
            <button className="btn btn-filled btn-big btn-block btn-caps" onClick={() => finish(false)}>Finish</button>
            <button className="link" onClick={() => goToStep(s.steps.length - 1)}>Back</button>
          </section>
        )}
        {!s.steps.some((x) => x.done) && <button className="link" onClick={discardSession}>Discard session</button>}
      </div>
    </div>
  )
}

function Step({ idx, st, stepStartedAt }: { idx: number; st: StepState; stepStartedAt: string }) {
  const e = EX[st.key]
  const target = useStore((s) => s.targets[st.key])
  const skills = useStore((s) => s.appState?.skills ?? {})

  if (e.kind === 'skill') {
    const sk = skills[e.skill!]
    return (
      <section className="panel deep stack" style={{ gap: 18, alignItems: 'center', textAlign: 'center', padding: 26 }}>
        <Icon name={e.icon} size={84} strokeWidth={1.1} />
        <Label>Thenx · {sk?.name} · Lvl {sk?.level} {sk?.level_name} · {sk?.pct}%</Label>
        <p style={{ fontSize: 16 }}>{e.note}</p>
        <button className="btn btn-filled btn-big btn-block btn-caps" style={{ minHeight: 76 }}
          onClick={() => completeStep(idx, { done: true, minutes: Math.max(1, Math.round(minutesBetween(stepStartedAt, Date.now()))) })}>Done</button>
        <div className="row" style={{ gap: 16 }}>
          <button className="link" onClick={() => levelUp(e.skill!)}>Leveled up</button>
          <button className="link" onClick={() => completeStep(idx, { skipped: true })}>Skip</button>
        </div>
      </section>
    )
  }

  if (e.kind === 'stretch') {
    return (
      <section className="panel deep stack" style={{ gap: 18, alignItems: 'center', textAlign: 'center', padding: 26 }}>
        <Icon name={e.icon} size={72} strokeWidth={1.2} />
        <div className="title">{e.name}</div>
        <div className="big-num">{e.sets} × {e.lo} s</div>
        <Label>each side</Label>
        <p className="muted">{e.note}</p>
        <button className="btn btn-filled btn-big btn-block btn-caps" style={{ minHeight: 76 }} onClick={() => completeStep(idx, { done: true })}>Done</button>
        <button className="link" onClick={() => completeStep(idx, { skipped: true })}>Skip</button>
      </section>
    )
  }

  const weighted = e.kind === 'weighted'
  const repInc = repStep(e)
  const secs = isSecs(e)
  const w = st.weight ?? null
  const r = st.reps ?? e.lo
  const feel = (f: Feel) => completeStep(idx, { done: true, feel: f })
  const name = st.swapped && e.swap ? e.swap : e.name

  return (
    <section className="panel deep stack" style={{ gap: 16, padding: 22 }}>
      <div className="row" style={{ gap: 14 }}>
        <Icon name={e.icon} size={52} strokeWidth={1.2} />
        <div className="stack grow" style={{ gap: 4 }}>
          <div className="title" style={{ fontSize: 19 }}>{name}</div>
          <p className="muted small">{e.note}</p>
        </div>
      </div>
      {e.swap && (
        <button className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => updateStep(idx, { swapped: !st.swapped })}>
          <Icon name="swap" size={14} glow={false} /> {st.swapped ? `Back to ${e.short}` : `Swap: ${e.swap}`}
        </button>
      )}
      <div className="stack" style={{ alignItems: 'center', gap: 6, padding: '6px 0' }}>
        {target && !target.calibrated && <span className="chip on">Set your start weight</span>}
        <div className="timer" style={{ fontSize: 52 }}>{e.sets} × {r}{secs ? 's' : ''}</div>
        {weighted && <div className="title" style={{ fontSize: 20 }}>@ {fmtW(w)}</div>}
        {e.lo !== e.hi && <Label>Range {e.lo}–{e.hi}{secs ? ' s' : ''} · stop 1–2 reps before failure</Label>}
      </div>
      <div className="row wrap" style={{ gap: 14, justifyContent: 'center' }}>
        {weighted && (
          <Stepper value={fmtW(w, false)} sub="weight" onMinus={() => updateStep(idx, { weight: Math.max(0, Math.round(((w ?? 0) - e.step) * 100) / 100) })}
            onPlus={() => updateStep(idx, { weight: Math.round(((w ?? 0) + e.step) * 100) / 100 })} />
        )}
        <Stepper value={r} sub={secs ? 'seconds' : 'reps'} onMinus={() => updateStep(idx, { reps: Math.max(1, r - repInc) })}
          onPlus={() => updateStep(idx, { reps: r + repInc })} />
      </div>
      <div className="feel-row">
        <button className="btn btn-big btn-caps" onClick={() => feel('easy')}>Easy</button>
        <button className="btn btn-big btn-filled btn-caps" onClick={() => feel('good')}>Good</button>
        <button className="btn btn-big btn-caps" onClick={() => feel('hard')}>Hard</button>
      </div>
      <button className="link" onClick={() => completeStep(idx, { skipped: true })}>Skip</button>
    </section>
  )
}

function FinishScreen({ summary }: { summary: FinishSummary }) {
  const day = useFinish((f) => f.day)
  return (
    <div className="runner">
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="hero-light" />
        <Label>{day}</Label>
        <div className="hero-word" style={{ fontSize: 34 }}>DONE</div>
        <div className="row" style={{ gap: 18 }}>
          <div className="stack" style={{ gap: 4 }}><div className="big-num">{summary.minutes}</div><Label>Minutes</Label></div>
          <div className="stack" style={{ gap: 4 }}><div className="big-num">{summary.rows.filter((r) => !r.skipped).length}</div><Label>Moves</Label></div>
        </div>
        <section className="panel">
          <div className="panel-head"><Label>Moves · next targets</Label></div>
          <div className="list">
            {summary.rows.map((r, i) => (
              <div key={i} className="li" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div className="row">
                  <span className="grow">{r.name}</span>
                  {r.feel && <span className={`chip sm${r.feel === 'hard' ? ' warn' : ' on'}`}>{r.feel}</span>}
                  {r.skipped && <span className="chip dashed sm">skipped</span>}
                </div>
                <div className="row">
                  <span className="mono small muted grow">{r.from}{r.to && r.to !== r.from ? ` → ${r.to}` : ''}</span>
                  {r.up > 0 && <Icon name="up" size={14} />}
                  {r.up < 0 && <Icon name="down" size={14} />}
                </div>
              </div>
            ))}
          </div>
        </section>
        <button className="btn btn-filled btn-big btn-caps" onClick={() => useFinish.setState({ summary: null, day: null })}>Close</button>
      </div>
    </div>
  )
}

export const hasFinishSummary = () => !!useFinish.getState().summary
export { useFinish }
