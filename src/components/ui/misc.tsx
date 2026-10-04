import type { ReactNode } from 'react'
import { useIsPhone } from '@/lib/use-media-query'
import { InlineError } from './inline-error'

type Tone = 'ok' | 'warn' | 'bad' | 'neutral'

// Colores de estado de Apple (decisión 16). Contrastes medidos: verde, naranja y rojo sobre su fondo 4.9:1; gris sobre gris claro 4.7:1.
const tones: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn-text',
  bad: 'bg-bad-soft text-bad',
  neutral: 'bg-muted-fill text-fg-muted',
}

/** Estado como pastilla de color suave: "Activo", "Pendiente", "Anulada". El color ayuda; el texto dice el estado. */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

/** Tecla de un atajo: <Kbd>Ctrl</Kbd><Kbd>K</Kbd> */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted-fill px-1.5 font-sans text-2xs text-fg-muted">{children}</kbd>
}

/**
 * Encabezado de una pantalla: el título grande (como los de Apple), su descripción y las acciones a la derecha.
 * En el celular, si se pasa `compactActions`, esas reemplazan a `actions` junto al título: botones redondos de solo
 * ícono, como la barra de una app del iPhone ("⋯" con lo secundario y un "+" azul para crear).
 */
export function PageHeader({
  title,
  description,
  actions,
  compactActions,
}: {
  title: string
  description?: string
  actions?: ReactNode
  compactActions?: ReactNode
}) {
  const compact = useIsPhone() && !!compactActions
  return (
    <header className={`flex gap-y-4 pt-2 ${compact ? 'items-end gap-x-2.5' : 'flex-col gap-x-6 sm:flex-row sm:items-end'}`}>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-display font-bold tracking-[-0.025em] text-fg max-md:text-large-title">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-apple text-fg-muted max-md:mt-1 max-md:text-sm">{description}</p>}
      </div>
      {compact ? <div className="flex flex-none items-center gap-2.5 pb-0.5">{compactActions}</div> : actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}

/**
 * Sección de un formulario largo con su título ("Proveedor", "Comprobante", "Productos"). En el estilo Apple los
 * bloques se separan con espacio y una línea fina, sin tarjetas.
 */
export function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 border-t border-rule pt-5 ${className}`}>
      <h2 className="font-display text-xl font-bold tracking-[-0.015em] text-fg">{title}</h2>
      {children}
    </section>
  )
}

/** Errores de un formulario que no son de un campo (los envía la API): en rojo, con ícono, junto al formulario. */
export function ErrorList({ messages }: { messages: string[] }) {
  return <InlineError messages={messages} />
}
