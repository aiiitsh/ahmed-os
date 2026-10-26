import { useState } from 'react'
import { create } from 'zustand'
import { Icon } from './Icon'
import { Sheet, Stepper, Label } from './ui'
import { QuranBrowser } from './Quran'
import { CARDIO, DAILY_ROUTINE, DURATIONS, FRENCH_ACTIVITIES, FRENCH_MINUTES, PROTEIN_FOODS, ROUTINE_TIP, SWIM, SWIM_HOW } from '../data/program'
import { logCardio, logFrench, logHike, logProtein, logRoutine, logSwim, routineToday, startFocus, swimPlan } from '../lib/actions'
import { proteinGoal, proteinOn } from '../lib/plan'
import { useStore } from '../lib/store'
import { fmtDur, localDate } from '../lib/time'

export type SheetKey = 'cardio' | 'swim' | 'run' | 'squash' | 'hike' | 'routine' | 'quran' | 'french' | 'focus' | 'protein'

export const useSheet = create<{ open: SheetKey | null }>(() => ({ open: null }))
export const openSheet = (k: SheetKey) => useSheet.setState({ open: k })
const close = () => useSheet.setState({ open: null })

/** Segmented picker (one choice). */
export function Segmented<T extends string>({ value, options, onChange, warn }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; warn?: T
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([k, label]) => (
        <button key={k} role="radio" aria-checked={value === k} className={`seg-btn${value === k ? (warn === k ? ' on red' : ' on') : ''}`} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  )
}

type Ago = '0' | '1' | '2'
const AGO: [Ago, string][] = [['0', 'Today'], ['1', 'Yesterday'], ['2', '2 days ago']]

function SwimSheet() {
  useStore((s) => s.logs)
  const { target_m } = swimPlan()
  const [daysAgo, setDaysAgo] = useState<Ago>('0')
  const [meters, setMeters] = useState(target_m)
  const [minutes, setMinutes] = useState(35)
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="panel" style={{ padding: 14 }}>
        <Label>Today's swim</Label>
        <p style={{ marginTop: 8, lineHeight: 1.55 }}>
          <b>{target_m} m</b>, slow. {SWIM_HOW} Distance goes up {SWIM.step_m} m each time you make it, up to {SWIM.max_m} m.
        </p>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <Label>When</Label>
        <Segmented value={daysAgo} options={AGO} onChange={setDaysAgo} />
      </div>
      <div className="stack" style={{ gap: 8, alignItems: 'center' }}>
        <Label>Distance</Label>
        <Stepper value={`${meters}`} sub="metres" onMinus={() => setMeters((m) => Math.max(50, m - 50))} onPlus={() => setMeters((m) => m + 50)} />
      </div>
      <div className="stack" style={{ gap: 8, alignItems: 'center' }}>
        <Label>Time</Label>
        <Stepper value={`${minutes}`} sub="minutes" onMinus={() => setMinutes((m) => Math.max(5, m - 5))} onPlus={() => setMinutes((m) => m + 5)} />
      </div>
      <button className="btn btn-filled btn-big btn-caps" onClick={() => { logSwim({ meters, minutes }, Number(daysAgo)); close() }}>Save swim</button>
    </div>
  )
}

function ProteinSheet() {
  const data = useStore()
  const today = localDate()
  const g = proteinOn(data, today)
  const goal = proteinGoal(data)
  const [custom, setCustom] = useState(30)
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="stack" style={{ gap: 4, alignItems: 'center' }}>
        <span className="big-num" style={{ fontSize: 32 }}>{g}<span style={{ fontSize: 14 }}> / {goal} g</span></span>
        <Label>Today · about 30 g at each of 4 meals</Label>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        {PROTEIN_FOODS.map(([name, n]) => (
          <button key={name} className="chip" onClick={() => logProtein(n, name)}>{name} +{n} g</button>
        ))}
      </div>
      <div className="stack" style={{ gap: 8, alignItems: 'center' }}>
        <Label>Something else</Label>
        <Stepper value={`${custom}`} sub="grams" onMinus={() => setCustom((c) => Math.max(5, c - 5))} onPlus={() => setCustom((c) => c + 5)} />
        <button className="btn btn-outline btn-caps" onClick={() => logProtein(custom)}>Add {custom} g</button>
      </div>
      <button className="btn btn-filled btn-big btn-caps" onClick={close}>Done</button>
    </div>
  )
}

