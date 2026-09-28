import type { ReactNode } from 'react'

type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'accent'

const tones: Record<Tone, string> = {
  ok: 'text-ok bg-ok-soft',
  warn: 'text-warn bg-warn-soft',
  bad: 'text-bad bg-bad-soft',
  accent: 'text-accent-text bg-accent-soft',
  neutral: 'text-muted bg-surface-2 border border-line',
}

/** Estado con punto de color: "Activo", "Pendiente", "Anulado". */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${tones[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  )
}

/** Tecla de un atajo: <Kbd>Ctrl</Kbd><Kbd>K</Kbd> */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-2 px-1 font-mono text-[11px] font-medium text-muted">
      {children}
    </kbd>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-xl border border-line bg-surface shadow-panel ${className}`}>{children}</section>
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[26px] leading-tight font-bold tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function ErrorList({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <div role="alert" className="rounded-lg border border-bad/30 bg-bad-soft px-3.5 py-2.5 text-[13px] text-bad">
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
