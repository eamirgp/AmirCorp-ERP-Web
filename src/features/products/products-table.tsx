import { createColumnHelper } from '@tanstack/react-table'
import { HistoryIcon, Pencil, Power } from 'lucide-react'
import { useMemo } from 'react'
import type { ProductRow } from '@/api/products'
import { DataTable, RowMenu, type TableSort } from '@/components/ui/data-table'
import { GroupedList } from '@/components/ui/grouped-list'
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
        cell: (c) => <ProductMenu product={c.row.original} onEdit={onEdit} onToggle={onToggle} onHistory={onHistory} busyId={busyId} />,
      }),
    ],
    [onEdit, onToggle, onHistory, busyId],
  )

  return <DataTable data={rows} columns={columns} getRowId={(r) => r.id} onOpen={onEdit} isMuted={(r) => !r.isActive} sort={sort} />
}

/**
 * Productos en el celular: filas como las del iPhone (GroupedList). Arriba el nombre; debajo el código y la unidad; a
 * la derecha el precio y, solo si está inactivo, la pastilla "Inactivo" (lo normal no se marca). El orden se cambia
 * con "Ordenar", porque no hay títulos de columna.
 */
export function ProductsList({ rows, onEdit, onToggle, onHistory, busyId }: Omit<Parameters<typeof ProductsTable>[0], 'sort'>) {
  return (
    <GroupedList rows={rows} getRowId={(p) => p.id} onOpen={onEdit} isMuted={(p) => !p.isActive}>
      {(p) => ({
        title: (
          <>
            {p.name}
            {p.searchMatch && <span className="block text-xs text-fg-muted">{p.searchMatch}</span>}
          </>
        ),
        detail: (
          <>
            <span className="font-mono">{p.code}</span>
            <span className="truncate">{p.unitOfMeasureName}</span>
          </>
        ),
        value: formatPen(Number(p.salePrice)),
        badge: !p.isActive && <Pill tone="neutral">{p.statusDescription}</Pill>,
        actions: <ProductMenu product={p} onEdit={onEdit} onToggle={onToggle} onHistory={onHistory} busyId={busyId} />,
      })}
    </GroupedList>
  )
}

/** Acciones de un producto, las mismas en la tabla y en la lista del celular. */
function ProductMenu({
  product: p,
  onEdit,
  onToggle,
  onHistory,
  busyId,
}: {
  product: ProductRow
  onEdit: (p: ProductRow) => void
  onToggle: (p: ProductRow) => void
  onHistory: (p: ProductRow) => void
  busyId?: string
}) {
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
}
