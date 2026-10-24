import { useEffect, useMemo, useState } from 'react'
import { useStore, set } from '../lib/store'
import { habitStats } from '../lib/stats'
import { addDays, fmtDay, localDate, weekStart } from '../lib/time'
import { deleteHabit, hashPin, saveHabit } from '../lib/actions'
import { Segmented } from '../components/QuickLog'
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
  const streakStart = useStore((s) => s.appState?.settings?.streak_start)
  const today = localDate()
  const st = useMemo(() => habitStats(habits, today, streakStart), [habits, today, streakStart])
  const byDate = useMemo(() => Object.fromEntries(habits.map((h) => [h.entry_date, h])), [habits])

  const [date, setDate] = useState(today)
  const [count, setCount] = useState(1)
  const [porn, setPorn] = useState<'no' | 'yes'>('no')
  const [reason, setReason] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadDate = (d: string) => {
    setDate(d)
    const e = byDate[d]
    setCount(e ? e.count : 1)
    setPorn(e?.porn ? 'yes' : 'no')
    setReason(e?.reason ?? '')
  }

  const save = () => {
    saveHabit(date, count, reason, porn === 'yes')
    setReason('')
    setCount(1)
    setPorn('no')
    setDate(today)
  }

  // Heat map: last 4 weeks, one row per week (Sat → Fri), this week at the bottom.
  const firstRow = addDays(weekStart(today), -7 * 3)
  const rows = Array.from({ length: 4 }, (_, r) => addDays(firstRow, r * 7))
  const lvl = (n: number) => (n <= 0 ? '' : n >= 4 ? 'h4' : `h${n}`)
  const cellCls = (e?: { count: number; porn?: boolean }) => (e ? `${lvl(e.count)}${e.porn && e.count > 0 ? ' p' : ''}` : '')
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
                  <div className="stack" style={{ gap: 3 }}><span className="big-num" style={{ fontSize: 20 }}>{st.cleanDays}<span className="muted" style={{ fontSize: 13 }}> / {st.days}</span></span><Label>Clean days · 4 wks</Label></div>
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
            {count > 0 && (
              <Segmented value={porn} options={[['no', 'No porn'], ['yes', 'Porn']]} onChange={setPorn} warn="yes" />
            )}
            <textarea className="field" placeholder="Reason or context (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <button className="btn btn-filled btn-big btn-caps" onClick={save}>{byDate[date] ? 'Update' : 'Save'}</button>
          </section>
        </div>

        <div className="col">
          <section className="panel stack" style={{ gap: 12 }}>
            <Label>Last 4 weeks</Label>
            <div className="heat heat-rows">
              {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((w) => <span key={w} className="label" style={{ fontSize: 9, textAlign: 'center', letterSpacing: '.08em' }}>{w}</span>)}
              {rows.flatMap((r) => Array.from({ length: 7 }, (_, i) => {
                const d = addDays(r, i)
                const e = byDate[d]
                const fut = d > today
                return (
                  <button key={d} className={`c ${cellCls(e)}${fut ? ' fut' : ''}${sel === d ? ' sel' : ''}${d === today ? ' now' : ''}`}
                    aria-label={`${d}: ${e?.count ?? 0}`} onClick={() => setSel(sel === d ? null : d)}><span>{Number(d.slice(8))}</span></button>
                )
              }))}
            </div>
            <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
              <span className="label" style={{ fontSize: 8 }}>0</span>
              <div className="heat" style={{ gridTemplateRows: '1fr', gridAutoColumns: '10px' }}>
                {['', 'h1', 'h2', 'h3', 'h4'].map((h) => <span key={h} className={`c ${h}`} />)}
              </div>
              <span className="label" style={{ fontSize: 8 }}>4+</span>
              <span className="heat" style={{ gridTemplateRows: '1fr', gridAutoColumns: '10px', marginLeft: 10 }}><span className="c h2 p" /></span>
              <span className="label" style={{ fontSize: 8 }}>porn</span>
            </div>
            {sel && (
              <div className="panel" style={{ padding: 14 }}>
                <div className="row between">
                  <span className="strong">{fmtDay(sel)}</span>
                  <span className="row" style={{ gap: 8 }}>
                    {selEntry?.porn && selEntry.count > 0 && <span className="chip sm red">porn</span>}
                    <span className="mono strong">{selEntry ? `${selEntry.count}×` : 'no entry'}</span>
                  </span>
                </div>
                {selEntry?.reason && <p className="muted small" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{selEntry.reason}</p>}
                <div className="row" style={{ gap: 8, marginTop: 10 }}>
                  <button className="btn grow" onClick={() => { loadDate(sel); document.querySelector('.screen.current')?.scrollTo({ top: 0, behavior: 'smooth' }) }}>{selEntry ? 'Edit' : 'Add'}</button>
                  {selEntry && <button className="btn grow" onClick={() => { deleteHabit(selEntry.id); setSel(null) }}>Delete</button>}
                </div>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><Label>Stats · last 4 weeks</Label><span className="label">older doesn't count</span></div>
            <div className="list">
              <div className="li"><span className="grow">Clean days</span><span className="mono strong">{st.cleanDays} of {st.days}</span></div>
              <div className="li"><span className="grow">Times</span><span className="mono strong">{st.times}</span></div>
              <div className="li"><span className="grow">Average per week</span><span className="mono strong">{st.avgPerWeek.toFixed(1)}</span></div>
              <div className="li"><span className="grow">Each week · oldest → now</span><span className="mono strong">{st.perWeek.join(' · ')}</span></div>
              {st.pornDays > 0 && <div className="li"><span className="grow">Days with porn</span><span className="mono strong red-text">{st.pornDays}</span></div>}
              {st.topWeekday != null && <div className="li"><span className="grow">Most common day</span><span className="mono strong">{WD[st.topWeekday]}</span></div>}
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
                      <span className={`mono strong${h.porn && h.count > 0 ? ' red-text' : ''}`} style={{ width: 30 }}>{h.count}×</span>
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
