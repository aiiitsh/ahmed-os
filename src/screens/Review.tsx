import { useEffect, useMemo, useState } from 'react'
import { useStore, putRows, uid } from '../lib/store'
import { addDays, fmtDay, fmtDur, weekStart } from '../lib/time'
import { fmt1 } from '../lib/stats'
import { buildJson, buildMonthText, buildWeek } from '../lib/export'
import { toast } from '../lib/toast'
import { GROUPS, GOALS } from '../data/program'
import type { WeeklyReview } from '../lib/types'
import { Bar, Label } from '../components/ui'
import { Icon } from '../components/Icon'
import { WeekChart } from './Work'
import { Stat } from './Learn'

export function Review() {
  const data = useStore()
  const [which, setWhich] = useState<'this' | 'last'>('this')
  const start = which === 'this' ? weekStart() : addDays(weekStart(), -7)
  const { w, ins, coach, changes } = useMemo(() => buildWeek(data, start), [data, start])
  const prevNotes = data.reviews.find((r) => r.week_start === addDays(start, -7))?.claude_notes
  const thisReview = data.reviews.find((r) => r.week_start === start)

  const saveReview = (notes?: string | null) => {
    const row: WeeklyReview = {
      user_id: uid(), week_start: start, summary: buildJson(data, start),
      claude_notes: notes !== undefined ? notes : thisReview?.claude_notes ?? null,
      created_at: thisReview?.created_at ?? new Date().toISOString(),
    }
    putRows('reviews', [row], 'user_id,week_start')
  }

  const copy = async () => {
    const text = buildMonthText(data)
    try {
      await navigator.clipboard.writeText(text)
      toast('Month summary copied · paste it to Claude')
    } catch {
      download(`ahmed-os-month-${weekStart()}.txt`, text, 'text/plain')
      toast('Clipboard blocked · saved as a file instead')
    }
    saveReview()
  }

  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <div className="stack" style={{ gap: 6 }}>
          <Label>{fmtDay(w.start)} → {fmtDay(w.end)}</Label>
          <h1 className="hero-word" style={{ fontSize: 34 }}>REVIEW</h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip${which === 'this' ? ' on' : ''}`} onClick={() => setWhich('this')}>This week</button>
          <button className={`chip${which === 'last' ? ' on' : ''}`} onClick={() => setWhich('last')}>Last week</button>
        </div>
      </header>

      {prevNotes && (
        <section className="panel deep stack" style={{ gap: 10 }}>
          <Label>Claude's notes · from last week</Label>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{prevNotes}</p>
        </section>
      )}

      <div className="cols c2">
        <section className="panel">
          <div className="panel-head"><Label>Insights</Label></div>
          <div className="stack" style={{ gap: 8 }}>
            {ins.map((i, k) => (
              <div key={k} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                <span className={`chip sm${i.bad ? ' warn' : ' on'}`} style={{ marginTop: 1 }}>{i.bad ? '!' : '✓'}</span>
                <span className="small" style={{ lineHeight: 1.5 }}>{i.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel stack" style={{ gap: 12 }}>
          <Label>Export for Claude</Label>
          <button className="btn btn-filled btn-big" onClick={copy}><Icon name="copy" size={20} /> Copy month summary</button>
          <span className="small muted" style={{ textAlign: 'center' }}>Always the last 4 weeks + this week so far, whichever week is picked above. Paste it to Claude to plan next week.</span>
          <Notes key={start} initial={thisReview?.claude_notes ?? ''} onSave={(n) => { saveReview(n || null); toast("Claude's notes saved") }} />
        </section>
      </div>

      <div className="cols c2">
        <section className="panel stack" style={{ gap: 14 }}>
          <Label>Body</Label>
          <div className="grid3">
            <Stat v={w.workouts.length} k={`Sessions · A${w.byDayCode.A} B${w.byDayCode.B} C${w.byDayCode.C}`} />
            <Stat v={w.cardio.length} k="Cardio" />
            <Stat v={`${w.routineDays}/7`} k="Core routine" />
            <Stat v={w.swims.length} k="Swims" />
            <Stat v={w.hikes.length ? `${w.hikes.reduce((a, l) => a + (Number(l.data.km) || 0), 0)} KM` : '0'} k="Hiked" />
            <Stat v={`${Math.round(w.hardPct * 100)}%`} k="Hard sets" />
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {GROUPS.map((g) => (
              <div key={g.key} className="stack" style={{ gap: 4 }}>
                <div className="row between"><span className="small">{g.label}</span><span className="mono small strong">{fmt1(w.groups[g.key])}/{g.hi}</span></div>
                <Bar value={w.groups[g.key]} max={g.hi} thin />
              </div>
            ))}
          </div>
          {changes.length > 0 && (
            <div className="list">
              {changes.map((c) => (
                <div key={c.key} className="li"><span className="grow">{c.name}</span><span className="mono small muted">{c.from} → {c.to}</span>
                  {c.dir > 0 && <Icon name="up" size={14} />}{c.dir < 0 && <Icon name="down" size={14} />}</div>
              ))}
            </div>
          )}
        </section>

        <div className="col">
          <section className="panel stack" style={{ gap: 12 }}>
            <div className="row between"><Label>Focus</Label><span className="mono small strong">{fmtDur(w.fo.total)} / {GOALS.focusHours}H</span></div>
            <WeekChart blocks={data.focus} start={start} />
            <div className="grid3">
              <Stat v={w.fo.blocks} k="Blocks" />
              <Stat v={`${Math.round(w.fo.longest)}M`} k="Longest" />
              <Stat v={w.fo.lost} k="Lost focus" />
            </div>
            <Label>How to focus more</Label>
            <div className="stack" style={{ gap: 8 }}>
              {coach.map((c, k) => (
                <div key={k} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                  <span className={`chip sm${c.bad ? ' warn' : ' on'}`} style={{ marginTop: 1 }}>{c.bad ? '!' : '→'}</span>
                  <span className="small" style={{ lineHeight: 1.5 }}>{c.text}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel stack" style={{ gap: 12 }}>
            <Label>Learn · no targets</Label>
            <div className="grid3">
              <Stat v={w.quranDays} k="Quran days" />
              <Stat v={w.quran.length} k="Surah entries" />
              <Stat v={`${w.frenchMin}M`} k="French" />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Notes({ initial, onSave }: { initial: string; onSave: (n: string) => void }) {
  const [v, setV] = useState(initial)
  useEffect(() => setV(initial), [initial])
  return (
    <div className="stack" style={{ gap: 8, marginTop: 6 }}>
      <Label>Claude's reply · pinned at the top of Review next week</Label>
      <textarea className="field" placeholder="Paste Claude's feedback here" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn btn-outline" disabled={v === initial} onClick={() => onSave(v)}>Save notes</button>
    </div>
  )
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
