import { useState } from 'react'
import { useStore } from '../lib/store'
import { addTask, deleteTask, moveTaskToTomorrow, toggleTask, updateTask } from '../lib/actions'
import { PRIORITIES, doneBetween, doneToday, dueLabel, isOpen, isUrgent, sortTasks, tasksForToday } from '../lib/tasks'
import { addDays, localDate, weekStart } from '../lib/time'
import type { Priority, Task } from '../lib/types'
import { Icon } from './Icon'
import { DeleteX, Label, Sheet } from './ui'

const useTasks = () => useStore((s) => s.appState?.settings?.tasks) ?? []

/** Deadline picker: no date, today, tomorrow, or any day. */
function DuePicker({ value, onChange }: { value: string | null; onChange: (d: string | null) => void }) {
  const today = localDate()
  const tomorrow = addDays(today, 1)
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      <button type="button" className={`chip${value == null ? ' on' : ''}`} onClick={() => onChange(null)}>No date</button>
      <button type="button" className={`chip${value === today ? ' on' : ''}`} onClick={() => onChange(today)}>Today</button>
      <button type="button" className={`chip${value === tomorrow ? ' on' : ''}`} onClick={() => onChange(tomorrow)}>Tomorrow</button>
      <input className="field" type="date" min={today} value={value ?? ''} aria-label="Deadline"
        style={{ minHeight: 36, padding: '0 10px', width: 'auto', flex: '1 1 140px' }}
        onChange={(e) => onChange(e.target.value || null)} />
    </div>
  )
}

function PriorityPicker({ value, onChange }: { value: Priority | null; onChange: (p: Priority | null) => void }) {
  return (
    <div className="row wrap" style={{ gap: 8 }}>
      {PRIORITIES.map(({ p, label }) => (
        <button key={p} type="button" className={`chip${value === p ? ' on' : ''}`} onClick={() => onChange(value === p ? null : p)}>
          <span className={`prio p${p}`}>P{p}</span> {label}
        </button>
      ))}
    </div>
  )
}

function PrioBadge({ t }: { t: Task }) {
  return t.priority ? <span className={`prio p${t.priority}`} aria-label={`Priority ${t.priority}`}>P{t.priority}</span> : null
}

function Check({ t }: { t: Task }) {
  return (
    <button className="btn btn-ghost btn-sq" style={{ minHeight: 40, width: 40, flex: 'none' }} onClick={() => toggleTask(t.id)}
      aria-label={t.done_at ? 'Mark not done' : 'Mark done'}>
      <Icon name={t.done_at ? 'circlecheck' : 'circle'} size={22} glow={!t.done_at} />
    </button>
  )
}

function DueChip({ t }: { t: Task }) {
  if (!t.due) return null
  return <span className={`chip sm${isUrgent(t) ? ' warn' : ''}`} style={{ flex: 'none' }}>{dueLabel(t.due)}</span>
}

