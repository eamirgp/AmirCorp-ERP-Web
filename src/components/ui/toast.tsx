import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useSyncExternalStore } from 'react'

type Toast = { id: number; tone: 'ok' | 'bad'; text: string }

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function push(tone: Toast['tone'], text: string) {
  const id = nextId++
  toasts = [...toasts, { id, tone, text }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 3200)
}

/** Avisos breves: toast.ok('Producto creado'), toast.error('No se pudo guardar'). */
export const toast = {
  ok: (text: string) => push('ok', text),
  error: (text: string) => push('bad', text),
}

export function Toaster() {
  const items = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts,
  )

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2" role="status" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-sm animate-[pop-in_160ms_ease-out] items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] font-medium shadow-float"
        >
          {t.tone === 'ok' ? <CheckCircle2 className="size-4 text-ok" /> : <CircleAlert className="size-4 text-bad" />}
          {t.text}
        </div>
      ))}
    </div>
  )
}
