import type { ReactNode } from 'react'

/** Lo que muestra una fila de la lista del celular. */
export interface GroupedRow {
  /** Arriba, en 16 px: el nombre del registro. */
  title: ReactNode
  /** Debajo, en gris y más chico: código, unidad, fecha… */
  detail?: ReactNode
  /** A la derecha, arriba: el dato que se compara (precio, total), en cifras alineadas. */
  value?: ReactNode
  /** A la derecha, debajo del valor: un estado que hay que notar ("Inactivo"). */
  badge?: ReactNode
  /** El "⋯" con las acciones de la fila (RowMenu). */
  actions?: ReactNode
}

/**
 * Lista del celular en lugar de la tabla, como las del iPhone (HIG "Lists and tables": estilo agrupado, "inset
 * grouped"): un bloque gris de esquinas redondeadas con filas separadas por una línea fina. Cada fila muestra el nombre
 * arriba y los datos chicos debajo, en vez de columnas que no caben. Tocar la fila abre el registro (se oscurece al
 * tocarla, como en iOS); el "⋯" de la derecha tiene las demás acciones, como en la app Archivos. Una fila inactiva se
 * atenúa como en la tabla.
 */
export function GroupedList<T>({
  rows,
  getRowId,
  onOpen,
  isMuted,
  children,
}: {
  rows: T[]
  getRowId: (row: T) => string
  onOpen?: (row: T) => void
  isMuted?: (row: T) => boolean
  children: (row: T) => GroupedRow
}) {
  return (
    <ul className="overflow-hidden rounded-2xl bg-muted-fill">
      {rows.map((row) => {
        const r = children(row)
        const muted = isMuted?.(row) ?? false
        return (
          <li key={getRowId(row)} className="flex items-center border-b border-hairline last:border-b-0">
            <button
              type="button"
              onClick={onOpen ? () => onOpen(row) : undefined}
              className="flex min-h-16 min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-3.5 text-left outline-none transition-colors duration-150 focus-visible:shadow-[inset_3px_0_0_var(--accent)] active:bg-fill"
            >
              <span className={`min-w-0 flex-1 ${muted ? 'opacity-55' : ''}`}>
                <span className="block text-base leading-snug">{r.title}</span>
                {r.detail && <span className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-fg-muted">{r.detail}</span>}
              </span>
              {(r.value || r.badge) && (
                <span className="flex flex-none flex-col items-end gap-1">
                  {r.value && <span className={`num text-base ${muted ? 'opacity-55' : ''}`}>{r.value}</span>}
                  {r.badge}
                </span>
              )}
            </button>
            <span className="flex-none pr-1.5 pl-0.5">{r.actions}</span>
          </li>
        )
      })}
    </ul>
  )
}
