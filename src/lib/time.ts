// Every "day" is the local date in America/Toronto. Weeks run Monday → Sunday.
export const TZ = 'America/Toronto'

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

/** 'YYYY-MM-DD' in Toronto for a timestamp. */
export function localDate(at: Date | string | number = new Date()): string {
  return dateFmt.format(new Date(at))
}

/** Minutes since local midnight (0..1439) in Toronto. */
export function localMinutes(at: Date | string | number = new Date()): number {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(at)).map((x) => [x.type, x.value]))
  return Number(p.hour) * 60 + Number(p.minute)
}

/** 'HH:MM' 24-hour, Toronto. */
export function hhmm(at: Date | string | number): string {
  return fmtClock(localMinutes(at))
}

export function fmtClock(mins: number): string {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

const toUTC = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))

export function addDays(d: string, n: number): string {
  return new Date(toUTC(d) + n * 86400000).toISOString().slice(0, 10)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000)
}

/** 0 = Sunday … 6 = Saturday */
export function dow(d: string): number {
  return new Date(toUTC(d)).getUTCDay()
}

/** The Monday that starts the week containing d. */
export function weekStart(d: string = localDate()): string {
  return addDays(d, -((dow(d) + 6) % 7))
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function inWeek(d: string, start: string): boolean {
  const n = daysBetween(start, d)
  return n >= 0 && n < 7
}

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export const dowShort = (d: string) => DOW[dow(d)]
export const monShort = (d: string) => MON[+d.slice(5, 7) - 1]

/** 'MON 26 OCT' */
export function fmtDay(d: string): string {
  return `${dowShort(d)} ${+d.slice(8, 10)} ${monShort(d)}`
}

/** '7H 15M' */
export function fmtDur(mins: number): string {
  const m = Math.max(0, Math.round(mins))
  const h = Math.floor(m / 60)
  return h ? `${h}H ${String(m % 60).padStart(2, '0')}M` : `${m}M`
}

/** '1:02:03' / '02:03' stopwatch */
export function fmtStopwatch(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export const minutesBetween = (a: string | number | Date, b: string | number | Date) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 60000

export const nowIso = () => new Date().toISOString()
