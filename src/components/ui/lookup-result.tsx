import { TriangleAlert } from 'lucide-react'
import type { Schemas } from '@/api/client'

/** Lo que respondió SUNAT o RENIEC, con los avisos de la API (contribuyente de baja, ya registrado…). */
export function LookupResult({ data }: { data: Schemas['LookupDocumentResponseDto'] }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm">
      {/* SUNAT informa estado y condición; RENIEC solo el nombre. */}
      <p>
        <span className="text-muted">Según {data.source}: </span>
        {data.status ? (
          <>
            <span className="font-medium">{data.status}</span>
            <span className="text-muted"> · </span>
            <span className="font-medium">{data.condition}</span>
          </>
        ) : (
          <span className="font-medium">{data.name}</span>
        )}
      </p>
      {data.address && <p className="text-muted">{data.address}</p>}
      {data.warnings.map((w) => (
        <p key={w} className="flex gap-2 rounded bg-warn-soft px-3 py-2 text-warn-text">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {w}
        </p>
      ))}
    </div>
  )
}
