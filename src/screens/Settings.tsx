import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { patchSettings, setCategories, setPin } from '../lib/actions'
import { categoriesOf } from '../lib/focustags'
import { LifeData } from '../components/LifeData'
import { toast } from '../lib/toast'
import { DeleteX, Label, Toggle } from '../components/ui'
import { download } from './Review'

const TABLES = ['app_state', 'exercise_targets', 'workouts', 'workout_sets', 'sleep_segments', 'sleep', 'focus_blocks', 'quran_juz', 'logs', 'habit_entries', 'weekly_reviews']

/** Every table, oldest first. A table that errors (e.g. migration not run yet) is noted instead of failing the export. */
async function collectAll() {
  const out: Record<string, unknown> = { app: 'Ahmed OS', exported_at: new Date().toISOString(), timezone: 'America/Toronto' }
  const errors: Record<string, string> = {}
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select('*').range(0, 49999)
    if (error) errors[t] = error.message
    else out[t] = data
  }
  if (Object.keys(errors).length) out._errors = errors
  return out
}

export function Settings() {
  const app = useStore((s) => s.appState)!
  const email = useStore((s) => s.email)
  const [pinDraft, setPinDraft] = useState('')
  const [settingPin, setSettingPin] = useState(false)
  const st = app.settings ?? {}

  const exportAll = async () => {
    try {
      const out = await collectAll()
      download(`ahmed-os-all-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 2), 'application/json')
    } catch (e: any) {
      toast(e?.message || 'Export failed', undefined, 'error')
    }
  }

  const copyAll = async () => {
    try {
      const out = await collectAll()
      await navigator.clipboard.writeText(JSON.stringify(out))
      toast('All data copied · paste it to Claude')
    } catch (e: any) {
      toast(e?.message || 'Copy failed', undefined, 'error')
    }
  }

  return (
    <div className="page narrow">
      <div className="hero-light" />
      <header className="page-head">
        <h1 className="hero-word" style={{ fontSize: 30 }}>SETTINGS</h1>
        <a className="link" href="#/home">Done</a>
      </header>

      <section className="panel stack">
        <Label>Account</Label>
        <div className="row between">
          <span className="small">{email}</span>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </section>

      <section className="panel stack" style={{ gap: 14 }}>
        <Label>Streak privacy</Label>
        <div className="row between">
          <span>PIN lock for Streak tab</span>
          <Toggle label="PIN lock" on={!!app.streak_pin_hash} onChange={(v) => (v ? setSettingPin(true) : setPin(null))} />
        </div>
        {settingPin && (
          <div className="row" style={{ gap: 8 }}>
            <input className="field grow" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="4-digit PIN" type="password"
              value={pinDraft} onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            <button className="btn btn-filled" disabled={pinDraft.length !== 4} onClick={async () => { await setPin(pinDraft); setPinDraft(''); setSettingPin(false) }}>Set</button>
            <button className="btn btn-ghost" onClick={() => { setSettingPin(false); setPinDraft('') }}>Cancel</button>
          </div>
        )}
        <div className="row between">
          <span>Show Streak in Review</span>
          <Toggle label="Show Streak in Review" on={!!st.show_streak_in_review} onChange={(v) => patchSettings({ show_streak_in_review: v })} />
        </div>
      </section>

      <FocusCategories />

      <LifeData />

      <section className="panel stack" style={{ gap: 14 }}>
        <Label>Learn</Label>
        <div className="row between">
          <span>French level</span>
          <div className="row" style={{ gap: 6 }}>
            {['A1', 'A2', 'B1', 'B2'].map((l) => (
              <button key={l} className={`chip${(st.french_level ?? 'A1') === l ? ' on' : ''}`} onClick={() => patchSettings({ french_level: l })}>{l}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel stack">
        <Label>Data</Label>
        <button className="btn btn-filled" onClick={copyAll}>Copy all data (paste to Claude)</button>
        <button className="btn" onClick={exportAll}>Download all data (JSON)</button>
      </section>

      <section className="panel stack" style={{ gap: 8 }}>
        <Label>About</Label>
        <p className="small">Ahmed OS · v0.2 · weights in lb · America/Toronto · weeks run Saturday → Friday.</p>
        <p className="small muted">Not medical advice. See a physio for pain.</p>
        <Diagnostics />
      </section>
    </div>
  )
}

/** The categories offered when starting focus. Removing one keeps the time already logged under it. */
function FocusCategories() {
  const settings = useStore((s) => s.appState?.settings)
  const cats = categoriesOf(settings)
  const [name, setName] = useState('')
  const add = () => {
    const n = name.trim()
    if (n && !cats.some((c) => c.toLowerCase() === n.toLowerCase())) setCategories([...cats, n])
    setName('')
  }
  return (
    <section className="panel stack" style={{ gap: 14 }}>
      <Label>Focus categories</Label>
      <div className="list">
        {cats.map((c, i) => (
          <div key={c} className="li" style={{ gap: 8 }}>
            <span className="grow">{c}</span>
            {i > 0 && <button className="btn btn-ghost btn-sq" style={{ minHeight: 36, width: 36 }} aria-label={`Move ${c} up`}
              onClick={() => setCategories([...cats.slice(0, i - 1), c, cats[i - 1], ...cats.slice(i + 1)])}>↑</button>}
            <DeleteX onDelete={() => setCategories(cats.filter((x) => x !== c))} />
          </div>
        ))}
      </div>
      <form className="row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); add() }}>
        <input className="field grow" placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="done" />
        <button className="btn btn-filled" type="submit" disabled={!name.trim()}>Add</button>
      </form>
      <p className="small muted">Removing a category keeps the time already logged under it.</p>
    </section>
  )
}

/** Screen facts for layout debugging (send a screenshot of this). */
function Diagnostics() {
  const [d, setD] = useState('')
  useEffect(() => {
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
    document.body.appendChild(probe)
    const cs = getComputedStyle(probe)
    const safe = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map((v) => parseInt(v)).join('/')
    probe.remove()
    const bar = document.querySelector('.tabbar')?.getBoundingClientRect()
    const standalone = (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches
    setD([
      `build ${__BUILD__}`,
      standalone ? 'installed app' : 'browser tab',
      `screen ${screen.width}×${screen.height}`,
      `window ${innerWidth}×${innerHeight}`,
      `visual ${Math.round(visualViewport?.width ?? 0)}×${Math.round(visualViewport?.height ?? 0)}`,
      `safe ${safe}`,
      bar ? `tabbar top ${Math.round(bar.top)} h ${Math.round(bar.height)}` : 'tabbar hidden',
    ].join(' · '))
  }, [])
  return <p className="mono dim" style={{ fontSize: 10, lineHeight: 1.6, letterSpacing: '.04em' }}>{d}</p>
}
