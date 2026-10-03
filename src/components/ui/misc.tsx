import type { ReactNode } from 'react'

type Tone = 'ok' | 'warn' | 'bad' | 'neutral'

const tones: Record<Tone, string> = {
  ok: 'bg-accent-soft text-accent-text',
  warn: 'bg-warn-soft text-warn-text',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-surface-2 text-muted ring-1 ring-inset ring-line',
}

/** Estado como pastilla de color suave: "Activo", "Pendiente", "Anulada". El color ayuda; el texto dice el estado. */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

/** Tecla de un atajo: <Kbd>Ctrl</Kbd><Kbd>K</Kbd> */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-line px-1 font-sans text-2xs text-faint">{children}</kbd>
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-x-6 gap-y-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-base text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/**
 * Sección de un formulario largo como tarjeta con título ("Proveedor", "Comprobante", "Productos"): separa los
 * bloques igual que las listas, que van en una tarjeta sobre el fondo de la página.
 */
export function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-5 ${className}`}>
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function ErrorList({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <div role="alert" className="border-l-2 border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
      {messages.length === 1 ? (
        messages[0]
      ) : (
        <ul className="list-disc space-y-0.5 pl-4">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
