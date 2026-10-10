import { useEffect, useMemo, useState } from 'react'
import { useStore, set } from '../lib/store'
import { habitStats } from '../lib/stats'
import { addDays, fmtDay, localDate, monShort, weekStart } from '../lib/time'
import { deleteHabit, hashPin, saveHabit } from '../lib/actions'
import { Label, Stepper } from '../components/ui'
import { Icon } from '../components/Icon'

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function Streak() {
  const pin = useStore((s) => s.appState?.streak_pin_hash)
  const unlocked = useStore((s) => s.streakUnlocked)
  if (pin && !unlocked) return <PinLock hash={pin} />
  return <StreakBody />
}

function PinLock({ hash }: { hash: string }) {
  const [digits, setDigits] = useState('')
  const [bad, setBad] = useState(false)
  useEffect(() => {
    if (digits.length < 4) return
    hashPin(digits).then((h) => {
      if (h === hash) set({ streakUnlocked: true })
      else { setBad(true); setDigits('') }
    })
  }, [digits, hash])
  const press = (d: string) => { setBad(false); setDigits((x) => (x + d).slice(0, 4)) }
  return (
    <div className="page" style={{ maxWidth: 360, alignItems: 'center', paddingTop: '8vh' }}>
      <Icon name="lock" size={36} />
      <Label>{bad ? 'Wrong PIN' : 'Enter PIN'}</Label>
      <div className="row" style={{ gap: 14, margin: '8px 0 12px' }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid #fff', background: i < digits.length ? '#fff' : 'transparent', boxShadow: i < digits.length ? '0 0 8px #fff' : 'none' }} />
        ))}
      </div>
      <div className="grid3" style={{ width: '100%', gap: 10 }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k === '' ? <span key={i} /> : (
            <button key={i} className="btn btn-big" style={{ fontSize: 22, fontFamily: 'var(--f-display)' }}
              onClick={() => (k === '⌫' ? setDigits((x) => x.slice(0, -1)) : press(k))}>{k}</button>
          ))}
      </div>
    </div>
  )
}

