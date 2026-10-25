// Life plan photos. Stored as private `logs` rows (type 'photo', data {life, step, img}) so they sit
// behind login and RLS like everything else, never in the public repo. Loaded only when Life opens.
import { create } from 'zustand'
import { supabase } from './supabase'
import { demoMode } from './demo'
import { write } from './queue'
import { get as getStore, newId, uid } from './store'
import { localDate, nowIso } from './time'
import { toast } from './toast'

export interface LifePhoto { id: string; step: string; img: string; at: string }

/** Step id for the photos under the reminder line at the top. */
export const REMINDER = 'reminder'

export const useLifePhotos = create<{ photos: LifePhoto[]; loaded: boolean }>(() => ({ photos: [], loaded: false }))

let loading = false
export async function loadLifePhotos(force = false) {
  if (loading || (useLifePhotos.getState().loaded && !force)) return
  if (demoMode || !getStore().userId) { useLifePhotos.setState({ loaded: true }); return }
  loading = true
  try {
    const { data, error } = await supabase.from('logs').select('id,logged_at,data').eq('type', 'photo').order('logged_at').range(0, 499)
    if (error) throw error
    const photos = (data ?? []).filter((r: any) => r.data?.life && r.data?.img)
      .map((r: any) => ({ id: r.id, step: r.data.step, img: r.data.img, at: r.logged_at }))
    useLifePhotos.setState({ photos, loaded: true })
  } catch (e: any) {
    console.warn('life photos:', e?.message)
  } finally {
    loading = false
  }
}

/** Shrink to at most `max` px on the long side, as JPEG. */
async function compress(file: Blob, max = 900): Promise<string> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  return c.toDataURL('image/jpeg', 0.74)
}

export async function addLifePhotos(step: string, files: Blob[]) {
  const added: LifePhoto[] = []
  for (const f of files) {
    try {
      const img = await compress(f)
      const at = nowIso()
      const p: LifePhoto = { id: newId(), step, img, at }
      added.push(p)
      void write({ kind: 'upsert', table: 'logs', values: { id: p.id, user_id: uid(), logged_at: at, local_date: localDate(at), type: 'photo', data: { life: true, step, img } } })
    } catch {
      toast('Could not read that photo', undefined, 'error')
    }
  }
  if (added.length) {
    useLifePhotos.setState((s) => ({ photos: [...s.photos, ...added] }))
    toast(added.length === 1 ? 'Photo added' : `${added.length} photos added`)
  }
}

export function removeLifePhoto(id: string) {
  const prev = useLifePhotos.getState().photos
  const p = prev.find((x) => x.id === id)
  useLifePhotos.setState({ photos: prev.filter((x) => x.id !== id) })
  void write({ kind: 'delete', table: 'logs', match: { id } })
  toast('Photo removed', p ? () => {
    useLifePhotos.setState((s) => ({ photos: [...s.photos, p] }))
    void write({ kind: 'upsert', table: 'logs', values: { id: p.id, user_id: uid(), logged_at: p.at, local_date: localDate(p.at), type: 'photo', data: { life: true, step: p.step, img: p.img } } })
  } : undefined)
}
