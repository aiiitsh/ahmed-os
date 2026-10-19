/** Weight display. All weights are stored and shown in pounds. */
export function fmtW(lb: number | null | undefined, withUnit = true): string {
  if (lb == null) return 'BW'
  const s = Number.isInteger(lb) ? String(lb) : lb.toFixed(1).replace(/\.0$/, '')
  return withUnit ? `${s} LB` : s
}

/** kg → lb on real gym steps (5 lb from 20 up, 2.5 lb below). Used for rows saved before the switch to pounds. */
export function kgToLb(kg: number): number {
  const lb = kg * 2.20462
  return lb >= 20 ? Math.round(lb / 5) * 5 : Math.round(lb / 2.5) * 2.5
}
