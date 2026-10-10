import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { useToasts, dismiss } from '../lib/toast'

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

/** SVG glow filters, mounted once; referenced as url(#gh) / url(#gs) / url(#gring). */
export function GlowDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="gh" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="gs" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="gring" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
    </svg>
  )
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`label ${className}`}>{children}</div>
}

/** Fill level → glow class: fuller = whiter + glowier. */
export const barLevel = (p: number) => (p >= 0.8 ? 'l3' : p >= 0.34 ? 'l2' : 'l1')

export function Bar({ value, max, thin }: { value: number; max: number; thin?: boolean }) {
  const p = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className={`bar${thin ? ' thin' : ''}`}>
      {p > 0 && <i className={barLevel(p)} style={{ width: `${p * 100}%` }} />}
    </div>
  )
}

export function Ring({ pct, size = 120, children }: { pct: number; size?: number; children?: ReactNode }) {
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, pct))
  const ticks = Array.from({ length: 40 }, (_, i) => i)
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {ticks.map((i) => {
          const a = (i / 40) * Math.PI * 2 - Math.PI / 2
          const r1 = r + 6, r2 = r + 8.5
          return <line key={i} x1={size / 2 + Math.cos(a) * r1} y1={size / 2 + Math.sin(a) * r1} x2={size / 2 + Math.cos(a) * r2} y2={size / 2 + Math.sin(a) * r2} stroke="var(--tick)" strokeWidth="1" />
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth="6" />
        {p > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} filter="url(#gring)" />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && (
          <div className="row between" style={{ marginBottom: 16 }}>
            <div className="title" style={{ fontSize: 18 }}>{title}</div>
            <button className="btn btn-ghost btn-sq" onClick={onClose} aria-label="Close"><Icon name="x" size={20} glow={false} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Stepper({ value, onMinus, onPlus, sub }: { value: ReactNode; onMinus: () => void; onPlus: () => void; sub?: ReactNode }) {
  return (
    <div className="stepper">
      <button className="btn" onClick={onMinus} aria-label="Decrease"><Icon name="minus" size={20} /></button>
      <div className="stack" style={{ gap: 6, alignItems: 'center' }}>
        <div className="val">{value}</div>
        {sub && <div className="label">{sub}</div>}
      </div>
      <button className="btn" onClick={onPlus} aria-label="Increase"><Icon name="plus" size={20} /></button>
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button className={`toggle${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
}

/** × → "Delete?" two-step delete. */
export function DeleteX({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return armed ? (
    <button className="chip warn sm" onClick={onDelete}>Delete?</button>
  ) : (
    <button className="btn btn-ghost btn-sq" style={{ minHeight: 36, width: 36 }} onClick={() => setArmed(true)} aria-label="Delete">
      <Icon name="x" size={16} glow={false} />
    </button>
  )
}

export function Toasts() {
  const toasts = useToasts((s) => s.toasts)
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.kind === 'error' ? ' error' : ''}`}>
          <span>{t.msg}</span>
          {t.undo && (
            <button className="undo" onClick={() => { t.undo!(); dismiss(t.id) }}>UNDO</button>
          )}
        </div>
      ))}
    </div>
  )
}

export function Sparkline({ values, width = 220, height = 48 }: { values: (number | null)[]; width?: number; height?: number }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p) => p.v != null) as { v: number; i: number }[]
  if (pts.length < 1) return <div className="empty" style={{ padding: 8 }}>No data yet</div>
  const min = Math.min(...pts.map((p) => p.v)), max = Math.max(...pts.map((p) => p.v))
  const span = max - min || 1
  const x = (i: number) => 6 + (i / Math.max(1, values.length - 1)) * (width - 12)
  const y = (v: number) => height - 6 - ((v - min) / span) * (height - 12)
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="#fff" strokeWidth="1.5" filter="url(#gs)" vectorEffect="non-scaling-stroke" />
      {pts.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="2.2" fill="#fff" />)}
    </svg>
  )
}

export function useLongPress(cb: () => void, ms = 500) {
  const t = useRef<number | undefined>(undefined)
  const start = () => { t.current = window.setTimeout(cb, ms) }
  const stop = () => window.clearTimeout(t.current)
  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop, onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); cb() } }
}
