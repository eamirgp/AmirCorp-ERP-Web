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

/**
 * Avisos en una cápsula de vidrio que baja arriba al centro, como los del iPhone al copiar algo (Apple no tiene
 * "toasts"; HIG "Feedback": confirmar lo importante sin interrumpir). El de error lleva su ✕ y se queda.
 */
export function Toaster() {
  const items = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => toasts,
  )

  const box =
    'animate-toast-in pointer-events-auto flex max-w-[min(440px,calc(100vw-32px))] items-start gap-2.5 bg-glass-menu text-sm font-medium text-fg shadow-toast backdrop-blur-[30px] backdrop-saturate-[1.8] [&>svg]:mt-px [&>svg]:size-5 [&>svg]:shrink-0'

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2">
      {/* Éxitos: se anuncian sin interrumpir. */}
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
        {items
          .filter((t) => t.tone === 'ok')
          .map((t) => (
            <div key={t.id} className={`${box} rounded-full py-2.5 pr-5 pl-3.5`}>
              <CheckCircle2 className="text-link" />
              {t.text}
            </div>
          ))}
      </div>
      {/* Errores: se anuncian de inmediato y se cierran a mano. */}
      <div role="alert" aria-live="assertive" className="flex flex-col items-center gap-2">
        {items
          .filter((t) => t.tone === 'bad')
          .map((t) => (
            <div key={t.id} className={`${box} rounded-[18px] py-2.5 pr-2 pl-3.5`}>
              <CircleAlert className="text-bad" />
              <span className="flex-1 pt-px">{t.text}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="press -my-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-hover hover:text-fg"
                aria-label="Cerrar aviso"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
