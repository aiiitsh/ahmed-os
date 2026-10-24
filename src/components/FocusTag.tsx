import { useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { categoriesOf } from '../lib/focustags'
import { isOpen, sortTasks } from '../lib/tasks'
import type { FocusTag } from '../lib/types'
import { Label } from './ui'

/** Pick a category, type what you're on, or pick an open task. All optional. */
export function TagPicker({ value, onChange }: { value: FocusTag; onChange: (t: FocusTag) => void }) {
  const settings = useStore((s) => s.appState?.settings)
  const cats = categoriesOf(settings)
  const tasks = sortTasks((settings?.tasks ?? []).filter(isOpen)).slice(0, 8)
  const linked = settings?.tasks?.find((t) => t.id === value.task)
  return (
    <div className="stack" style={{ gap: 12, width: '100%' }}>
      <div className="row wrap" style={{ gap: 8 }}>
        {cats.map((c) => (
          <button key={c} type="button" className={`chip${value.cat === c ? ' on' : ''}`}
            onClick={() => onChange({ ...value, cat: value.cat === c ? null : c })}>{c}</button>
        ))}
      </div>
      <input className="field" placeholder="What are you working on? (optional)" value={value.what ?? ''} enterKeyHint="done"
        onChange={(e) => onChange({ ...value, what: e.target.value, task: linked && e.target.value === linked.title ? value.task : null })} />
      {tasks.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">Or pick a task</span>
          <div className="row wrap" style={{ gap: 8 }}>
            {tasks.map((t) => (
              <button key={t.id} type="button" className={`chip sm${value.task === t.id ? ' on' : ' dashed'}`} style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                onClick={() => onChange(value.task === t.id ? { ...value, task: null, what: null } : { ...value, task: t.id, what: t.title })}>{t.title}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Sheet body: edit a label, then Save. */
export function TagEditor({ initial, onSave, onClose, children }: { initial: FocusTag; onSave: (t: FocusTag) => void; onClose: () => void; children?: ReactNode }) {
  const [tag, setTag] = useState<FocusTag>(initial)
  return (
    <div className="stack" style={{ gap: 14 }}>
      {children}
      <Label>Category · what</Label>
      <TagPicker value={tag} onChange={setTag} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn grow" onClick={() => { onSave({}); onClose() }}>Clear</button>
        <button className="btn btn-filled grow" onClick={() => { onSave(tag); onClose() }}>Save</button>
      </div>
    </div>
  )
}
