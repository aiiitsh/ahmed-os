import { get } from './store'

/** Weight display respecting the Settings unit (storage is always kg). */
export function fmtW(kg: number | null | undefined, withUnit = true): string {
  if (kg == null) return 'BW'
  const units = get().appState?.settings?.units ?? 'kg'
  const v = units === 'lb' ? kg * 2.20462 : kg
  const s = Number.isInteger(Math.round(v * 10) / 10) ? String(Math.round(v)) : v.toFixed(1)
  return withUnit ? `${s} ${units.toUpperCase()}` : s
}
