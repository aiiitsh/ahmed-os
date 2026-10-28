import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { focusStats } from '../lib/stats'
import { addDays, dowShort, fmtClock, fmtDur, fmtStopwatch, hhmm, localDate, localMinutes, minutesBetween, typedSpan, weekDays, weekStart, dayTimeIso } from '../lib/time'
import { addFocusBlock, deleteBlock, editBlockTimes, focusBreak, focusResume, focusStop, setFocusStart, setFocusTag, startFocus, tagBlock, toggleTask } from '../lib/actions'
import { GOALS } from '../data/program'
import { Bar, Label, Sheet, useNow } from '../components/ui'
import { Icon } from '../components/Icon'
import { Stat } from './Learn'
import type { FocusBlock, FocusTag } from '../lib/types'
import { byCategory, byWhat, tagLabel, tagOf } from '../lib/focustags'
import { TagEditor, TagPicker } from '../components/FocusTag'
import { TasksPanel } from '../components/Tasks'

export function Work() {
  const focus = useStore((s) => s.appState?.focus)
  const blocks = useStore((s) => s.focus)
  const now = useNow(1000)
  const today = localDate(now)

  const todays = blocks.filter((b) => b.local_date === today)
  const st = focusStats(todays)
  const start = weekStart(today)
  const week = useMemo(() => focusStats(blocks.filter((b) => b.local_date >= start)), [blocks, start])
  const lastWeek = useMemo(() => focusStats(blocks.filter((b) => b.local_date >= addDays(start, -7) && b.local_date < start)), [blocks, start])
  const running = focus ? now - new Date(focus.started_at).getTime() : 0
  const [tag, setTag] = useState<FocusTag>({})
  const [editing, setEditing] = useState(false)
  const start_ = () => { startFocus(tag); setTag({}) }

  return (
    <div className="page">
      <div className="hero-light" />
      <header className="page-head">
        <h1 className="hero-word" style={{ fontSize: 34 }}>WORK</h1>
        <Label>Focus · {fmtDur(week.total)} this week</Label>
      </header>

      <section className="panel deep stack" style={{ gap: 20, padding: 26, alignItems: 'center' }}>
        {!focus ? (
          <>
            <Label>Real, deep focus · phone away</Label>
            <div className="timer dim" style={{ textShadow: 'none', color: 'var(--dim)' }}>00:00</div>
            <TagPicker value={tag} onChange={setTag} />
            <button className="btn btn-big btn-filled btn-caps btn-block" style={{ minHeight: 72 }} onClick={start_}><Icon name="focus" size={22} glow={false} /> Start focus</button>
          </>
        ) : focus.mode === 'focus' ? (
          <>
            <Label>Deep focus</Label>
            <RunningTag onEdit={() => setEditing(true)} />
            <div className="timer pulse-text" style={{ fontSize: 'clamp(48px, 16vw, 84px)' }}>{fmtStopwatch(running)}</div>
            {running > 3 * 3600000 ? (
              <div className="stack" style={{ gap: 8, alignItems: 'center' }}>
                <span className="small">Still going, or did you forget to stop? Save only:</span>
                <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
                  {[60, 90, 120, 180].map((m) => <button key={m} className="chip" onClick={() => focusStop(m)}>{fmtDur(m)}</button>)}
                  <button className="chip on" onClick={() => focusStop()}>It was real · stop now</button>
                </div>
              </div>
            ) : (
              <div className="grid3" style={{ width: '100%' }}>
                <button className="btn btn-big" onClick={() => focusBreak('break')}>Break</button>
                <button className="btn btn-big" onClick={() => focusBreak('lost_focus')}>Lost focus</button>
                <button className="btn btn-big btn-filled" onClick={() => focusStop()}>Stop</button>
              </div>
            )}
          </>
        ) : (
          <>
            <Label>Break</Label>
            <RunningTag onEdit={() => setEditing(true)} />
            <div className="timer sm" style={{ fontSize: 'clamp(40px, 12vw, 60px)' }}>{fmtStopwatch(running)}</div>
            <div className="grid2" style={{ width: '100%' }}>
              <button className="btn btn-big btn-filled btn-caps" onClick={focusResume}>Back to it</button>
              <button className="btn btn-big" onClick={() => focusStop()}>Stop</button>
            </div>
          </>
        )}
        <Sheet open={editing && !!focus} onClose={() => setEditing(false)} title="What is this block?">
          {focus && <RunningEditor key={focus.started_at} onClose={() => setEditing(false)} />}
        </Sheet>
      </section>

      <TasksPanel />

      <div className="cols c2">
        <section className="panel stack" style={{ gap: 16 }}>
          <Label>Today</Label>
          <div className="grid3">
            <Stat v={fmtDur(st.total)} k="Total focus" />
            <Stat v={st.blocks} k="Blocks" />
            <Stat v={fmtDur(st.longest)} k="Longest" />
            <Stat v={fmtDur(st.average)} k="Average" />
            <Stat v={fmtDur(st.rest)} k="Rest" />
            <Stat v={st.ratio == null ? '—' : `${st.ratio.toFixed(1)}:1`} k="Focus:rest" />
          </div>
          <div className="row between"><Label>Lost focus</Label><span className="mono strong">{st.lost}×</span></div>
          <Timeline blocks={todays} focus={focus ?? null} now={now} />
          <BlockList blocks={todays} />
          <AddBlock today={today} />
        </section>

        <section className="panel stack" style={{ gap: 16 }}>
          <div className="row between"><Label>This week</Label><span className="mono small strong">{(week.total / 60).toFixed(1)} / {GOALS.focusHours} H</span></div>
          <Bar value={week.total / 60} max={GOALS.focusHours} />
          <WeekChart blocks={blocks} start={start} />
          <div className="row between">
            <Label>Longest block vs last week</Label>
            <span className={`chip sm${week.longest >= lastWeek.longest ? ' on' : ' warn'}`}>
              {Math.round(week.longest)}M {week.longest >= lastWeek.longest ? '↑' : '↓'} {Math.round(lastWeek.longest)}M
            </span>
          </div>
        </section>
      </div>

      <TimeSplit blocks={blocks} today={today} />
    </div>
  )
}

