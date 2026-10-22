// Rest between sets and exercises, plus the end-of-rest beep.
import { AFTER_SKILL_REST, TRANSITION_REST, type Exercise } from '../data/program'
import type { Feel } from './types'

/**
 * Rest after a set: the exercise's base rest, longer if it felt Hard last time,
 * shorter if Easy, and a little longer late in a long session.
 */
export function restAfterSet(e: Exercise, lastFeel: Feel | null, sessionMin: number): number {
  let r = e.rest ?? 60
  if (lastFeel === 'hard') r += 30
  else if (lastFeel === 'easy') r -= 15
  if (sessionMin > 45) r += 15
  return Math.max(30, Math.round(r / 5) * 5)
}

/** Rest before the next exercise. Hard sets earn a bit more. */
export function restBetween(prev: Exercise, feel: Feel | null | undefined): number {
  if (prev.kind === 'prep') return 0
  const base = prev.kind === 'skill' ? AFTER_SKILL_REST : TRANSITION_REST
  return feel === 'hard' ? base + 30 : base
}

// ---------- beep (iOS needs the audio context unlocked by a tap first) ----------

let ctx: AudioContext | null = null

export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!ctx && AC) ctx = new AC()
    if (ctx?.state === 'suspended') void ctx.resume()
  } catch { /* no audio */ }
}

export function beep(times = 3) {
  if (!ctx) return
  for (let i = 0; i < times; i++) {
    const t = ctx.currentTime + i * 0.28
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = i === times - 1 ? 1320 : 880
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + 0.22)
  }
}

// ---------- keep the screen on during a workout ----------

let lock: any = null
export async function keepAwake(on: boolean) {
  try {
    if (on && !lock && 'wakeLock' in navigator) lock = await (navigator as any).wakeLock.request('screen')
    if (!on && lock) { await lock.release(); lock = null }
  } catch { /* not supported */ }
}
