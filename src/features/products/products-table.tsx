import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon, Pencil, Power } from 'lucide-react'
import { useMemo } from 'react'
import type { ProductRow } from '@/api/products'
import { DataTable, RowMenu, type TableSort } from '@/components/ui/data-table'
import { Pill } from '@/components/ui/misc'
import { formatPen } from '@/lib/format'

const col = createColumnHelper<ProductRow>()

export function ProductsTable({
  rows,
  onEdit,
  onToggle,
  onHistory,
  busyId,
  sort,
}: {
  rows: ProductRow[]
  onEdit: (p: ProductRow) => void
  onToggle: (p: ProductRow) => void
  onHistory: (p: ProductRow) => void
  /** Producto que se está activando o desactivando: su botón queda bloqueado. */
  busyId?: string
  sort?: TableSort
}) {
  const columns = useMemo(
    () => [
      col.accessor('code', { header: 'Código', meta: { sortBy: 'Code' }, cell: (c) => <span className="font-mono text-xs whitespace-nowrap text-fg-muted">{c.getValue()}</span> }),
      col.accessor('name', {
        header: 'Producto',
        meta: { sortBy: 'Name' },
        // Solo si apareció al buscar un código de proveedor, la API dice cuál: así se entiende por qué salió.
        cell: (c) => (
          <span>
            {c.getValue()}
            {c.row.original.searchMatch && <span className="block text-xs text-fg-muted">{c.row.original.searchMatch}</span>}
          </span>
        ),
      }),
      col.accessor('unitOfMeasureName', { header: 'Unidad', meta: { hideOnMobile: true }, cell: (c) => <span className="text-fg-muted">{c.getValue()}</span> }),
      // Nombre corto en la tabla; el completo de SUNAT aparece al pasar el mouse.
      col.accessor('igvAffectationShortDescription', {
        header: 'IGV',
        meta: { hideOnMobile: true },
        cell: (c) => (
          <span className="text-fg-muted" title={c.row.original.igvAffectationDescription}>
            {c.getValue()}
          </span>
        ),
      }),
      col.accessor('salePrice', {
        header: 'Precio',
        meta: { alignRight: true, sortBy: 'SalePrice' },
        cell: (c) => <span className="num">{formatPen(Number(c.getValue()))}</span>,
      }),
      col.accessor('isActive', { header: 'Estado', cell: (c) => <Pill tone={c.getValue() ? 'ok' : 'neutral'}>{c.row.original.statusDescription}</Pill> }),
      col.display({
        id: 'actions',
        header: () => <span className="sr-only">Acciones</span>,
        cell: (c) => {
          const p = c.row.original
          return (
            <RowMenu
              label={p.name}
              busy={busyId === p.id}
              items={[
                { label: 'Editar', icon: <Pencil />, onSelect: () => onEdit(p) },
                { label: 'Ver historial', icon: <HistoryIcon />, onSelect: () => onHistory(p) },
                p.isActive
                  ? { label: 'Desactivar', icon: <Power />, onSelect: () => onToggle(p), danger: true }
                  : { label: 'Activar', icon: <Power />, onSelect: () => onToggle(p) },
              ]}
            />
          )
        },
      }),
    ],
    [onEdit, onToggle, onHistory, busyId],
  )

  return <DataTable data={rows} columns={columns} getRowId={(r) => r.id} onOpen={onEdit} isMuted={(r) => !r.isActive} sort={sort} />
}
