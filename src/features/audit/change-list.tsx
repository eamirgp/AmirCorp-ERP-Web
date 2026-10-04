import type { AuditEntry } from '@/api/audit'

/**
 * Campos modificados en un evento: "Precio de venta: S/ 25.00 → S/ 30.00", con el valor anterior tachado.
 * Los nombres y valores llegan listos desde la API.
 */
export function ChangeList({ changes, limit }: { changes: AuditEntry['changes']; limit?: number }) {
  if (changes.length === 0) return null
  const shown = limit ? changes.slice(0, limit) : changes
  const hidden = changes.length - shown.length

  return (
    <ul className="flex flex-col gap-1 text-sm text-fg-muted">
      {shown.map((c) => (
        <li key={c.field}>
          {c.field}:{' '}
          {c.from && (
            <>
              <s className="text-disabled">{c.from}</s> <span aria-label="cambió a">→</span>{' '}
            </>
          )}
          <span className="font-medium text-fg">{c.to}</span>
        </li>
      ))}
      {hidden > 0 && (
        <li>
          y {hidden} {hidden === 1 ? 'cambio' : 'cambios'} más
        </li>
      )}
    </ul>
  )
}
