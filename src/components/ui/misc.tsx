import type { ReactNode } from 'react'

type Tone = 'ok' | 'warn' | 'bad' | 'neutral'

const dots: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-bad',
  neutral: 'bg-faint',
}

/** Estado como punto de color + texto: "Activo", "Pendiente", "Anulado". */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] whitespace-nowrap text-muted">
      <span className={`size-1.5 rounded-full ${dots[tone]}`} aria-hidden />
      {children}
    </span>
  )
}

/** Tecla de un atajo: <Kbd>Ctrl</Kbd><Kbd>K</Kbd> */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line px-1 font-sans text-[11px] text-faint">{children}</kbd>
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-lg border border-line bg-surface ${className}`}>{children}</section>
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[24px] leading-tight font-semibold tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function ErrorList({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null
  return (
    <div role="alert" className="border-l-2 border-bad bg-bad-soft px-3.5 py-2.5 text-[13.5px] text-bad">
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
