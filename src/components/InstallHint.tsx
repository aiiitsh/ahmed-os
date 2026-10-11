import { useState } from 'react'
import { Icon } from './Icon'

const KEY = 'ahmed-os:install-hint-dismissed'

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches

function dismissed() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

/**
 * Safari tabs can lose the saved login (private tabs, cleared website data, 7-day storage limits).
 * The home-screen app keeps it and opens full screen, so nudge toward installing.
 */
export function InstallHint({ always }: { always?: boolean }) {
  const [hidden, setHidden] = useState(() => !isIos() || isStandalone() || (!always && dismissed()))
  if (hidden) return null
  const close = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* private mode */ }
    setHidden(true)
  }
  return (
    <section className="panel row" style={{ gap: 12, padding: 14, alignItems: 'flex-start' }}>
      <Icon name="download" size={20} />
      <div className="stack grow" style={{ gap: 4 }}>
        <span className="strong small">Install Ahmed OS</span>
        <span className="muted small" style={{ lineHeight: 1.45 }}>
          Tap <b>Share</b> → <b>Add to Home Screen</b>, then open it from the icon. It stays signed in and opens full screen like an app.
        </span>
      </div>
      {!always && (
        <button className="btn btn-ghost btn-sq" style={{ minHeight: 32, width: 32 }} onClick={close} aria-label="Dismiss">
          <Icon name="x" size={16} glow={false} />
        </button>
      )}
    </section>
  )
}
