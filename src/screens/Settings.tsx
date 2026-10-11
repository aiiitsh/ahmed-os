import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { patchSettings, patchSkill, setPin } from '../lib/actions'
import { toast } from '../lib/toast'
import { Label, Toggle } from '../components/ui'
import { download } from './Review'

const TABLES = ['app_state', 'exercise_targets', 'workouts', 'workout_sets', 'sleep', 'focus_blocks', 'quran_juz', 'logs', 'habit_entries', 'weekly_reviews']

export function Settings() {
  const app = useStore((s) => s.appState)!
  const email = useStore((s) => s.email)
  const [pinDraft, setPinDraft] = useState('')
  const [settingPin, setSettingPin] = useState(false)
  const st = app.settings ?? {}

  const exportAll = async () => {
    try {
      const out: Record<string, unknown> = { app: 'Ahmed OS', exported_at: new Date().toISOString() }
      for (const t of TABLES) {
        const { data, error } = await supabase.from(t).select('*').range(0, 49999)
        if (error) throw error
        out[t] = data
      }
      download(`ahmed-os-all-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 2), 'application/json')
    } catch (e: any) {
      toast(e?.message || 'Export failed', undefined, 'error')
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

      <section className="panel stack" style={{ gap: 12 }}>
        <Label>Thenx skills</Label>
        {Object.entries(app.skills).map(([k, s]) => (
          <SkillRow key={k} k={k} s={s} />
        ))}
      </section>

      <section className="panel stack" style={{ gap: 14 }}>
        <Label>Learn & units</Label>
        <div className="row between">
          <span>French level</span>
          <div className="row" style={{ gap: 6 }}>
            {['A1', 'A2', 'B1', 'B2'].map((l) => (
              <button key={l} className={`chip${(st.french_level ?? 'A1') === l ? ' on' : ''}`} onClick={() => patchSettings({ french_level: l })}>{l}</button>
            ))}
          </div>
        </div>
        <div className="row between">
          <span>Weight units (display)</span>
          <div className="row" style={{ gap: 6 }}>
            {(['kg', 'lb'] as const).map((u) => (
              <button key={u} className={`chip${(st.units ?? 'kg') === u ? ' on' : ''}`} onClick={() => patchSettings({ units: u })}>{u}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel stack">
        <Label>Data</Label>
        <button className="btn" onClick={exportAll}>Export all data (JSON)</button>
      </section>

      <section className="panel stack" style={{ gap: 8 }}>
        <Label>About</Label>
        <p className="small">Ahmed OS · v0.1 · America/Toronto · weeks run Saturday → Friday.</p>
        <p className="small muted">Not medical advice. See a physio for pain.</p>
        <Diagnostics />
      </section>
    </div>
  )
}

function SkillRow({ k, s }: { k: string; s: { name: string; level: number; level_name: string; pct: number; active: boolean } }) {
  const [name, setName] = useState(s.level_name)
  return (
    <div className="stack" style={{ gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--divider)' }}>
      <div className="row between">
        <span className="strong">{s.name}</span>
        <div className="row" style={{ gap: 10 }}>
          <button className="chip sm" onClick={() => patchSkill(k, { level: Math.max(1, s.level - 1) })}>−</button>
          <span className="mono small">LVL {s.level}</span>
          <button className="chip sm" onClick={() => patchSkill(k, { level: s.level + 1 })}>+</button>
          <Toggle label={`${s.name} active`} on={s.active} onChange={(v) => patchSkill(k, { active: v })} />
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input className="field grow" style={{ minHeight: 40, padding: '8px 12px' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Level name" />
        <button className="btn" disabled={name === s.level_name || !name.trim()} onClick={() => { patchSkill(k, { level_name: name.trim() }); toast('Saved') }}>Save</button>
      </div>
    </div>
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
