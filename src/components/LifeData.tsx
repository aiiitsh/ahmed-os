import { useState } from 'react'
import { newId, useStore } from '../lib/store'
import { saveLifePlan } from '../lib/actions'
import { parsePlan } from '../lib/life'
import { toast } from '../lib/toast'
import { Label, Sheet } from './ui'

/** Settings → Life plan: back up the plan as JSON or replace it. Kept off the Life page itself. */
export function LifeData() {
  const plan = useStore((s) => s.appState?.settings?.life_plan)
  const [open, setOpen] = useState(false)
  const copy = async () => {
    if (!plan) return
    const { updated_at: _, ...rest } = plan
    try {
      await navigator.clipboard.writeText(JSON.stringify(rest, null, 2))
      toast('Plan copied as JSON')
    } catch {
      toast('Clipboard blocked', undefined, 'error')
    }
  }
  return (
    <section className="panel stack" style={{ gap: 12 }}>
      <Label>Life plan</Label>
      <p className="small muted">{plan ? `${plan.steps.length} steps · saved to your account only, never to the code.` : 'No plan yet.'}</p>
      <div className="row" style={{ gap: 8 }}>
        {plan && <button className="btn grow" onClick={copy}>Copy as JSON</button>}
        <button className="btn grow" onClick={() => setOpen(true)}>{plan ? 'Replace' : 'Paste plan'}</button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={plan ? 'Replace plan' : 'Paste plan'}>
        <ImportPlan onDone={() => setOpen(false)} />
      </Sheet>
    </section>
  )
}

function ImportPlan({ onDone }: { onDone: () => void }) {
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const go = () => {
    try {
      saveLifePlan(parsePlan(raw, newId), 'Plan saved')
      onDone()
    } catch (e: any) {
      setErr(e.message)
    }
  }
  return (
    <div className="stack" style={{ gap: 12 }}>
      <textarea className="field mono" style={{ minHeight: 180, fontSize: 13 }} placeholder='{ "steps": [ … ] }'
        value={raw} onChange={(e) => { setRaw(e.target.value); setErr(null) }} />
      {err && <span className="chip sm warn">{err}</span>}
      <button className="btn btn-filled" disabled={!raw.trim()} onClick={go}>Save plan</button>
    </div>
  )
}
