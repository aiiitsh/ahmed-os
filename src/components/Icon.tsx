// Line icons: 24×24, round caps/joins. Exercises use Lucide (clean, consistent set);
// the rest are drawn here in the same weight.
import type { LucideIcon } from 'lucide-react'
import {
  ArrowBigUpDash, ArrowUpFromLine, BicepsFlexed, Bug, ChevronsUp, CornerLeftUp, DoorOpen, Dumbbell,
  Expand, Footprints, Hammer, Hand, MoveHorizontal, PersonStanding, Timer, UserRound,
} from 'lucide-react'

const LUCIDE: Record<string, LucideIcon> = {
  muscleup: ArrowBigUpDash,
  planche: Hand,
  curl: BicepsFlexed,
  ohtriceps: Dumbbell,
  lateral: Expand,
  hammer: Hammer,
  reardelt: MoveHorizontal,
  kneeraise: ChevronsUp,
  sideplank: Timer,
  neck: UserRound,
  legcurl: Footprints,
  hipthrust: ArrowUpFromLine,
  backext: CornerLeftUp,
  deadbug: Bug,
  cheststretch: DoorOpen,
  hipflexor: PersonStanding,
}

const P: Record<string, string> = {
  swim: '<circle cx="17" cy="7" r="2"/><path d="M3 12l5-3 4 2 4-2"/><path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/>',
  run: '<circle cx="14" cy="4" r="2"/><path d="M7 21l3-6 3 2v4M6 11l3-3h5l3 4M10 15l3-7"/>',
  squash: '<ellipse cx="9" cy="9" rx="5" ry="6" transform="rotate(-40 9 9)"/><path d="M12.5 13.5L20 21"/><circle cx="19" cy="5" r="1.5"/>',
  stretch: '<circle cx="12" cy="4" r="2"/><path d="M12 6v6l-5 4v5M12 12l6 3 2 6M12 8l-4 2"/>',
  quran: '<path d="M3 6c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 7v13"/>',
  french: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  protein: '<path d="M8 3h8l-1 4H9z"/><path d="M9 7l-1 14h8l-1-14"/>',
  bed: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  wake: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  // ui
  'tab-home': '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  'tab-body': '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
  'tab-review': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  'tab-streak': '<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-2 1-3 1.5-4 .5 1.5 1.5 2 2.5 2 0-2.5-.5-4.5 0-6.5z"/>',
  back: '<path d="M12 3v18"/><path d="M9 6h6M8.5 10h7M8 14h8M8.5 18h7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  swap: '<path d="M4 8h15l-3-3M20 16H5l3 3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  scale: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9a6 6 0 0 1 8 0l-3 3"/>',
  dumbbell: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
}

const ALIAS: Record<string, string> = { 'tab-learn': 'quran', 'tab-work': 'focus' }

export function Icon({ name, size = 24, className, glow = true, strokeWidth = 1.5 }: {
  name: string; size?: number; className?: string; glow?: boolean; strokeWidth?: number
}) {
  const cls = `icon${glow ? ' icon-glow' : ''}${className ? ' ' + className : ''}`
  const L = LUCIDE[name]
  if (L) return <L className={cls} size={size} strokeWidth={Math.max(strokeWidth, 1.6)} aria-hidden="true" />
  const body = P[ALIAS[name] ?? name] ?? P.dumbbell
  return (
    <svg
      className={cls}
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  )
}