function CardioSheet({ sport }: { sport: 'run' | 'squash' }) {
  const c = CARDIO[sport]
  const [mins, setMins] = useState<number>(c.def)
  const [daysAgo, setDaysAgo] = useState<Ago>('0')
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Segmented value={daysAgo} options={AGO} onChange={setDaysAgo} />
      <div className="row wrap" style={{ gap: 8 }}>
        {DURATIONS.map((d) => (
          <button key={d} className={`chip${mins === d ? ' on' : ''}`} onClick={() => setMins(d)}>{d} min</button>
        ))}
      </div>
      <div className="stack">
        {c.variants.map(([k, label]) => (
          <button key={k} className="btn btn-big btn-block" onClick={() => { logCardio(sport, k, mins, Number(daysAgo)); close() }}>
            <Icon name={c.icon} size={22} /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function HikeSheet() {
  const [km, setKm] = useState(10)
  const [min, setMin] = useState(180)
  const [daysAgo, setDaysAgo] = useState<Ago>('0')
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="stack" style={{ gap: 8 }}>
        <Label>When</Label>
        <Segmented value={daysAgo} options={AGO} onChange={setDaysAgo} />
      </div>
      <div className="stack" style={{ gap: 8, alignItems: 'center' }}>
        <Label>Distance</Label>
        <Stepper value={`${km}`} sub="km" onMinus={() => setKm((k) => Math.max(1, k - 1))} onPlus={() => setKm((k) => k + 1)} />
      </div>
      <div className="stack" style={{ gap: 8, alignItems: 'center' }}>
        <Label>Time</Label>
        <Stepper value={fmtDur(min)} sub="± 30 min" onMinus={() => setMin((m) => Math.max(30, m - 30))} onPlus={() => setMin((m) => m + 30)} />
      </div>
      <button className="btn btn-filled btn-big btn-caps" onClick={() => { logHike(km, min, Number(daysAgo)); close() }}>Save hike</button>
    </div>
  )
}

function RoutineSheet() {
  useStore((s) => s.logs)
  const done = !!routineToday()
  return (
    <div className="stack" style={{ gap: 14 }}>
      <p className="muted small">About 8 minutes on non-gym days. {ROUTINE_TIP}</p>
      <div className="list">
        {DAILY_ROUTINE.map((r) => (
          <div key={r.name} className="li">
            <Icon name={r.icon} size={22} />
            <span className="grow">{r.name}</span>
            <span className="mono small muted">{r.dose}</span>
          </div>
        ))}
      </div>
      <button className={`btn btn-big btn-caps${done ? '' : ' btn-filled'}`} onClick={() => { logRoutine(); close() }}>
        {done ? 'Done today ✓' : 'Done'}
      </button>
    </div>
  )
}

function QuranSheet() {
  return <QuranBrowser />
}

function FrenchSheet() {
  const [mins, setMins] = useState(30)
  const unit = useStore((s) => s.appState?.french_unit ?? 1)
  return (
    <div className="stack" style={{ gap: 16 }}>
      <Label>Unit {unit}</Label>
      <div className="row wrap" style={{ gap: 8 }}>
        {FRENCH_MINUTES.map((d) => (
          <button key={d} className={`chip${mins === d ? ' on' : ''}`} onClick={() => setMins(d)}>{d} min</button>
        ))}
      </div>
      <div className="grid2">
        {FRENCH_ACTIVITIES.map(([k, label]) => (
          <button key={k} className="btn btn-big" onClick={() => { logFrench(k, mins); close() }}>{label}</button>
        ))}
      </div>
    </div>
  )
}

function FocusSheet() {
  return (
    <div className="stack" style={{ gap: 12 }}>
      <p className="muted small">Real, deep focus only. Phone away. Tap Stop when you drift.</p>
      <button className="btn btn-big btn-filled btn-caps" onClick={() => { startFocus(); close() }}><Icon name="focus" size={22} glow={false} /> Start focus</button>
    </div>
  )
}

function CardioPicker() {
  const opts: [SheetKey, string, string][] = [['swim', 'Swim', 'swim'], ['hike', 'Hike', 'hike'], ['run', 'Run', 'run'], ['squash', 'Squash', 'squash']]
  return (
    <div className="grid2">
      {opts.map(([k, label, icon]) => (
        <button key={k} className="btn btn-big" style={{ minHeight: 84, flexDirection: 'column', gap: 6 }} onClick={() => openSheet(k)}>
          <Icon name={icon} size={26} /> {label}
        </button>
      ))}
    </div>
  )
}

const TITLES: Record<SheetKey, string> = {
  cardio: 'What did you do?', swim: 'Log swim', run: 'Run', squash: 'Squash', hike: 'Log hike', routine: 'Posture reset', quran: 'Quran', french: 'French', focus: 'Focus', protein: 'Protein',
}

export function QuickSheets() {
  const open = useSheet((s) => s.open)
  return (
    <Sheet open={open != null} onClose={close} title={open ? TITLES[open] : undefined}>
      {open === 'swim' && <SwimSheet />}
      {open === 'protein' && <ProteinSheet />}
      {(open === 'run' || open === 'squash') && <CardioSheet key={open} sport={open} />}
      {open === 'hike' && <HikeSheet />}
      {open === 'cardio' && <CardioPicker />}
      {open === 'routine' && <RoutineSheet />}
      {open === 'quran' && <QuranSheet />}
      {open === 'french' && <FrenchSheet />}
      {open === 'focus' && <FocusSheet />}
    </Sheet>
  )
}

// ---------- tiles ----------

export function Tile({ icon, label, sub, onClick, done }: { icon: string; label: string; sub?: string; onClick: () => void; done?: boolean }) {
  return (
    <button className={`tile${done ? ' done' : ''}`} onClick={onClick}>
      <Icon name={icon} size={24} />
      <span className="tl">{label}</span>
      <span className="ts">{sub || ' '}</span>
    </button>
  )
}

/** "✓ 45M" when a sport was logged today. */
export function useCardioToday() {
  const logs = useStore((s) => s.logs)
  const today = localDate()
  const last = (sport: string) => [...logs].reverse().find((l) => l.local_date === today && l.type === 'cardio' && l.data.sport === sport)
  const sub = (sport: string) => { const l = last(sport); return l ? `✓ ${l.data.minutes}M` : '' }
  const hike = last('hike')
  return { swim: sub('swim'), run: sub('run'), squash: sub('squash'), hike: hike ? `✓ ${hike.data.km} KM` : '' }
}