/** Label of the running block, tap to change; "Task done" when it's linked to an open task. */
function RunningTag({ onEdit }: { onEdit: () => void }) {
  const focus = useStore((s) => s.appState?.focus)
  const task = useStore((s) => s.appState?.settings?.tasks?.find((t) => t.id === focus?.task))
  if (!focus) return null
  const label = tagLabel(focus)
  return (
    <div className="row wrap" style={{ gap: 8, justifyContent: 'center' }}>
      <button className={`chip${label ? ' on' : ' dashed'}`} style={{ maxWidth: '100%', overflowWrap: 'anywhere' }} onClick={onEdit}>
        {label || 'Add what you’re working on'}
      </button>
      <button className="chip sm dashed" onClick={onEdit}>Started {hhmm(focus.started_at)} · fix</button>
      {task && !task.done_at && <button className="chip dashed" onClick={() => toggleTask(task.id)}><Icon name="circlecheck" size={14} glow={false} /> Task done</button>}
    </div>
  )
}

/** Today's focus blocks with their labels; tap one to label it afterwards. */
function BlockList({ blocks }: { blocks: FocusBlock[] }) {
  const settings = useStore((s) => s.appState?.settings)
  const [edit, setEdit] = useState<FocusBlock | null>(null)
  const focusBlocks = blocks.filter((b) => b.block_type === 'focus').sort((a, b) => a.started_at.localeCompare(b.started_at))
  if (!focusBlocks.length) return null
  return (
    <>
      <div className="list">
        {focusBlocks.map((b) => {
          const label = tagLabel(tagOf(settings, b.id))
          return (
            <button key={b.id} className="li" style={{ gap: 10, width: '100%', textAlign: 'left', background: 'none', color: 'inherit', font: 'inherit' }} onClick={() => setEdit(b)}>
              <span className="mono small" style={{ flex: 'none' }}>{fmtClock(localMinutes(b.started_at))}</span>
              <span className={`grow${label ? '' : ' dim'}`} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label || 'Tap to label'}</span>
              <span className="mono small strong" style={{ flex: 'none' }}>{fmtDur(minutesBetween(b.started_at, b.ended_at))}</span>
            </button>
          )
        })}
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Fix this block">
        {edit && <BlockEditor key={edit.id} block={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </>
  )
}

/** Check typed times: both filled, not in the future, not absurdly long. */
function checkSpan(d: string, from: string, to: string) {
  if (!from || !to) return { err: 'Type both times.' }
  const span = typedSpan(d, from, to)
  const mins = minutesBetween(span.started_at, span.ended_at)
  if (new Date(span.ended_at).getTime() > Date.now() + 60000) return { span, mins, err: 'That ends later than now.' }
  if (mins > 16 * 60) return { span, mins, err: 'Longer than 16 hours. Check the times.' }
  return { span, mins, err: null }
}

function TimeRange({ from, to, onFrom, onTo, mins, err }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; mins?: number; err: string | null }) {
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="grid2">
        <label className="stack" style={{ gap: 6 }}><span className="label">Start</span>
          <input className="field" type="time" value={from} onChange={(e) => onFrom(e.target.value)} /></label>
        <label className="stack" style={{ gap: 6 }}><span className="label">End</span>
          <input className="field" type="time" value={to} onChange={(e) => onTo(e.target.value)} /></label>
      </div>
      <span className={`small${err ? ' strong' : ' muted'}`}>
        {err ?? (!from || !to ? 'Type when you started and stopped.' : `${fmtDur(mins ?? 0)} focus${to <= from ? ' · runs past midnight' : ''}`)}
      </span>
    </div>
  )
}

