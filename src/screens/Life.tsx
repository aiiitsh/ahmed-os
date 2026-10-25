import { useState } from 'react'
import { useStore, newId } from '../lib/store'
import { saveLifePlan, setLifeCurrent, updateLifeStep } from '../lib/actions'
import { countdownText, currentIndex, daysToNext, dueText, nextStep, parsePlan, stepState, timelinePct } from '../lib/life'
import { toast } from '../lib/toast'
import type { LifePlan, LifeStep } from '../lib/types'
import { Bar, Label, Sheet } from '../components/ui'

const usePlan = () => useStore((s) => s.appState?.settings?.life_plan)
const pad = (n: number) => String(n).padStart(2, '0')

export function Life() {
  const plan = usePlan()
  const [importing, setImporting] = useState(false)
  const years = plan?.steps.map((s) => s.due?.slice(0, 4)).filter(Boolean) ?? []
  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          {years.length > 1 && <Label>{years[0]} → {years[years.length - 1]}</Label>}
          <h1 className="hero-word" style={{ fontSize: 34 }}>LIFE</h1>
        </div>
        {plan && <button className="btn btn-ghost" onClick={() => setImporting(true)}>Replace</button>}
      </header>

      {!plan ? <ImportPanel /> : (
        <>
          {plan.reminder && <p className="ar life-reminder">{plan.reminder}</p>}
          <div className="cols c2">
            <div className="col">
              <NowCard plan={plan} />
              {!!plan.principles?.length && (
                <section className="panel stack">
                  <Label>Principles</Label>
                  <div className="list">{plan.principles.map((p) => <div key={p} className="li strong">{p}</div>)}</div>
                </section>
              )}
              <Backup plan={plan} />
            </div>
            <div className="col">
              <Ladder plan={plan} />
            </div>
          </div>
        </>
      )}
      <Sheet open={importing} onClose={() => setImporting(false)} title="Replace plan">
        <ImportPanel bare onDone={() => setImporting(false)} />
      </Sheet>
    </div>
  )
}

function NowCard({ plan }: { plan: LifePlan }) {
  const c = currentIndex(plan)
  const now = plan.steps[c]
  const next = nextStep(plan)
  const days = daysToNext(plan)
  const pct = timelinePct(plan)
  return (
    <section className="panel deep stack" style={{ gap: 14 }}>
      <div className="row between">
        <Label>You are here · {pad(c + 1)}/{pad(plan.steps.length)}</Label>
        <span className="pill">{now.tag}</span>
      </div>
      {now.text && <p className="ar ar-block strong">{now.text}</p>}
      {next ? (
        <>
          <hr className="divider" />
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <div className="stack" style={{ gap: 6 }}>
              <Label>Next · {next.tag}</Label>
              <span className="mono small muted">{dueText(next.due)}</span>
            </div>
            {days != null && <div className="big-num" style={{ fontSize: 24 }}>{countdownText(days)}</div>}
          </div>
          {next.text && <p className="ar ar-block">{next.text}</p>}
          {next.details && <p className="ar ar-block muted small-ar">{next.details}</p>}
        </>
      ) : <div className="empty">Last step. This is the goal.</div>}
      {pct != null && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="row between"><Label>Timeline</Label><span className="mono small strong">{Math.round(pct * 100)}%</span></div>
          <Bar value={pct} max={1} thin />
        </div>
      )}
    </section>
  )
}

/** Steps as a ladder: the goal on top, where he stands at the bottom. */
function Ladder({ plan }: { plan: LifePlan }) {
  const [open, setOpen] = useState<string | null>(null)
  const [edit, setEdit] = useState<LifeStep | null>(null)
  const rows = plan.steps.map((s, i) => ({ s, i })).reverse()
  return (
    <section className="panel stack" style={{ gap: 4 }}>
      <Label>The climb</Label>
      <div className="ladder">
        {rows.map(({ s, i }) => {
          const st = stepState(plan, i)
          const on = open === s.id
          return (
            <div key={s.id} className={`rung ${st}`}>
              <button className="rung-head" onClick={() => setOpen(on ? null : s.id)} aria-expanded={on}>
                <span className="rung-dot" aria-hidden="true" />
                <span className="mono small">{pad(i + 1)}</span>
                <span className="grow strong rung-tag">{s.tag}</span>
                {st === 'now' && <span className="chip sm on">now</span>}
                <span className="label">{s.due?.slice(0, 4) ?? ''}</span>
              </button>
              {on && (
                <div className="stack rung-body" style={{ gap: 10 }}>
                  {s.text && <p className="ar ar-block strong">{s.text}</p>}
                  {s.details && <p className="ar ar-block muted small-ar">{s.details}</p>}
                  {s.note && <p className="small muted">{s.note}</p>}
                  <div className="row" style={{ gap: 8 }}>
                    {st !== 'now' && <button className="btn btn-outline grow" onClick={() => setLifeCurrent(i)}>I'm here</button>}
                    <button className="btn grow" onClick={() => setEdit(s)}>Edit</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit ? `Edit · ${edit.tag}` : ''}>
        {edit && <StepForm key={edit.id} step={edit} onDone={() => setEdit(null)} />}
      </Sheet>
    </section>
  )
}

function StepForm({ step, onDone }: { step: LifeStep; onDone: () => void }) {
  const [v, setV] = useState(step)
  const f = (k: keyof LifeStep) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); updateLifeStep(step.id, { ...v, due: v.due || null }); onDone() }}>
      <Label>Name</Label>
      <input className="field" value={v.tag} onChange={f('tag')} />
      <Label>What it looks like</Label>
      <textarea className="field ar" dir="rtl" value={v.text} onChange={f('text')} />
      <Label>Details</Label>
      <textarea className="field ar" dir="rtl" value={v.details} onChange={f('details')} />
      <Label>Date</Label>
      <input className="field" type="date" value={v.due ?? ''} onChange={f('due')} />
      <Label>Note</Label>
      <input className="field" value={v.note ?? ''} onChange={f('note')} />
      <button className="btn btn-filled" type="submit">Save</button>
    </form>
  )
}

function ImportPanel({ bare, onDone }: { bare?: boolean; onDone?: () => void }) {
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const go = () => {
    try {
      saveLifePlan(parsePlan(raw, newId), 'Plan saved')
      setRaw('')
      onDone?.()
    } catch (e: any) {
      setErr(e.message)
    }
  }
  const body = (
    <div className="stack" style={{ gap: 12 }}>
      <p className="muted small">Paste your plan JSON. It's saved to your account only, never to the code.</p>
      <textarea className="field mono" style={{ minHeight: 180, fontSize: 13 }} placeholder='{ "steps": [ … ] }'
        value={raw} onChange={(e) => { setRaw(e.target.value); setErr(null) }} />
      {err && <span className="chip sm warn">{err}</span>}
      <button className="btn btn-filled" disabled={!raw.trim()} onClick={go}>Save plan</button>
    </div>
  )
  return bare ? body : <section className="panel stack"><div className="title">No plan yet</div>{body}</section>
}

function Backup({ plan }: { plan: LifePlan }) {
  const copy = async () => {
    const { updated_at: _, ...rest } = plan
    try {
      await navigator.clipboard.writeText(JSON.stringify(rest, null, 2))
      toast('Plan copied as JSON')
    } catch {
      toast('Clipboard blocked', undefined, 'error')
    }
  }
  return <button className="btn btn-ghost" onClick={copy}>Copy plan as JSON</button>
}
