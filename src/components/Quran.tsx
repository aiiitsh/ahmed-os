import { useMemo, useState } from 'react'
import { SURAHS } from '../data/surahs'
import { QURAN_KIND_LABEL, deleteQuranEvent, quranEvent, type QuranKind } from '../lib/actions'
import { useStore } from '../lib/store'
import { fmtDay } from '../lib/time'
import type { QuranEvent } from '../lib/types'
import { DeleteX, Label } from './ui'
import { Segmented } from './QuickLog'

export interface SurahStatus {
  learned: string | null
  memorized: string | null
  revisions: number
  last: QuranEvent | null
}

export function surahStatus(events: QuranEvent[], n: number): SurahStatus {
  const ev = events.filter((e) => e.surah === n).sort((a, b) => a.at.localeCompare(b.at))
  return {
    learned: ev.find((e) => e.kind === 'learned')?.local_date ?? null,
    memorized: ev.filter((e) => e.kind === 'memorized').at(-1)?.local_date ?? null,
    revisions: ev.filter((e) => e.kind === 'revised').length,
    last: ev.at(-1) ?? null,
  }
}

function StatusChip({ st }: { st: SurahStatus }) {
  if (st.memorized) return <span className="chip on sm">memorized</span>
  if (st.learned) return <span className="chip sm">learned</span>
  if (st.revisions) return <span className="chip sm">revised</span>
  return null
}

/** Search + list of all 114 surahs. */
export function SurahPicker({ onPick }: { onPick: (n: number) => void }) {
  const events = useStore((s) => s.quran)
  const [q, setQ] = useState('')
  const recent = useMemo(() => {
    const seen: number[] = []
    for (const e of [...events].sort((a, b) => b.at.localeCompare(a.at))) if (!seen.includes(e.surah)) seen.push(e.surah)
    return seen.slice(0, 6)
  }, [events])
  const needle = q.trim().toLowerCase()
  const rows = SURAHS.map(([ar, latin, ayat], i) => ({ n: i + 1, ar, latin, ayat }))
    .filter((r) => !needle || String(r.n) === needle || r.latin.toLowerCase().includes(needle) || r.ar.includes(q.trim()))
  return (
    <div className="stack" style={{ gap: 12 }}>
      {recent.length > 0 && !needle && (
        <div className="stack" style={{ gap: 8 }}>
          <Label>Recent</Label>
          <div className="row wrap" style={{ gap: 8 }}>
            {recent.map((n) => (
              <button key={n} className="chip on" onClick={() => onPick(n)}>
                <span className="ar">{SURAHS[n - 1][0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <input className="field" placeholder="Search: number, name or الاسم" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list">
        {rows.map((r) => {
          const st = surahStatus(events, r.n)
          return (
            <button key={r.n} className="li" style={{ width: '100%', textAlign: 'left' }} onClick={() => onPick(r.n)}>
              <span className="mono small muted" style={{ width: 26 }}>{r.n}</span>
              <span className="stack grow" style={{ gap: 2 }}>
                <span className="small">{r.latin}</span>
                <span className="mono dim" style={{ fontSize: 10 }}>{r.ayat} ayat{st.last ? ` · last ${fmtDay(st.last.local_date)}` : ''}</span>
              </span>
              <StatusChip st={st} />
              <span className="ar strong" style={{ fontSize: 19, minWidth: 70, textAlign: 'right' }}>{r.ar}</span>
            </button>
          )
        })}
        {!rows.length && <div className="empty">No surah matches “{q}”.</div>}
      </div>
    </div>
  )
}

/** One surah: mark learned / memorized / revised, and see its history. */
export function SurahDetail({ n, onBack }: { n: number; onBack?: () => void }) {
  const events = useStore((s) => s.quran)
  const [daysAgo, setDaysAgo] = useState<'0' | '1'>('0')
  const [ar, latin, ayat] = SURAHS[n - 1]
  const st = surahStatus(events, n)
  const history = events.filter((e) => e.surah === n).sort((a, b) => b.at.localeCompare(a.at))
  const add = (k: QuranKind) => quranEvent(n, k, Number(daysAgo))
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row between">
        {onBack ? <button className="link" onClick={onBack}>← All surahs</button> : <span />}
        <span className="mono small muted">#{n} · {ayat} ayat</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="ar hero-ar">{ar}</div>
        <div className="muted">{latin}</div>
      </div>
      <Segmented value={daysAgo} options={[['0', 'Today'], ['1', 'Yesterday']]} onChange={setDaysAgo} />
      <div className="grid3">
        <button className="btn btn-big" onClick={() => add('learned')}>Learned<br /><span className="label">first time</span></button>
        <button className="btn btn-big btn-filled" onClick={() => add('memorized')}>Memorized</button>
        <button className="btn btn-big" onClick={() => add('revised')}>Revised</button>
      </div>
      <div className="panel" style={{ padding: 14 }}>
        <Label>Summary</Label>
        <p className="small" style={{ marginTop: 8, lineHeight: 1.6 }}>
          {st.learned ? `Learned ${fmtDay(st.learned)}` : 'Not learned yet'}
          {st.memorized ? ` · memorized ${fmtDay(st.memorized)}` : ''}
          {st.revisions ? ` · revised ${st.revisions}×` : ''}
        </p>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <Label>History</Label>
        {history.length === 0 ? <div className="empty">Nothing yet.</div> : (
          <div className="list">
            {history.map((e) => (
              <div key={e.id} className="li">
                <span className="mono small" style={{ width: 96 }}>{fmtDay(e.local_date)}</span>
                <span className="grow small">{QURAN_KIND_LABEL[e.kind]}</span>
                <DeleteX onDelete={() => deleteQuranEvent(e.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Picker that drills into a surah (used in the Home sheet and the Learn tab). */
export function QuranBrowser() {
  const [n, setN] = useState<number | null>(null)
  return n == null ? <SurahPicker onPick={setN} /> : <SurahDetail n={n} onBack={() => setN(null)} />
}