/** A finished block: type the real start and end, change its label, or delete it. */
function BlockEditor({ block, onClose }: { block: FocusBlock; onClose: () => void }) {
  const settings = useStore((s) => s.appState?.settings)
  const init = { from: hhmm(block.started_at), to: hhmm(block.ended_at) }
  const [from, setFrom] = useState(init.from)
  const [to, setTo] = useState(init.to)
  const { span, mins, err } = checkSpan(block.local_date, from, to)
  const save = (t: FocusTag) => {
    tagBlock(block.id, t)
    // Untouched times keep their seconds.
    if (span) editBlockTimes(block.id, from === init.from ? block.started_at : span.started_at, to === init.to && from === init.from ? block.ended_at : span.ended_at)
  }
  return (
    <TagEditor initial={tagOf(settings, block.id)} canSave={!err} onSave={save} onClose={onClose}>
      <TimeRange from={from} to={to} onFrom={setFrom} onTo={setTo} mins={mins} err={err} />
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => { deleteBlock(block.id); onClose() }}>Delete this block</button>
    </TagEditor>
  )
}

/** The running timer: change its label or when it really started. */
function RunningEditor({ onClose }: { onClose: () => void }) {
  const focus = useStore((s) => s.appState?.focus)
  const [from, setFrom] = useState(focus ? hhmm(focus.started_at) : '')
  if (!focus) return null
  const iso = from ? dayTimeIso(localDate(focus.started_at), from) : ''
  const err = !iso ? 'Type a time.' : new Date(iso).getTime() > Date.now() ? 'That’s later than now.' : null
  const save = (t: FocusTag) => {
    setFocusTag(t)
    if (from !== hhmm(focus.started_at)) setFocusStart(iso)
  }
  return (
    <TagEditor initial={focus} canSave={!err} onSave={save} onClose={onClose}>
      <label className="stack" style={{ gap: 6 }}>
        <span className="label">{focus.mode === 'focus' ? 'Focus' : 'Break'} started at</span>
        <input className="field" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
      </label>
      {err && <span className="small strong">{err}</span>}
    </TagEditor>
  )
}

/** Focus you forgot to time: pick the day, type start and end. */
function AddBlock({ today }: { today: string }) {
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState(today)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tag, setTag] = useState<FocusTag>({})
  const { span, mins, err } = checkSpan(day, from, to)
  const show = () => { setDay(today); setFrom(''); setTo(''); setTag({}); setOpen(true) }
  const add = () => {
    if (!span || err) return
    addFocusBlock(span.started_at, span.ended_at, tag)
    setOpen(false)
  }
  return (
    <>
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={show}><Icon name="plus" size={16} glow={false} /> Add time you didn’t track</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add focus time">
        <div className="stack" style={{ gap: 14 }}>
          <label className="stack" style={{ gap: 6 }}><span className="label">Day</span>
            <input className="field" type="date" max={today} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></label>
          <TimeRange from={from} to={to} onFrom={setFrom} onTo={setTo} mins={mins} err={from || to ? err : null} />
          <Label>Category · what</Label>
          <TagPicker value={tag} onChange={setTag} />
          <button className="btn btn-filled btn-big" disabled={!!err} onClick={add}>Add block</button>
        </div>
      </Sheet>
    </>
  )
}

