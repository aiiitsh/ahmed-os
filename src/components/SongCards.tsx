import { useRef, useState } from 'react'
import type { Song } from '../data/songs'
import { Label } from './ui'

/** Swipeable flashcards for one song: tap to flip, swipe left / right for next / previous. */
export function SongCards({ song }: { song: Song }) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [dx, setDx] = useState(0)
  const drag = useRef<{ x: number; id: number; moved: boolean } | null>(null)
  const n = song.cards.length
  const card = song.cards[i]

  const go = (d: number) => {
    const next = i + d
    if (next < 0 || next >= n) return
    setI(next)
    setFlipped(false)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, id: e.pointerId, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const x = e.clientX - d.x
    if (!d.moved && Math.abs(x) > 8) {
      d.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (d.moved) setDx(x)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || d.id !== e.pointerId) return
    const x = e.clientX - d.x
    setDx(0)
    if (!d.moved) setFlipped((f) => !f)
    else if (x < -60) go(1)
    else if (x > 60) go(-1)
  }
  const onPointerCancel = () => { drag.current = null; setDx(0) }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="flash-deck" data-noswipe>
        <button key={i} className={`flash${flipped ? ' flipped' : ''}${dx ? ' dragging' : ''}`}
          style={dx ? { transform: `translateX(${dx}px) rotate(${dx / 30}deg)` } : undefined}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }}
          aria-label={flipped ? `${card.fr}: ${card.en}` : `${card.fr}. Tap to see the meaning`}>
          <div className="flash-face front">
            <Label>Français</Label>
            <div className="flash-fr">{card.fr}</div>
            <span className="label dim">Tap to flip</span>
          </div>
          <div className="flash-face back">
            <Label>English</Label>
            <div className="flash-en">{card.en}</div>
            {card.note && <p className="small muted" style={{ lineHeight: 1.5 }}>{card.note}</p>}
            <span className="mono dim small">{card.fr}</span>
          </div>
          <div className="flash-src mono">♪ {song.title} · {song.artist}</div>
        </button>
      </div>
      <div className="row between">
        <button className="btn btn-sq" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous card">←</button>
        <div className="dots">
          {song.cards.map((_, k) => <i key={k} className={k < i ? 'done' : k === i ? 'cur' : ''} />)}
        </div>
        <button className="btn btn-sq" onClick={() => go(1)} disabled={i === n - 1} aria-label="Next card">→</button>
      </div>
      <div className="label" style={{ textAlign: 'center' }}>{i + 1} / {n}</div>
    </div>
  )
}
