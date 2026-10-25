import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import { demoMode, demoData } from './lib/demo'
import { load, seedIfNeeded, set, useStore, get } from './lib/store'
import { setErrorHandler, startQueue } from './lib/queue'
import { toast } from './lib/toast'
import { autoCloseStaleSession, backfillStudyOct24, focusBreak, focusResume, saveWeekPlan, startFocus } from './lib/actions'
import { generateWeekPlan, planFor } from './lib/weekplan'
import { dow, localDate, weekStart } from './lib/time'
import { GlowDefs, Toasts } from './components/ui'
import { Icon } from './components/Icon'
import { QuickSheets, useSheet } from './components/QuickLog'
import { Login } from './screens/Login'
import { Home } from './screens/Home'
import { Body } from './screens/Body'
import { SessionRunner, useFinish } from './screens/SessionRunner'
import { Learn } from './screens/Learn'
import { Work } from './screens/Work'
import { Streak } from './screens/Streak'
import { Review } from './screens/Review'
import { Settings } from './screens/Settings'
import { Life } from './screens/Life'

export type Route = 'home' | 'body' | 'learn' | 'work' | 'streak' | 'review' | 'life' | 'settings'
const ROUTES: Route[] = ['home', 'body', 'learn', 'work', 'streak', 'review', 'life', 'settings']
const TABS: { r: Route; icon: string; label: string }[] = [
  { r: 'home', icon: 'tab-home', label: 'Home' },
  { r: 'body', icon: 'tab-body', label: 'Body' },
  { r: 'learn', icon: 'tab-learn', label: 'Learn' },
  { r: 'work', icon: 'tab-work', label: 'Work' },
  { r: 'streak', icon: 'tab-streak', label: 'Streak' },
  { r: 'review', icon: 'tab-review', label: 'Review' },
]

function useRoute(): Route {
  const parse = (): Route => {
    const h = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] as Route
    return ROUTES.includes(h) ? h : 'home'
  }
  const [r, setR] = useState(parse)
  useEffect(() => {
    const on = () => setR(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export function App() {
  if (demoMode) return <Demo />
  return <Live />
}

function Demo() {
  useEffect(() => { set({ userId: 'demo', email: 'demo@local', ...demoData('demo'), loaded: true }) }, [])
  return <Shell />
}

function Live() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!configured) return
    setErrorHandler((m) => toast(m, undefined, 'error'))
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    set({ userId, email: session?.user.email ?? null, loaded: false })
    ;(async () => {
      try {
        await seedIfNeeded(userId)
      } catch (e: any) {
        set({ loadError: e?.message || 'Could not set up your data' })
      }
      if (!cancelled) await load(true)
      autoCloseStaleSession()
      // Saturday (or Sunday): make this week's plan automatically if there isn't one.
      const today = localDate()
      if ((dow(today) === 6 || dow(today) === 0) && get().appState && !planFor(get(), weekStart(today))) {
        saveWeekPlan(generateWeekPlan(get(), weekStart(today)))
      }
      startQueue()
    })()

    // Refresh: realtime (if the publication is enabled), focus/visibility, and a slow poll.
    let t: number | undefined
    const soon = () => { window.clearTimeout(t); t = window.setTimeout(() => void load(), 400) }
    const channel = supabase.channel('ahmed-os').on('postgres_changes', { event: '*', schema: 'public' }, soon).subscribe()
    const vis = () => document.visibilityState === 'visible' && soon()
    window.addEventListener('focus', soon)
    document.addEventListener('visibilitychange', vis)
    const poll = window.setInterval(() => document.visibilityState === 'visible' && void load(), 60000)
    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
      window.removeEventListener('focus', soon)
      document.removeEventListener('visibilitychange', vis)
      window.clearInterval(poll)
    }
  }, [userId])

  if (!configured) return <SetupNeeded />
  if (session === undefined) return <Splash />
  if (!session) return <><GlowDefs /><Login /><Toasts /></>
  return <Shell />
}

function Shell() {
  const route = useRoute()
  const loaded = useStore((s) => s.loaded)
  const loadError = useStore((s) => s.loadError)
  const hasApp = useStore((s) => !!s.appState)
  const active = useStore((s) => !!s.appState?.active_session)
  const finished = useFinish((f) => !!f.summary)
  useShortcuts()
  useEffect(() => useSheet.setState({ open: null }), [route])
  useEffect(() => { if (loaded && hasApp) backfillStudyOct24() }, [loaded, hasApp])

  let screen
  if (!loaded || !hasApp) {
    screen = loadError ? (
      <div className="page"><div className="panel stack"><div className="title">Can't load</div><p className="muted">{loadError}</p>
        <button className="btn btn-outline" onClick={() => void load(true)}>Retry</button></div></div>
    ) : <Splash inline />
  } else {
    screen = SCREENS[route]()
  }

  return (
    <div className="app">
      <GlowDefs />
      <nav className="sidebar" aria-label="Main">
        <div className="brand">AHMED</div>
        {TABS.map((t) => <TabLink key={t.r} t={t} on={route === t.r} />)}
        <div style={{ flex: 1 }} />
        <TabLink t={{ r: 'life', icon: 'life', label: 'Life' }} on={route === 'life'} />
        <TabLink t={{ r: 'settings', icon: 'gear', label: 'Settings' }} on={route === 'settings'} />
      </nav>
      <Screens route={route}>{(r) => (loaded && hasApp ? SCREENS[r]() : screen)}</Screens>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => <TabLink key={t.r} t={t} on={route === t.r} />)}
      </nav>
      {loaded && (active || finished) && <SessionRunner />}
      <QuickSheets />
      <Toasts />
    </div>
  )
}

