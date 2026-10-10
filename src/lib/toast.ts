import { create } from 'zustand'

export interface Toast { id: number; msg: string; undo?: () => void; kind?: 'error' }

export const useToasts = create<{ toasts: Toast[] }>(() => ({ toasts: [] }))

let seq = 0
export function toast(msg: string, undo?: () => void, kind?: 'error') {
  const id = ++seq
  useToasts.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id, msg, undo, kind }] }))
  setTimeout(() => dismiss(id), undo ? 6000 : 3000)
}

export function dismiss(id: number) {
  useToasts.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}