/** Full list (Work tab): add, tick off, edit, delete. */
export function TasksPanel() {
  const tasks = useTasks()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<string | null>(null)
  const [prio, setPrio] = useState<Priority | null>(null)
  const [edit, setEdit] = useState<Task | null>(null)
  const [showDone, setShowDone] = useState(false)
  const today = localDate()
  const open = sortTasks(tasks.filter(isOpen))
  const late = open.filter((t) => t.due && t.due < today).length
  const doneWeek = doneBetween(tasks, weekStart(today), today).length
  const done = [...tasks.filter((t) => t.done_at)].sort((a, b) => b.done_at!.localeCompare(a.done_at!))

  const add = () => {
    if (!title.trim()) return
    addTask(title, due, prio)
    setTitle('')
    setDue(null)
    setPrio(null)
  }

  return (
    <section className="panel stack" style={{ gap: 14 }}>
      <div className="row between">
        <Label>Tasks</Label>
        <span className="label">{open.length} open · {doneWeek} done this week{late ? ` · ${late} late` : ''}</span>
      </div>
      <form className="stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); add() }}>
        <div className="row" style={{ gap: 8 }}>
          <input className="field grow" placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} enterKeyHint="done" />
          <button className="btn btn-filled btn-sq" type="submit" aria-label="Add task" disabled={!title.trim()}><Icon name="plus" size={20} glow={false} /></button>
        </div>
        {title.trim() && <><DuePicker value={due} onChange={setDue} /><PriorityPicker value={prio} onChange={setPrio} /></>}
      </form>

      {open.length === 0 ? <div className="empty">No open tasks.</div> : groups(open).map((g) => (
        <div key={g.key} className="stack" style={{ gap: 2 }}>
          {g.label && <div className="label" style={{ marginTop: 6 }}>{g.label} · {g.tasks.length}</div>}
          <div className="list">
            {g.tasks.map((t) => (
              <div key={t.id} className="li" style={{ gap: 8 }}>
                <Check t={t} />
                <button className="grow row" style={{ gap: 8, textAlign: 'left', background: 'none', border: 0, color: 'inherit', padding: 0, font: 'inherit', minWidth: 0 }} onClick={() => setEdit(t)}>
                  <PrioBadge t={t} />
                  <span style={{ overflowWrap: 'anywhere', minWidth: 0 }}>{t.title}</span>
                </button>
                <DueChip t={t} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'Hide done' : `Show done (${done.length})`}
        </button>
      )}
      {showDone && (
        <div className="list">
          {done.slice(0, 30).map((t) => (
            <div key={t.id} className="li" style={{ gap: 8, opacity: 0.55 }}>
              <Check t={t} />
              <span className="grow" style={{ textDecoration: 'line-through', overflowWrap: 'anywhere' }}>{t.title}</span>
              <DeleteX onDelete={() => deleteTask(t.id)} />
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Edit task">
        {edit && <TaskEditor t={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </section>
  )
}

/** Open tasks under P1 / P2 / P3 / no priority headings (no headings when nothing has a priority). */
function groups(open: Task[]) {
  if (!open.some((t) => t.priority)) return [{ key: 'all', label: '', tasks: open }]
  return [...PRIORITIES.map(({ p, label }) => ({ key: `p${p}`, label: `P${p} · ${label}`, tasks: open.filter((t) => t.priority === p) })),
    { key: 'none', label: 'No priority', tasks: open.filter((t) => !t.priority) }].filter((g) => g.tasks.length)
}

function TaskEditor({ t, onClose }: { t: Task; onClose: () => void }) {
  const [title, setTitle] = useState(t.title)
  const [due, setDue] = useState<string | null>(t.due ?? null)
  const [prio, setPrio] = useState<Priority | null>(t.priority ?? null)
  const save = () => {
    if (title.trim()) updateTask(t.id, { title: title.trim(), due, priority: prio, plan_on: due === t.due ? t.plan_on : null })
    onClose()
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Label>Deadline</Label>
      <DuePicker value={due} onChange={setDue} />
      <Label>Priority</Label>
      <PriorityPicker value={prio} onChange={setPrio} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn grow" onClick={() => { deleteTask(t.id); onClose() }}>Delete</button>
        <button className="btn btn-filled grow" onClick={save}>Save</button>
      </div>
    </div>
  )
}

/** Today's plan: tasks due today or tomorrow, to finish today. */
export function TodayTasks() {
  const tasks = useTasks()
  const list = [...tasksForToday(tasks), ...doneToday(tasks)]
  if (!list.length) return null
  return (
    <>
      <div className="label" style={{ margin: '14px 0 4px' }}>Tasks · finish today</div>
      <div className="list">
        {list.map((t) => (
          <div key={t.id} className="li" style={{ gap: 8, alignItems: 'flex-start', opacity: t.done_at ? 0.55 : 1 }}>
            <Check t={t} />
            <span className="stack grow" style={{ gap: 6, paddingTop: 8, minWidth: 0 }}>
              <span className={t.done_at ? '' : 'strong'} style={{ textDecoration: t.done_at ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>{t.title}</span>
              {!t.done_at && (
                <span className="row wrap" style={{ gap: 8 }}>
                  <PrioBadge t={t} />
                  <DueChip t={t} />
                  <button className="chip sm dashed" onClick={() => moveTaskToTomorrow(t.id)}>Move to tomorrow</button>
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

/** Count for the Today's plan header. */
export function useTodayTaskCount() {
  const tasks = useTasks()
  return { open: tasksForToday(tasks).length, done: doneToday(tasks).length }
}
