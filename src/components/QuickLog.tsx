import { useState } from 'react'
import { create } from 'zustand'
import { Icon } from './Icon'
import { Sheet, Stepper, Label } from './ui'
import { JuzGrid, dueJuz } from './Quran'
import { CARDIO, DURATIONS, FRENCH_ACTIVITIES, FRENCH_MINUTES, STRETCHES, type Sport } from '../data/program'
import { flagBack, logCardio, logFrench, logProtein, logStretch, proteinToday, quranTap, saveHabit, startFocus } from '../lib/actions'
import { useStore } from '../lib/store'
import { localDate, hhmm, fmtStopwatch } from '../lib/time'

export type SheetKey = Sport | 'stretch' | 'quran' | 'french' | 'focus' | 'streak'

export const useSheet = create<{ open: SheetKey | null }>(() => ({ open: null }))
export const openSheet = (k: SheetKey) => useSheet.setState({ open: k })
const close = () => useSheet.setState({ open: null })

function CardioSheet({ sport }: { sport: Sport }) {
  const c = CARDIO[sport]
  const [mins, setMins] = useState<number>(c.def)
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row wrap" style={{ gap: 8 }}>
        {DURATIONS.map((d) => (
          <button key={d} className={`chip${mins === d ? ' on' : ''}`} onClick={() => setMins(d)}>{d} min</button>
        ))}
      </div>
      <div className="stack">
        {c.variants.map(([k, label]) => (
          <button key={k} className="btn btn-big btn-block" onClick={() => { logCardio(sport, k, mins); close() }}>
            <Icon name={c.icon} size={22} /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StretchSheet() {
  return (
    <div className="stack">
      {STRETCHES.map(([k, label]) => (
        <button key={k} className={`btn btn-big btn-block${k === 'hip_flexors' ? ' btn-outline' : ''}`} onClick={() => { logStretch(k); close() }}>
          <Icon name={k === 'hip_flexors' ? 'hipflexor' : k === 'chest' ? 'cheststretch' : 'stretch'} size={22} /> {label}
        </button>
      ))}
    </div>
  )
}

function QuranSheet() {
  const juz = useStore((s) => s.juz)
  const due = dueJuz(juz)
  return (
    <div className="stack" style={{ gap: 16 }}>
      {due.length > 0 && (
        <div className="stack">
          <Label>Revise next due</Label>
          <div className="grid3">
            {due.map((n) => (
              <button key={n} className="btn btn-outline btn-big" onClick={() => { quranTap(n, 'revise'); close() }}>Juz {n}</button>
            ))}
          </div>
        </div>
      )}
      <Label>Tap a juz to log revision</Label>
      <JuzGrid juz={juz} mode="revise" onTap={close} />
    </div>
  )
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
    <div className="grid2">
      <button className="btn btn-big btn-outline" onClick={() => { startFocus('work'); close() }}><Icon name="focus" size={22} /> Start work</button>
      <button className="btn btn-big btn-outline" onClick={() => { startFocus('study'); close() }}><Icon name="quran" size={22} /> Start study</button>
    </div>
  )
}

function StreakSheet() {
  const [count, setCount] = useState(1)
  return (
    <div className="stack" style={{ gap: 18, alignItems: 'center' }}>
      <Label>Today · {localDate()}</Label>
      <Stepper value={count} sub="times" onMinus={() => setCount((c) => Math.max(0, c - 1))} onPlus={() => setCount((c) => c + 1)} />
      <button className="btn btn-filled btn-big btn-block btn-caps" onClick={() => { saveHabit(localDate(), count, null); close() }}>Save</button>
      <a className="link" href="#/streak" onClick={close}>Open Streak tab</a>
    </div>
  )
}

const TITLES: Record<SheetKey, string> = {
  swim: 'Swim', run: 'Run', squash: 'Squash', stretch: 'Stretch', quran: 'Quran', french: 'French', focus: 'Focus', streak: 'Streak',
}

export function QuickSheets() {
  const open = useSheet((s) => s.open)
  return (
    <Sheet open={open != null} onClose={close} title={open ? TITLES[open] : undefined}>
      {open === 'swim' || open === 'run' || open === 'squash' ? <CardioSheet key={open} sport={open} /> : null}
      {open === 'stretch' && <StretchSheet />}
      {open === 'quran' && <QuranSheet />}
      {open === 'french' && <FrenchSheet />}
      {open === 'focus' && <FocusSheet />}
      {open === 'streak' && <StreakSheet />}
    </Sheet>
  )
}

// ---------- tiles ----------

export function Tile({ icon, label, sub, onClick, done, small }: { icon: string; label: string; sub?: string; onClick: () => void; done?: boolean; small?: boolean }) {
  return (
    <button className={`tile${done ? ' done' : ''}${small ? ' small' : ''}`} onClick={onClick}>
      <Icon name={icon} size={small ? 20 : 24} />
      <span className="tl">{label}</span>
      {!small && <span className="ts">{sub || ' '}</span>}
    </button>
  )
}

/** Sub-state text for each tile (e.g. Protein "✓ today", Quran "Juz 12 due"). */
export function useTileSubs() {
  const logs = useStore((s) => s.logs)
  const juz = useStore((s) => s.juz)
  const focus = useStore((s) => s.appState?.focus)
  const habits = useStore((s) => s.habits)
  const today = localDate()
  const todays = logs.filter((l) => l.local_date === today)
  const last = (pred: (l: (typeof logs)[number]) => boolean) => [...todays].reverse().find(pred)
  const cardio = (sport: string) => {
    const l = last((x) => x.type === 'cardio' && x.data.sport === sport)
    return l ? `✓ ${l.data.minutes}M` : ''
  }
  const stretch = last((x) => x.type === 'stretch')
  const french = todays.filter((l) => l.type === 'french').reduce((a, l) => a + (l.data.minutes || 0), 0)
  const quranToday = todays.some((l) => l.type === 'quran')
  const due = dueJuz(juz, 1)[0]
  const hab = habits.find((h) => h.entry_date === today)
  return {
    swim: cardio('swim'), run: cardio('run'), squash: cardio('squash'),
    stretch: stretch ? `✓ ${hhmm(stretch.logged_at)}` : '',
    quran: quranToday ? '✓ today' : due ? `Juz ${due} due` : '',
    quranDone: quranToday,
    french: french ? `✓ ${french}M` : '',
    focus: focus ? `${focus.mode === 'focus' ? 'ON' : 'BREAK'} ${fmtStopwatch(Date.now() - new Date(focus.started_at).getTime())}` : '',
    protein: proteinToday() ? '✓ today' : '',
    back: todays.some((l) => l.type === 'flag') ? '✓ noted' : '',
    streak: hab ? '✓ logged' : '',
  }
}

export function QuickGrid() {
  const s = useTileSubs()
  return (
    <div className="stack">
      <div className="grid4">
        <Tile icon="swim" label="Swim" sub={s.swim} done={!!s.swim} onClick={() => openSheet('swim')} />
        <Tile icon="run" label="Run" sub={s.run} done={!!s.run} onClick={() => openSheet('run')} />
        <Tile icon="squash" label="Squash" sub={s.squash} done={!!s.squash} onClick={() => openSheet('squash')} />
        <Tile icon="stretch" label="Stretch" sub={s.stretch} done={!!s.stretch} onClick={() => openSheet('stretch')} />
        <Tile icon="quran" label="Quran" sub={s.quran} done={s.quranDone} onClick={() => openSheet('quran')} />
        <Tile icon="french" label="French" sub={s.french} done={!!s.french} onClick={() => openSheet('french')} />
        <Tile icon="focus" label="Focus" sub={s.focus} done={!!s.focus} onClick={() => (s.focus ? (location.hash = '#/work') : openSheet('focus'))} />
        <Tile icon="protein" label="Protein" sub={s.protein} done={!!s.protein} onClick={logProtein} />
      </div>
      <div className="grid2">
        <Tile small icon="back" label={s.back ? 'Back tight ✓' : 'Back tight'} done={!!s.back} onClick={flagBack} />
        <Tile small icon="tab-streak" label={s.streak ? 'Streak ✓' : 'Streak'} done={!!s.streak} onClick={() => openSheet('streak')} />
      </div>
    </div>
  )
}
