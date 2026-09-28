import { formatDateTime, formatDay } from '@/lib/format'

// Si la API no tiene el nombre (registro creado al arrancar, usuario borrado), lo hizo el sistema.
const who = (name: string | null) => name ?? 'el sistema'

interface Audited {
  createdAt: string
  createdByName: string | null
  updatedAt: string | null
  updatedByName: string | null
}

/**
 * Pie de un registro: quién lo creó y quién lo modificó por última vez, con fecha y hora.
 * Los verbos se pueden cambiar para concordar con el registro ("Registrada", "Modificada").
 */
export function AuditInfo({ record, created = 'Creado', updated = 'Modificado' }: { record: Audited | undefined; created?: string; updated?: string }) {
  if (!record) return <p className="min-h-5 text-sm text-faint" aria-hidden />
  return (
    <p className="text-sm text-faint">
      {created} por <span className="text-muted">{who(record.createdByName)}</span> el <span className="num">{formatDateTime(record.createdAt)}</span>
      {record.updatedAt && (
        <>
          <br />
          {updated} por <span className="text-muted">{who(record.updatedByName)}</span> el <span className="num">{formatDateTime(record.updatedAt)}</span>
        </>
      )}
    </p>
  )
}

/** Celda "Creado" de una tabla: fecha y, debajo, quién lo registró. */
export function CreatedCell({ at, by }: { at: string; by: string | null }) {
  return (
    <span className="whitespace-nowrap" title={formatDateTime(at)}>
      <span className="num block text-muted">{formatDay(at)}</span>
      <span className="block text-xs text-faint">{who(by)}</span>
    </span>
  )
}