/** Where focus time goes: per category and per thing, this week or the last 4 weeks. */
function TimeSplit({ blocks, today }: { blocks: FocusBlock[]; today: string }) {
  const settings = useStore((s) => s.appState?.settings)
  const [range, setRange] = useState<'week' | 'month'>('week')
  const from = range === 'week' ? weekStart(today) : addDays(weekStart(today), -21)
  const inRange = blocks.filter((b) => b.local_date >= from && b.local_date <= today)
  const cats = byCategory(inRange, settings)
  const things = byWhat(inRange, settings).slice(0, 6)
  const total = cats.reduce((a, c) => a + c.min, 0)
  return (
    <section className="panel stack" style={{ gap: 16 }}>
      <div className="row between">
        <Label>Where your time goes</Label>
        <div className="row" style={{ gap: 6 }}>
          <button className={`chip sm${range === 'week' ? ' on' : ''}`} onClick={() => setRange('week')}>This week</button>
          <button className={`chip sm${range === 'month' ? ' on' : ''}`} onClick={() => setRange('month')}>4 weeks</button>
        </div>
      </div>
      {!total ? <div className="empty">No focus yet. Pick a category when you start the timer.</div> : (
        <div className="stack" style={{ gap: 12 }}>
          {cats.map((c) => (
            <div key={c.name} className="stack" style={{ gap: 6 }}>
              <div className="row between">
                <span className={c.name === 'No category' ? 'dim' : 'strong'}>{c.name}</span>
                <span className="mono small">{fmtDur(c.min)} · {Math.round((c.min / total) * 100)}%</span>
              </div>
              <Bar value={c.min} max={total} thin />
            </div>
          ))}
        </div>
      )}
      {things.length > 0 && (
        <>
          <Label>Most time on</Label>
          <div className="list">
            {things.map((t) => (
              <div key={t.name} className="li" style={{ gap: 10 }}>
                <span className="grow" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{t.name}</span>
                <span className="mono small" style={{ flex: 'none' }}>{fmtDur(t.min)} · {t.blocks}×</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function Timeline({ blocks, focus, now }: { blocks: FocusBlock[]; focus: { mode: string; started_at: string } | null; now: number }) {
  const all = [...blocks.map((b) => ({ type: b.block_type, s: b.started_at, e: b.ended_at }))]
  if (focus && localDate(focus.started_at) === localDate(now)) all.push({ type: focus.mode as 'focus' | 'break', s: focus.started_at, e: new Date(now).toISOString() })
  if (!all.length) return <div className="empty">No focus blocks yet today.</div>
  const t0 = Math.min(...all.map((b) => new Date(b.s).getTime()))
  const t1 = Math.max(now, ...all.map((b) => new Date(b.e).getTime()))
  const span = Math.max(1, t1 - t0)
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div style={{ position: 'relative', height: 22, background: 'var(--track)', borderRadius: 4, overflow: 'hidden' }}>
        {all.map((b, i) => {
          const l = ((new Date(b.s).getTime() - t0) / span) * 100
          const w = Math.max(0.6, (minutesBetween(b.s, b.e) * 60000 / span) * 100)
          return (
            <i key={i} style={{
              position: 'absolute', top: b.type === 'focus' ? 0 : 7, bottom: b.type === 'focus' ? 0 : 7, left: `${l}%`, width: `${w}%`,
              background: b.type === 'focus' ? '#fff' : '#5c5c5c', boxShadow: b.type === 'focus' ? '0 0 8px rgba(255,255,255,.8)' : 'none', borderRadius: 2,
            }} />
          )
        })}
      </div>
      <div className="row between"><span className="label">{fmtClock(localMinutes(t0))}</span><span className="label">NOW {fmtClock(localMinutes(now))}</span></div>
    </div>
  )
}

export function WeekChart({ blocks, start }: { blocks: FocusBlock[]; start: string }) {
  const days = weekDays(start)
  const data = days.map((d) => {
    const s = focusStats(blocks.filter((b) => b.local_date === d))
    return { d, h: s.total / 60, longest: s.longest / 60 }
  })
  const max = Math.max(4, ...data.map((x) => x.h))
  const H = 110, W = 280, bw = 24
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} width="100%" role="img" aria-label="Focus hours per day">
      {data.map((x, i) => {
        const cx = 20 + i * ((W - 40) / 6)
        const h = (x.h / max) * H
        const p = x.h / (GOALS.focusHours / 5)
        const fill = p >= 0.8 ? '#fff' : p >= 0.34 ? '#9c9ca2' : '#4a4a50'
        return (
          <g key={x.d}>
            <rect x={cx - bw / 2} y={0} width={bw} height={H} rx={2} fill="#161616" />
            {h > 0 && <rect x={cx - bw / 2} y={H - h} width={bw} height={h} rx={2} fill={fill} filter={p >= 0.8 ? 'url(#gs)' : undefined} />}
            {x.longest > 0 && <circle cx={cx} cy={H - (x.longest / max) * H} r={3.2} fill="#000" stroke="#fff" strokeWidth={1.4} />}
            <text x={cx} y={H + 13} textAnchor="middle" fill="#8c8c8c" style={{ font: '500 8px var(--f-mono)', letterSpacing: '.1em' }}>{dowShort(x.d)}</text>
          </g>
        )
      })}
    </svg>
  )
}
