import { fmtDur } from './time'
import { CARDIO, STRETCH_LABEL, type Sport } from '../data/program'
import type { Log } from './types'

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ') : s)

export function describeLog(l: Log): { icon: string; text: string } {
  const d = l.data
  switch (l.type) {
    case 'cardio': {
      if (d.sport === 'swim' && d.meters) {
        return { icon: 'swim', text: `Swim · ${d.meters} m · ${d.minutes} min` }
      }
      if (d.sport === 'swim' && d.intensity) {
        return { icon: 'swim', text: `Swim · ${d.minutes} min · ${d.intensity}${d.rest_s != null ? ` · rest ${d.rest_s} s` : ''}` }
      }
      if (d.sport === 'hike') {
        return { icon: 'hike', text: `Hike · ${d.km} km${d.minutes ? ` · ${fmtDur(Number(d.minutes))}` : ''}` }
      }
      const c = CARDIO[d.sport as Sport]
      const v = c?.variants.find((x) => x[0] === d.variant)?.[1] ?? cap(d.variant)
      return { icon: c?.icon ?? 'run', text: `${c?.label ?? cap(d.sport)} · ${v} · ${d.minutes} min` }
    }
    case 'stretch':
      return { icon: d.which === 'daily_routine' ? 'hollow' : d.which === 'hip_flexors' ? 'hipflexor' : d.which === 'chest' ? 'cheststretch' : 'stretch', text: `Stretch · ${STRETCH_LABEL[d.which] ?? cap(d.which)}${d.in_session ? ' (session)' : ''}` }
    case 'flag':
      return { icon: 'back', text: 'Lower back felt tight' }
    case 'protein':
      return { icon: 'protein', text: d.g ? `Protein · +${d.g} g${d.what ? ` · ${d.what}` : ''}` : 'Protein hit' }
    case 'quran':
      return { icon: 'quran', text: `Quran · Juz ${d.juz} · ${d.mode === 'memorize' ? 'memorized' : 'revised'}` }
    case 'french':
      return d.activity === 'finished_unit'
        ? { icon: 'french', text: `French · Finished unit ${d.unit}` }
        : { icon: 'french', text: `French · ${cap(d.activity)} · ${d.minutes} min` }
    case 'bodyweight':
      return { icon: 'scale', text: `Bodyweight · ${Number(d.kg).toFixed(1)} kg` }
    default:
      return { icon: 'check', text: cap(l.type) }
  }
}
