import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { quranStreak, weekStats } from '../lib/stats'
import { fmtDay, weekStart } from '../lib/time'
import { finishFrenchUnit, logFrench, quranTap, setFrenchUnit, type QuranMode } from '../lib/actions'
import { FRENCH_ACTIVITIES, FRENCH_MINUTES, GOALS } from '../data/program'
import { Bar, Label, Stepper } from '../components/ui'
import { JuzGrid, dueJuz } from '../components/Quran'

export function Learn() {
  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <h1 className="hero-word" style={{ fontSize: 34 }}>LEARN</h1>
      </header>
      <div className="cols c2">
        <Quran />
        <French />
      </div>
    </div>
  )
}

function Quran() {
  const data = useStore()
  const [mode, setMode] = useState<QuranMode>('revise')
  const w = useMemo(() => weekStats(data, weekStart()), [data])
  const streak = useMemo(() => quranStreak(data.logs), [data.logs])
  const due = dueJuz(data.juz)
  const memorized = Object.values(data.juz).filter((j) => j.memorized).length
  return (
    <section className="panel stack" style={{ gap: 16 }}>
      <div className="row between">
        <div className="title">Quran</div>
        <span className="label">{memorized}/30 memorized</span>
      </div>
      <div className="grid3">
        <Stat v={`${w.quranDays}/7`} k="Days this week" />
        <Stat v={w.juzRevised} k="Juz revised" />
        <Stat v={streak} k="Day streak" />
      </div>
      <Bar value={w.quranDays} max={GOALS.quranDays} />
      {due.length > 0 && (
        <div className="stack">
          <Label>Revise next due</Label>
          <div className="grid3">
            {due.map((n) => <button key={n} className="btn btn-outline" onClick={() => quranTap(n, 'revise')}>Juz {n}</button>)}
          </div>
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        {([['revise', 'Revise'], ['memorize', 'Memorized new'], ['clear', 'Clear']] as [QuranMode, string][]).map(([k, l]) => (
          <button key={k} className={`chip${mode === k ? (k === 'clear' ? ' warn' : ' on') : ''}`} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>
      <JuzGrid juz={data.juz} mode={mode} />
      <div className="row wrap" style={{ gap: 12 }}>
        <Legend cls="fresh" t="≤ 7 days" /><Legend cls="mid" t="8–14" /><Legend cls="old" t="> 14 / due" /><Legend cls="none" t="not memorized" />
      </div>
    </section>
  )
}

function French() {
  const data = useStore()
  const unit = data.appState?.french_unit ?? 1
  const level = data.appState?.settings?.french_level ?? 'A1'
  const [mins, setMins] = useState(30)
  const w = useMemo(() => weekStats(data, weekStart()), [data])
  const units = data.logs.filter((l) => l.type === 'french' && l.data.activity === 'finished_unit').sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  return (
    <section className="panel stack" style={{ gap: 16 }}>
      <div className="row between">
        <div className="title">French</div>
        <span className="pill">{level}</span>
      </div>
      <div className="row between wrap" style={{ gap: 12 }}>
        <Stepper value={`UNIT ${unit}`} onMinus={() => setFrenchUnit(unit - 1)} onPlus={() => setFrenchUnit(unit + 1)} />
        <button className="btn btn-outline" onClick={finishFrenchUnit}>Finished unit</button>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {FRENCH_MINUTES.map((d) => <button key={d} className={`chip${mins === d ? ' on' : ''}`} onClick={() => setMins(d)}>{d} min</button>)}
      </div>
      <div className="grid3">
        {FRENCH_ACTIVITIES.map(([k, l]) => <button key={k} className="btn btn-big" onClick={() => logFrench(k, mins)}>{l}</button>)}
      </div>
      <div className="grid3">
        <Stat v={w.frenchMin} k="Min this week" />
        <Stat v={`${w.frenchDays}/${GOALS.frenchDays}`} k="Days studied" />
        <Stat v={units.length} k="Units done" />
      </div>
      <div className="stack" style={{ gap: 5 }}>
        <div className="row between"><Label>Target ≥ {GOALS.frenchMinutes} min/week</Label><span className="mono small strong">{w.frenchMin}/{GOALS.frenchMinutes}</span></div>
        <Bar value={w.frenchMin} max={GOALS.frenchMinutes} />
      </div>
      {units.length > 0 && (
        <div className="stack">
          <Label>Units completed</Label>
          <div className="list">
            {units.slice(-8).reverse().map((u) => (
              <div key={u.id} className="li"><span className="mono small strong">UNIT {u.data.unit}</span><span className="grow" /><span className="label">{fmtDay(u.local_date)}</span></div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function Stat({ v, k }: { v: React.ReactNode; k: string }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="big-num" style={{ fontSize: 18, whiteSpace: 'nowrap' }}>{v}</div>
      <Label>{k}</Label>
    </div>
  )
}

function Legend({ cls, t }: { cls: string; t: string }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className={`juz ${cls}`} style={{ width: 14, height: 14, minHeight: 0, borderRadius: 4, aspectRatio: 'auto' }} />
      <span className="label" style={{ fontSize: 9 }}>{t}</span>
    </span>
  )
}

export { Stat }
