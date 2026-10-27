import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { patchSettings } from '../lib/actions'
import { findCard, today } from '../lib/songdaily'
import type { SongDaily } from '../lib/types'
import { CardLesson } from './SongCards'
import { Sheet } from './ui'

/** Shown on app open until "Read" is tapped that day. Reopens when the app comes back after a minute away. */
export function DailySong() {
  const saved = useStore((s) => s.appState?.settings?.song_daily)
  const busy = useStore((s) => !!s.appState?.active_session)
  const [open, setOpen] = useState(false)
  const t = today(saved)
  const entry = t && findCard(t.key)

  // Save a new day's card as soon as it's picked, so every device shows the same one.
  useEffect(() => {
    if (t && (t.day !== saved?.day || t.key !== saved?.key)) patchSettings({ song_daily: t })
  }, [t?.day, t?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const show = () => {
      const cur = today(useStore.getState().appState?.settings?.song_daily)
      if (cur && cur.status !== 'read') setOpen(true)
    }
    show()
    let hiddenAt = 0
    const vis = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 60000) show()
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [])

  if (!t || !entry || busy) return null
  const answer = (status: SongDaily['status']) => {
    patchSettings({ song_daily: { ...t, status } })
    setOpen(false)
  }
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Line of the day">
      <div className="stack" style={{ gap: 14 }}>
        <CardLesson song={entry.song} card={entry.card} />
        <div className="grid2">
          <button className="btn btn-big" onClick={() => answer('again')}>Again</button>
          <button className="btn btn-big btn-filled" onClick={() => answer('read')}>Read</button>
        </div>
        <p className="small muted" style={{ textAlign: 'center' }}>Again shows it each time you open the app today. Read hides it until tomorrow.</p>
      </div>
    </Sheet>
  )
}
