import { useInfiniteQuery } from '@tanstack/react-query'
import { HistoryIcon } from 'lucide-react'
import { recordHistoryQuery, type AuditEntityType } from '@/api/audit'
import { errorMessages } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/list-controls'
import { ErrorList } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/format'
import { ChangeList } from './change-list'

/** Registro cuyo historial se quiere ver. */
export interface HistoryTarget {
  entityType: AuditEntityType
  entityId: string
  /** Nombre del registro para el encabezado ("LIM-005 · Abrillantador de llantas"). */
  label: string
}

/** Panel lateral con la línea de tiempo de un registro: quién lo creó, qué cambió y cuándo. */
export function HistorySheet({ target, onClose }: { target: HistoryTarget | null; onClose: () => void }) {
  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && onClose()} title="Historial" description={target?.label}>
      {target && <Timeline target={target} />}
    </Sheet>
  )
}

function Timeline({ target }: { target: HistoryTarget }) {
  const history = useInfiniteQuery(recordHistoryQuery(target.entityType, target.entityId))

  if (history.isError) return <ErrorList messages={errorMessages(history.error)} />
  if (!history.data) return <Loading text="Cargando historial…" />

  const entries = history.data.pages.flatMap((p) => p.items)

  if (entries.length === 0)
    return (
      <div className="flex flex-col items-center gap-2.5 py-16 text-center">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-page text-fg-muted">
          <HistoryIcon className="size-[26px]" strokeWidth={1.75} />
        </span>
        <p className="max-w-xs text-sm text-fg-muted">Todavía no hay cambios registrados. Lo que se hizo antes de activar el historial no aparece aquí.</p>
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col">
        {entries.map((e, i) => (
          <li key={e.id} className="relative flex gap-3.5 pb-[22px] last:pb-0">
            {/* Línea que une los eventos; el más reciente, en jade. */}
            {i < entries.length - 1 && <span className="absolute top-4 bottom-0 left-[5px] w-px bg-rule" aria-hidden />}
            <span className={`relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 ${i === 0 ? 'border-selected bg-selected' : 'border-[#c7c7cc] bg-page'}`} aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div>
                <p className="text-base font-semibold text-fg">{e.actionDescription}</p>
                <p className="text-sm text-fg-muted">
                  {e.userName} · <span className="num">{formatDateTime(e.occurredAt)}</span>
                </p>
              </div>
              <ChangeList changes={e.changes} />
            </div>
          </li>
        ))}
      </ol>

      {history.hasNextPage && (
        <Button size="sm" className="self-start" onClick={() => history.fetchNextPage()} loading={history.isFetchingNextPage}>
          Ver más
        </Button>
      )}
    </div>
  )
}
