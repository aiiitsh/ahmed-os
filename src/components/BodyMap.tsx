import { useState } from 'react'
import { GROUP } from '../data/program'
import { levelFor, fmt1, type Level } from '../lib/stats'
import type { Group } from '../lib/types'

type Map = Group | 'rest' | 'forearm' | 'lower_back'
const HEAD = '52,4 68,4 72,14 70,25 64,31 56,31 50,25 48,14'

const FRONT: [string, Map, string][] = [
  ['neck', 'neck', '54,31 60,33 60,39 51,37'],
  ['traps_f', 'neck', '51,37 60,39 47,43 41,43'],
  ['delt', 'shoulders', '41,44 47,44 45,58 34,62 32,51'],
  ['pec', 'push', '48,45 60,42 60,60 50,62 45,57'],
  ['biceps', 'arms', '34,63 44,59 42,76 34,80 31,72'],
  ['forearm', 'forearm', '31,81 41,78 38,100 30,104 28,92'],
  ['hand', 'rest', '28,105 36,103 34,112 28,112'],
  ['abs1', 'core', '52,63 59.5,62 59.5,72 52,73'],
  ['abs2', 'core', '52,75 59.5,74 59.5,84 52,85'],
  ['abs3', 'core', '52,87 59.5,86 59.5,98 53,99'],
  ['oblique', 'core', '50,63 51,99 46,96 44,66'],
  ['hip', 'rest', '46,100 59.5,104 59.5,112 50,110'],
  ['quad', 'rest', '46,104 58,111 56,150 46,152 42,128'],
  ['knee', 'rest', '46,154 56,152 55,160 47,160'],
  ['shin', 'rest', '47,162 55,162 53,198 48,198'],
  ['foot', 'rest', '47,200 54,200 54,206 44,206'],
]

const BACK: [string, Map, string][] = [
  ['traps', 'neck', '52,33 60,35 60,58 45,46 41,43'],
  ['rear_delt', 'shoulders', '41,44 46,46 44,58 34,62 32,51'],
  ['lats', 'pull', '47,48 59.5,59 59.5,82 52,92 46,72'],
  ['triceps', 'arms', '34,63 44,59 42,76 34,80 31,72'],
  ['forearm', 'forearm', '31,81 41,78 38,100 30,104 28,92'],
  ['hand', 'rest', '28,105 36,103 34,112 28,112'],
  ['lower_back', 'lower_back', '53,93 59.5,85 59.5,100 53,100'],
  ['glute', 'posterior', '46,102 59.5,102 59.5,121 50,123 45,113'],
  ['hamstring', 'posterior', '45,125 58,123 56,154 47,154 43,137'],
  ['calf', 'rest', '47,158 55,158 56,176 53,196 48,196 46,176'],
  ['foot', 'rest', '47,200 54,200 54,206 44,206'],
]

const STYLE: Record<Level, React.SVGProps<SVGPolygonElement>> = {
  rest: { fill: '#0E0E10', stroke: '#2C2C30', strokeWidth: 0.6 },
  light: { fill: '#2E2E32', stroke: '#4A4A50', strokeWidth: 0.6 },
  solid: { fill: '#9C9CA2', filter: 'url(#gs)' },
  peak: { fill: '#FFFFFF', filter: 'url(#gh)' },
}

export function BodyMap({ groups }: { groups: Record<Group, number> }) {
  const [sel, setSel] = useState<Group | null>(null)
  const pct = (g: Group) => groups[g] / GROUP[g].hi
  const pctOf = (m: Map): number => {
    if (m === 'rest') return 0
    if (m === 'forearm') return pct('arms') / 2
    if (m === 'lower_back') return (pct('posterior') + pct('core')) / 2
    return pct(m)
  }
  const groupOf = (m: Map): Group | null => (m === 'rest' ? null : m === 'forearm' ? 'arms' : m === 'lower_back' ? 'posterior' : m)

  const figure = (parts: [string, Map, string][], x: number, label: string) => {
    const polys = parts.map(([k, m, pts]) => {
      const lv = levelFor(pctOf(m))
      const g = groupOf(m)
      return (
        <polygon key={k} points={pts} {...STYLE[lv]} style={{ cursor: g ? 'pointer' : 'default' }}
          onClick={() => g && setSel(g)} strokeLinejoin="round" />
      )
    })
    return (
      <g transform={`translate(${x} 2)`}>
        <polygon points={HEAD} fill="#0E0E10" stroke="#2C2C30" strokeWidth={0.6} />
        {polys}
        <g transform="matrix(-1 0 0 1 120 0)">{polys}</g>
        <text x="60" y="218" textAnchor="middle" fill="#8C8C8C" style={{ font: '500 7px var(--f-mono)', letterSpacing: '0.2em' }}>{label}</text>
      </g>
    )
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <svg viewBox="0 0 250 222" width="100%" style={{ maxWidth: 420, margin: '0 auto', display: 'block' }} role="img" aria-label="Muscle map">
        {figure(FRONT, 2, 'FRONT')}
        {figure(BACK, 128, 'BACK')}
      </svg>
      <div className="row between wrap" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 10 }}>
          {(['rest', 'light', 'solid', 'peak'] as Level[]).map((l) => (
            <span key={l} className="row" style={{ gap: 5 }}>
              <svg width="10" height="10"><rect width="10" height="10" rx="2" fill={STYLE[l].fill as string} stroke={(STYLE[l].stroke as string) ?? 'none'} /></svg>
              <span className="label" style={{ fontSize: 9 }}>{l}</span>
            </span>
          ))}
        </div>
        {sel && (
          <span className="chip on">{GROUP[sel].label} · {fmt1(groups[sel])} sets · target {GROUP[sel].lo}–{GROUP[sel].hi}</span>
        )}
      </div>
    </div>
  )
}
