// To-do list. A task can have a deadline (or not). Tasks due today or tomorrow show up in
// Today's plan so they get finished a day early; "Move to tomorrow" hides one until tomorrow.
import type { Task } from './types'
import { addDays, daysBetween, dowShort, fmtDay, localDate } from './time'

export const isOpen = (t: Task) => !t.done_at

/** Open tasks first by deadline (soonest first), then undated ones, newest last. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due) || a.created_at.localeCompare(b.created_at)
    if (a.due) return -1
    if (b.due) return 1
    return a.created_at.localeCompare(b.created_at)
  })
}

/** Tasks to finish today: due today or tomorrow (or late), unless moved to a later day. */
export function tasksForToday(tasks: Task[], today = localDate()): Task[] {
  const tomorrow = addDays(today, 1)
  return sortTasks(tasks.filter((t) => isOpen(t) && t.due && t.due <= tomorrow && (!t.plan_on || t.plan_on <= today)))
}

/** Dated tasks ticked off today (shown as done in Today's plan). */
export function doneToday(tasks: Task[], today = localDate()): Task[] {
  return tasks.filter((t) => t.done_at && t.due && localDate(t.done_at) === today)
}

export function dueLabel(due: string, today = localDate()): string {
  const d = daysBetween(today, due)
  if (d < 0) return `${-d} day${d === -1 ? '' : 's'} late`
  if (d === 0) return 'due today'
  if (d === 1) return 'due tomorrow'
  if (d < 7) return `due ${dowShort(due)}`
  return `due ${fmtDay(due)}`
}

/** Late or due today: worth a warning colour. */
export const isUrgent = (t: Task, today = localDate()) => !!t.due && !t.done_at && t.due <= today

/** Tasks finished in [from, to] (local dates). */
export const doneBetween = (tasks: Task[], from: string, to: string) =>
  tasks.filter((t) => t.done_at && localDate(t.done_at) >= from && localDate(t.done_at) <= to)