const SCREENS: Record<Route, () => ReactNode> = {
  home: () => <Home />, body: () => <Body />, learn: () => <Learn />, work: () => <Work />,
  streak: () => <Streak />, review: () => <Review />, life: () => <Life />, settings: () => <Settings />,
}

// ---------- native-feel navigation: slide transitions + swipe between tabs ----------

const ORDER: Route[] = ['home', 'body', 'learn', 'work', 'streak', 'review']
const rank = (r: Route) => (r === 'settings' ? 99 : r === 'life' ? 98 : ORDER.indexOf(r))
type Layer = { r: Route; id: number; cls: string }

function Screens({ route, children }: { route: Route; children: (r: Route) => ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>([{ r: route, id: 0, cls: '' }])
  const prev = useRef(route)
  const seq = useRef(0)
  const touch = useRef<{ x: number; y: number; t: number } | null>(null)

  useEffect(() => {
    if (prev.current === route) return
    const fwd = rank(route) > rank(prev.current)
    prev.current = route
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = ++seq.current
    setLayers((ls) => {
      const cur = ls[ls.length - 1]
      const next = { r: route, id, cls: still ? '' : fwd ? 'in-right' : 'in-left' }
      return still ? [next] : [{ ...cur, cls: fwd ? 'out-left' : 'out-right' }, next]
    })
    // Fallback in case animationend never fires (backgrounded tab, etc.)
    const t = window.setTimeout(() => settle(id), 600)
    return () => window.clearTimeout(t)
  }, [route])

  const settle = (id: number) => setLayers((ls) => {
    const last = ls[ls.length - 1]
    return last.id === id ? [{ ...last, cls: '' }] : ls
  })

  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.target as HTMLElement
    const p = e.touches[0]
    touch.current = e.touches.length === 1 && p.clientX > 20 && !el.closest('input, textarea, select, .heat, .stepper, [data-noswipe]')
      ? { x: p.clientX, y: p.clientY, t: Date.now() } : null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current
    touch.current = null
    if (!s) return
    const p = e.changedTouches[0]
    const dx = p.clientX - s.x, dy = p.clientY - s.y
    if (Math.abs(dx) < 70 || Math.abs(dx) < 2 * Math.abs(dy) || Date.now() - s.t > 700) return
    const i = ORDER.indexOf(route)
    const to = i < 0 ? (dx > 0 ? 'home' : null) : ORDER[i + (dx < 0 ? 1 : -1)]
    if (to) location.hash = `#/${to}`
  }

  return (
    <main className="main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {layers.map((l, i) => (
        <div key={l.id} className={`screen ${l.cls}${i === layers.length - 1 ? ' current' : ''}`}
          aria-hidden={i !== layers.length - 1}
          onAnimationEnd={(e) => e.target === e.currentTarget && l.cls.startsWith('in') && settle(l.id)}>
          {children(l.r)}
        </div>
      ))}
    </main>
  )
}

function TabLink({ t, on }: { t: { r: Route; icon: string; label: string }; on: boolean }) {
  return (
    <a className={`tab${on ? ' on' : ''}`} href={`#/${t.r}`} aria-current={on ? 'page' : undefined} style={{ textDecoration: 'none' }}>
      <Icon name={t.icon} size={24} />
      <span className="label">{t.label}</span>
    </a>
  )
}

/** Laptop: F = focus start / break / back. */
function useShortcuts() {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (get().appState?.active_session) return
      const key = e.key.toLowerCase()
      if (key === 'f') {
        const f = get().appState?.focus
        if (!f) startFocus()
        else if (f.mode === 'focus') focusBreak('break')
        else focusResume()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
}

function Splash({ inline }: { inline?: boolean }) {
  return (
    <div style={{ minHeight: inline ? '60vh' : '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="hero-word pulse-text">AHMED</div>
    </div>
  )
}

function SetupNeeded() {
  return (
    <div className="main"><div className="screen"><div className="page"><div className="hero-light" />
      <div className="hero-word">AHMED</div>
      <div className="panel stack">
        <div className="title">Connect Supabase</div>
        <p className="muted">Copy <span className="mono">.env.example</span> to <span className="mono">.env.local</span> and set
          <span className="mono"> VITE_SUPABASE_URL</span> and <span className="mono">VITE_SUPABASE_ANON_KEY</span>, then restart the dev server.
          For the deployed site, add them as GitHub Actions secrets.</p>
      </div>
    </div></div></div>
  )
}
