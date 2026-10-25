import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../lib/store'
import { setLifeCurrent, updateLifeStep } from '../lib/actions'
import {
  countdownText, currentIndex, daysToNext, dueText, isLight, lines, nextStep, quranTrack, stepColor, stepState,
} from '../lib/life'
import { REMINDER, addLifePhotos, loadLifePhotos, removeLifePhoto, useLifePhotos, type LifePhoto } from '../lib/lifephotos'
import { daysBetween, localDate } from '../lib/time'
import type { LifePlan, LifeRoad, LifeStep } from '../lib/types'
import { Label, Sheet } from '../components/ui'
import { Icon } from '../components/Icon'

const usePlan = () => useStore((s) => s.appState?.settings?.life_plan)
const pad = (n: number) => String(n).padStart(2, '0')
const TILT = [-3, 2.2, -1.4, 2.8, -2.2, 1.6]
const SWATCHES = ['#1e1e1e', '#f24822', '#ffc943', '#14ae5c', '#0d99ff', '#9747ff', '#ff24bd', '#00b5ce']

/** Card text colour on a step colour. */
const ink = (c: string) => (isLight(c) ? '#1e1e1e' : '#fff')

export function Life() {
  const plan = usePlan()
  const [edit, setEdit] = useState<string | null>(null)
  const [view, setView] = useState<LifePhoto | null>(null)
  useEffect(() => { void loadLifePhotos() }, [])

  if (!plan) {
    return (
      <div className="page">
        <header className="page-head"><h1 className="hero-word" style={{ fontSize: 34 }}>LIFE</h1></header>
        <section className="panel stack">
          <div className="title">No plan yet</div>
          <p className="muted">Add it in <a className="link" href="#/settings">Settings → Life plan</a>.</p>
        </section>
      </div>
    )
  }

  const years = plan.steps.map((s) => s.due?.slice(0, 4)).filter(Boolean)
  const editing = plan.steps.find((s) => s.id === edit) ?? null
  return (
    <div className="page life">
      <header className="life-head">
        {years.length > 1 && <span className="label">{years[0]} → {years[years.length - 1]}</span>}
        <h1 className="hero-word" style={{ fontSize: 44 }}>LIFE</h1>
      </header>

      <Hero plan={plan} onView={setView} onEditPhotos={() => setEdit(REMINDER)} />

      <div className="life-duo">
        {!!plan.principles?.length && (
          <section className="life-sticky orange">
            <h2>Things That I Wanna Achieve</h2>
            <ul>{plan.principles.map((p) => <li key={p}>{p}</li>)}</ul>
          </section>
        )}
        <QuranTrack plan={plan} />
      </div>

      {plan.road && <Road road={plan.road} />}

      <Board plan={plan} onEdit={setEdit} onView={setView} />

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={editing ? editing.tag : 'Photos at the top'}>
        {editing ? <StepForm key={editing.id} plan={plan} step={editing} onDone={() => setEdit(null)} />
          : edit === REMINDER ? <PhotoManager step={REMINDER} /> : null}
      </Sheet>
      {view && <Lightbox photo={view} onClose={() => setView(null)} />}
    </div>
  )
}

/** Reminder, its photos, the countdown to the next step and the whole timeline. */
function Hero({ plan, onView, onEditPhotos }: { plan: LifePlan; onView: (p: LifePhoto) => void; onEditPhotos: () => void }) {
  const c = currentIndex(plan)
  const now = plan.steps[c]
  const next = nextStep(plan)
  const days = daysToNext(plan)
  return (
    <section className="life-hero">
      {plan.reminder && <p className="life-pill ar">{plan.reminder}</p>}
      <Collage step={REMINDER} onView={onView} big onAdd={onEditPhotos} />
      <div className="life-count">
        <span className="label">You are at · {now.tag}</span>
        {next ? (
          <>
            <div className="life-big">{days != null ? countdownText(days) : next.tag}</div>
            <span className="label">until {next.tag}{next.due ? ` · ${dueText(next.due)}` : ''}</span>
          </>
        ) : <div className="life-big">Final step</div>}
      </div>
      <Timeline plan={plan} />
    </section>
  )
}

