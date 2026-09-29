import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useSyncExternalStore } from 'react'

type Toast = { id: number; tone: 'ok' | 'bad'; text: string }

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const dismiss = (id: number) => {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

// Los avisos de éxito se van solos; los de error se quedan hasta que el usuario los cierra, para que no se pierdan.
const OK_DURATION = 5000

function push(tone: Toast['tone'], text: string) {
  const id = nextId++
  toasts = [...toasts, { id, tone, text }]
  emit()
  if (tone === 'ok') setTimeout(() => dismiss(id), OK_DURATION)
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

  const box = 'pointer-events-auto flex max-w-sm animate-[pop-in_160ms_ease-out] items-start gap-2.5 rounded-xl border bg-surface px-4 py-3 text-base font-medium shadow-float'

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2">
      {/* Éxitos: se anuncian sin interrumpir. */}
      <div role="status" aria-live="polite" className="flex flex-col items-end gap-2">
        {items
          .filter((t) => t.tone === 'ok')
          .map((t) => (
            <div key={t.id} className={`${box} border-line`}>
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" />
              {t.text}
            </div>
          ))}
      </div>
      {/* Errores: se anuncian de inmediato y se cierran a mano. */}
      <div role="alert" aria-live="assertive" className="flex flex-col items-end gap-2">
        {items
          .filter((t) => t.tone === 'bad')
          .map((t) => (
            <div key={t.id} className={`${box} border-bad/40`}>
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-bad" />
              <span className="flex-1">{t.text}</span>
              <button type="button" onClick={() => dismiss(t.id)} className="-mr-1 rounded p-0.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Cerrar aviso">
                <X className="size-4" />
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
