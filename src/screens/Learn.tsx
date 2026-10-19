import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { weekStats } from '../lib/stats'
import { fmtDay, weekStart } from '../lib/time'
import { finishFrenchUnit, logFrench, setFrenchUnit } from '../lib/actions'
import { FRENCH_ACTIVITIES, FRENCH_MINUTES } from '../data/program'
import { Label, Stepper } from '../components/ui'
import { QuranBrowser, surahStatus } from '../components/Quran'

export function Learn() {
  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <h1 className="hero-word" style={{ fontSize: 34 }}>LEARN</h1>
        <Label>No targets · every bit counts</Label>
      </header>
      <div className="cols c2">
        <Quran />
        <French />
      </div>
    </div>
  )
}

function Quran() {
  const events = useStore((s) => s.quran)
  const counts = useMemo(() => {
    let learned = 0, memorized = 0
    for (let n = 1; n <= 114; n++) {
      const st = surahStatus(events, n)
      if (st.memorized) memorized++
      else if (st.learned) learned++
    }
    return { learned, memorized }
  }, [events])
  const thisWeek = events.filter((e) => e.local_date >= weekStart()).length
  return (
    <section className="panel stack" style={{ gap: 16 }}>
      <div className="row between">
        <div className="title">Quran</div>
        <span className="ar strong" style={{ fontSize: 20 }}>القرآن</span>
      </div>
      <div className="grid3">
        <Stat v={counts.memorized} k="Memorized" />
        <Stat v={counts.learned} k="Learned" />
        <Stat v={thisWeek} k="This week" />
      </div>
      <QuranBrowser />
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
        <Stat v={w.frenchDays} k="Days" />
        <Stat v={units.length} k="Units done" />
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

export function Stat({ v, k }: { v: React.ReactNode; k: string }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="big-num" style={{ fontSize: 18, whiteSpace: 'nowrap' }}>{v}</div>
      <Label>{k}</Label>
    </div>
  )
}