/** Every dated step as a coloured dot on one line, with today marked. */
function Timeline({ plan }: { plan: LifePlan }) {
  const dated = plan.steps.map((s, i) => ({ s, i })).filter((x) => x.s.due)
  if (dated.length < 2) return null
  const first = dated[0].s.due!
  const total = Math.max(1, daysBetween(first, dated[dated.length - 1].s.due!))
  const at = (d: string) => Math.min(100, Math.max(0, (daysBetween(first, d) / total) * 100))
  const today = at(localDate())
  return (
    <div className="life-line" aria-label={`${Math.round(today)}% of the way`}>
      <div className="life-line-track"><i style={{ width: `${today}%` }} /></div>
      {dated.map(({ s, i }) => (
        <span key={s.id} className="life-line-dot" style={{ left: `${at(s.due!)}%`, background: stepColor(s, i) }} title={s.tag} />
      ))}
      <span className="life-line-now" style={{ left: `${today}%` }} />
      <div className="life-line-years">
        {dated.map(({ s }) => <span key={s.id} style={{ left: `${at(s.due!)}%` }}>{s.due!.slice(2, 4)}</span>)}
      </div>
    </div>
  )
}

function QuranTrack({ plan }: { plan: LifePlan }) {
  const track = quranTrack(plan)
  if (track.length < 2) return null
  const c = currentIndex(plan)
  return (
    <section className="life-quran">
      <div className="row between"><Label>Quran · juz</Label><span className="ar" style={{ fontSize: 15 }}>القرآن</span></div>
      <div className="life-quran-row">
        {track.map(({ step, juz }) => {
          const i = plan.steps.indexOf(step)
          return (
            <div key={step.id} className={`life-juz${i <= c ? ' on' : ''}${juz >= 30 ? ' full' : ''}`}>
              <b>{juz}</b>
              <span>{step.due?.slice(0, 4) ?? ''}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** The money road from the board: circles flowing down, with the note beside it. */
function Road({ road }: { road: LifeRoad }) {
  const fills = ['#e4ccff', '#ffc7c2', '#0d99ff', '#9747ff', '#9747ff']
  return (
    <section className="life-road">
      <Label>The road</Label>
      {road.stages.map((row, r) => (
        <div key={r} className="life-road-stage">
          {r > 0 && <Arrow />}
          <div className="life-road-row">
            {row.map((n) => {
              const bg = fills[Math.min(r, fills.length - 1)]
              return <div key={n} className="life-bubble" style={{ background: bg, color: ink(bg) }}>{n}</div>
            })}
          </div>
          {r === road.stages.length - 3 && (road.note || road.aside) && (
            <div className="life-road-note">
              {road.note && <span className="life-road-orange">{road.note}</span>}
              {road.aside && <span className="life-road-aside">{road.aside}</span>}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}

function Arrow({ up }: { up?: boolean }) {
  return (
    <svg className="life-arrow" width="24" height="34" viewBox="0 0 24 34" aria-hidden="true" style={up ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M12 2v28M5 23l7 8 7-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The steps as on the board: goal on top, where he is at the bottom, arrows climbing up. */
function Board({ plan, onEdit, onView }: { plan: LifePlan; onEdit: (id: string) => void; onView: (p: LifePhoto) => void }) {
  const rows = plan.steps.map((s, i) => ({ s, i })).reverse()
  const today = localDate()
  return (
    <section className="life-board">
      <div className="row between"><Label>The climb</Label><span className="label">tap a card to edit</span></div>
      {rows.map(({ s, i }, k) => {
        const color = stepColor(s, i)
        const st = stepState(plan, i)
        const left = s.due ? daysBetween(today, s.due) : null
        return (
          <div key={s.id}>
            {k > 0 && <div className="life-climb"><Arrow up /></div>}
            <div className={`life-step ${st}`}>
              <button className="life-card" style={{ '--c': color, color: ink(color) } as CSSProperties} onClick={() => onEdit(s.id)}>
                <div className="life-card-top">
                  <span className="life-num">{pad(i + 1)}</span>
                  {st === 'now' && <span className="life-here">You are here</span>}
                  {st === 'next' && left != null && <span className="life-here soft">in {countdownText(left)}</span>}
                  <span className="life-date">{s.due ? dueText(s.due) : ''}</span>
                </div>
                <h2>{s.tag}</h2>
                <ul className="ar">{lines(s.text).map((l, j) => <li key={j}>{l}</li>)}</ul>
              </button>
              {s.details && (
                <div className="life-sticky yellow ar" style={{ rotate: `${k % 2 ? 1.2 : -1.2}deg` }}>
                  <ul>{lines(s.details).map((l, j) => <li key={j}>{l}</li>)}</ul>
                </div>
              )}
              <Collage step={s.id} onView={onView} />
              {s.note && <p className="life-note">“{s.note}”</p>}
            </div>
          </div>
        )
      })}
    </section>
  )
}

/** Polaroid-style photos, slightly tilted like a mood board. */
function Collage({ step, onView, big, onAdd }: { step: string; onView: (p: LifePhoto) => void; big?: boolean; onAdd?: () => void }) {
  const photos = useLifePhotos((s) => s.photos.filter((p) => p.step === step))
  const add = onAdd && <button className="life-add" onClick={onAdd}><Icon name="plus" size={14} glow={false} /> {photos.length ? 'Photos' : 'Add photos'}</button>
  if (!photos.length) return add ?? null
  return (
    <>
      <div className={`life-collage${big ? ' big' : ''}${photos.length === 1 ? ' one' : ''}`}>
        {photos.map((p, j) => (
          <button key={p.id} className="life-photo" style={{ rotate: `${TILT[j % TILT.length]}deg` }} onClick={() => onView(p)}>
            <img src={p.img} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {add}
    </>
  )
}

function PhotoManager({ step }: { step: string }) {
  const photos = useLifePhotos((s) => s.photos.filter((p) => p.step === step))
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    await addLifePhotos(step, [...files])
    setBusy(false)
    if (input.current) input.current.value = ''
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <Label>Photos</Label>
      <div className="life-thumbs">
        {photos.map((p) => (
          <div key={p.id} className="life-thumb">
            <img src={p.img} alt="" />
            <button aria-label="Remove photo" onClick={() => removeLifePhoto(p.id)}><Icon name="x" size={14} glow={false} /></button>
          </div>
        ))}
        <button className="life-thumb add" disabled={busy} onClick={() => input.current?.click()} aria-label="Add photos">
          <Icon name="plus" size={20} glow={false} />
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void pick(e.target.files)} />
    </div>
  )
}

function StepForm({ plan, step, onDone }: { plan: LifePlan; step: LifeStep; onDone: () => void }) {
  const [v, setV] = useState(step)
  const i = plan.steps.indexOf(step)
  const st = stepState(plan, i)
  const color = stepColor(v, i)
  const f = (k: keyof LifeStep) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); updateLifeStep(step.id, { ...v, due: v.due || null }); onDone() }}>
      {st !== 'now' && <button type="button" className="btn btn-outline" onClick={() => { setLifeCurrent(i); onDone() }}>I'm here now</button>}
      <PhotoManager step={step.id} />
      <Label>Name</Label>
      <input className="field" value={v.tag} onChange={f('tag')} />
      <Label>What it looks like</Label>
      <textarea className="field ar" dir="rtl" rows={4} value={v.text} onChange={f('text')} />
      <Label>Sticky note</Label>
      <textarea className="field ar" dir="rtl" rows={5} value={v.details} onChange={f('details')} />
      <Label>Date</Label>
      <input className="field" type="date" value={v.due ?? ''} onChange={f('due')} />
      <Label>Quote under the photos</Label>
      <input className="field" value={v.note ?? ''} onChange={f('note')} />
      <Label>Colour</Label>
      <div className="row wrap" style={{ gap: 10 }}>
        {SWATCHES.map((c) => (
          <button key={c} type="button" className={`life-swatch${color === c ? ' on' : ''}`} style={{ background: c }} aria-label={c} onClick={() => setV({ ...v, color: c })} />
        ))}
      </div>
      <button className="btn btn-filled" type="submit">Save</button>
    </form>
  )
}

function Lightbox({ photo, onClose }: { photo: LifePhoto; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return createPortal(
    <div className="life-lightbox" onClick={onClose} role="dialog" aria-label="Photo">
      <img src={photo.img} alt="" />
    </div>,
    document.body,
  )
}
