import { ArrowRight } from 'lucide-react'
import type { AuditEntry } from '@/api/audit'

/**
 * Campos modificados en un evento: "Precio de venta  S/ 25.00 → S/ 30.00".
 * Los nombres y valores llegan listos desde la API.
 */
export function ChangeList({ changes, limit }: { changes: AuditEntry['changes']; limit?: number }) {
  if (changes.length === 0) return null
  const shown = limit ? changes.slice(0, limit) : changes
  const hidden = changes.length - shown.length

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {shown.map((c) => (
        <li key={c.field} className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-muted">{c.field}</span>
          <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-faint line-through decoration-faint/50">{c.from}</span>
            <ArrowRight className="size-3.5 self-center text-faint" aria-label="cambió a" />
            <span className="text-ink">{c.to}</span>
          </span>
        </li>
      ))}
      {hidden > 0 && <li className="text-faint">y {hidden} {hidden === 1 ? 'cambio' : 'cambios'} más</li>}
    </ul>
  )
}
