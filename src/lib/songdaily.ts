// One French song card a day. Cards loop in order (song by song, line by line); lines added later
// join the queue automatically because the next card is found by position after the last one shown.
import { SONGS, type Song, type SongCard } from '../data/songs'
import type { SongDaily } from './types'
import { localDate } from './time'

export interface QueuedCard { key: string; song: Song; card: SongCard }

export const cardKey = (song: Song, card: SongCard) => `${song.id}:${card.fr}`

export const queue = (songs: Song[] = SONGS): QueuedCard[] =>
  songs.flatMap((song) => song.cards.map((card) => ({ key: cardKey(song, card), song, card })))

/** The card after `lastKey` in the queue, wrapping to the start. */
export function nextCard(lastKey: string | null | undefined, songs: Song[] = SONGS): QueuedCard | null {
  const q = queue(songs)
  if (!q.length) return null
  const i = lastKey ? q.findIndex((c) => c.key === lastKey) : -1
  return q[(i + 1) % q.length]
}

export const findCard = (key: string, songs: Song[] = SONGS) => queue(songs).find((c) => c.key === key) ?? null

/** The app day (it starts at 4 am, see localDate). */
export const appDay = (now = Date.now()) => localDate(now)

/** Today's state: a fresh card on a new day, otherwise what's saved. */
export function today(saved: SongDaily | undefined, day = appDay(), songs: Song[] = SONGS): SongDaily | null {
  if (saved && saved.day === day && findCard(saved.key, songs)) return saved
  const n = nextCard(saved?.key, songs)
  return n ? { day, key: n.key, status: 'pending' } : null
}