function StreakBody() {
  const habits = useStore((s) => s.habits)
  const today = localDate()
  const st = useMemo(() => habitStats(habits, today), [habits, today])
  const byDate = useMemo(() => Object.fromEntries(habits.map((h) => [h.entry_date, h])), [habits])

  const [date, setDate] = useState(today)
  const [count, setCount] = useState(1)
  const [reason, setReason] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadDate = (d: string) => {
    setDate(d)
    const e = byDate[d]
    setCount(e ? e.count : 1)
    setReason(e?.reason ?? '')
  }

  const save = () => {
    saveHabit(date, count, reason)
    setReason('')
    setCount(1)
    setDate(today)
  }

  // Heat map: 26 week columns, rows Sat → Fri, last column = this week.
  const firstCol = addDays(weekStart(today), -7 * 25)
  const cols = Array.from({ length: 26 }, (_, c) => addDays(firstCol, c * 7))
  const lvl = (n: number) => (n <= 0 ? '' : n >= 4 ? 'h4' : `h${n}`)
  const selEntry = sel ? byDate[sel] : null
  const recent = [...habits].sort((a, b) => b.entry_date.localeCompare(a.entry_date)).slice(0, 30)

  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <h1 className="hero-word" style={{ fontSize: 34 }}>STREAK</h1>
      </header>

      <div className="cols c2">
        <div className="col">
          <section className="panel deep stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10, padding: 28 }}>
            {!st.hasAny ? (
              <>
                <div className="hero-word" style={{ fontSize: 64 }}>0</div>
                <p className="muted">Your streak starts today.</p>
              </>
            ) : (
              <>
                <div className="hero-word" style={{ fontSize: 76 }}>{st.current}</div>
                <Label>{st.current === 1 ? 'day' : 'days'}</Label>
                <div className="row" style={{ gap: 26, marginTop: 8 }}>
                  <div className="stack" style={{ gap: 3 }}><span className="big-num" style={{ fontSize: 20 }}>{st.best}</span><Label>Best streak</Label></div>
                  <div className="stack" style={{ gap: 3 }}><span className="big-num" style={{ fontSize: 20 }}>{st.monthTimes} / {st.monthDays}</span><Label>Month · times / days</Label></div>
                </div>
              </>
            )}
          </section>

          <section className="panel stack" style={{ gap: 14 }}>
            <Label>Log</Label>
            <input className="field" type="date" value={date} max={today} onChange={(e) => e.target.value && loadDate(e.target.value)} />
            <div className="row" style={{ justifyContent: 'center' }}>
              <Stepper value={count} sub="how many times" onMinus={() => setCount((c) => Math.max(0, c - 1))} onPlus={() => setCount((c) => c + 1)} />
            </div>
            <textarea className="field" placeholder="Reason or context (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="btn btn-filled btn-big btn-caps" onClick={save}>{byDate[date] ? 'Update' : 'Save'}</button>
          </section>
        </div>

        <div className="col">
          <section className="panel stack" style={{ gap: 12 }}>
            <Label>Last 26 weeks</Label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(26, 1fr)', gap: 3 }}>
              {cols.map((c, i) => {
                const prev = i > 0 ? cols[i - 1] : null
                const show = !prev || c.slice(5, 7) !== prev.slice(5, 7)
                return <span key={c} className="label" style={{ fontSize: 7, letterSpacing: '.05em', overflow: 'visible', whiteSpace: 'nowrap' }}>{show ? monShort(c) : ''}</span>
              })}
            </div>
            <div className="heat" style={{ gridTemplateColumns: 'repeat(26, 1fr)' }}>
              {cols.flatMap((c) => Array.from({ length: 7 }, (_, r) => {
                const d = addDays(c, r)
                const e = byDate[d]
                const fut = d > today
                return (
                  <button key={d} className={`c ${e ? lvl(e.count) : ''}${fut ? ' fut' : ''}${sel === d ? ' sel' : ''}`}
                    aria-label={`${d}: ${e?.count ?? 0}`} onClick={() => setSel(sel === d ? null : d)} />
                )
              }))}
            </div>
            <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
              <span className="label" style={{ fontSize: 8 }}>0</span>
              <div className="heat" style={{ gridTemplateRows: '1fr', gridAutoColumns: '10px' }}>
                {['', 'h1', 'h2', 'h3', 'h4'].map((h) => <span key={h} className={`c ${h}`} />)}
              </div>
              <span className="label" style={{ fontSize: 8 }}>4+</span>
            </div>
            {sel && (
              <div className="panel" style={{ padding: 14 }}>
                <div className="row between">
                  <span className="strong">{fmtDay(sel)}</span>
                  <span className="mono strong">{selEntry ? `${selEntry.count}×` : 'no entry'}</span>
                </div>
                {selEntry?.reason && <p className="muted small" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selEntry.reason}</p>}
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn grow" onClick={() => { loadDate(sel); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>{selEntry ? 'Edit' : 'Add'}</button>
                  {selEntry && <button className="btn grow" onClick={() => { deleteHabit(selEntry.id); setSel(null) }}>Delete</button>}
                </div>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><Label>Stats</Label></div>
            <div className="list">
              <div className="li"><span className="grow">Average per week (8 wks)</span><span className="mono strong">{st.avgPerWeek.toFixed(1)}</span></div>
              <div className="li"><span className="grow">Most common weekday</span><span className="mono strong">{st.topWeekday == null ? '—' : WD[st.topWeekday]}</span></div>
              <div className="li"><span className="grow">Last 7 days vs previous 7</span><span className="mono strong">{st.last7} vs {st.prev7}</span></div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head"><Label>Entries</Label><span className="label">last 30</span></div>
            {recent.length === 0 ? <div className="empty">No entries yet.</div> : (
              <div className="list">
                {recent.map((h) => (
                  <button key={h.id} className="li" style={{ width: '100%', textAlign: 'left', alignItems: 'flex-start', flexDirection: 'column', gap: 6 }}
                    onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
                    <div className="row" style={{ width: '100%' }}>
                      <span className="mono small" style={{ width: 92 }}>{fmtDay(h.entry_date)}</span>
                      <span className="mono strong" style={{ width: 30 }}>{h.count}×</span>
                      <span className="grow muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.reason?.split('\n')[0] ?? ''}
                      </span>
                    </div>
                    {expanded === h.id && h.reason && <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>{h.reason}</p>}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
