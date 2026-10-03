import { createColumnHelper } from '@tanstack/react-table'
import { Ban, HistoryIcon, LockOpen, Pencil, UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import type { PartnerRow } from '@/api/partners'
import { RowMenu } from '@/components/ui/data-table'
import { Pill } from '@/components/ui/misc'
import type { HistoryTarget } from '@/features/audit/history-sheet'
import type { RoleConfig } from '@/features/partners/partner-roles'

const col = createColumnHelper<PartnerRow>()

/** Columnas de la lista de clientes o proveedores, con el estado y el menú de acciones del rol de esa lista. */
export function usePartnerColumns({
  config,
  busyId,
  onEdit,
  onAddOtherRole,
  onHistory,
  onBlock,
  onUnblock,
}: {
  config: RoleConfig
  busyId: string | undefined
  onEdit: (p: PartnerRow) => void
  onAddOtherRole: (p: PartnerRow) => void
  onHistory: (target: HistoryTarget) => void
  onBlock: (p: PartnerRow) => void
  onUnblock: (p: PartnerRow) => void
}) {
  const isSuppliers = config.role === 'proveedores'
  return useMemo(
    () => [
      col.accessor('documentNumber', {
        header: 'Documento',
        cell: (c) => (
          <span>
            <span className="block font-mono text-sm whitespace-nowrap">{c.getValue()}</span>
            <span className="block text-xs text-faint">{c.row.original.identityDocumentTypeDescription}</span>
          </span>
        ),
      }),
      col.accessor('name', {
        header: 'Nombre o razón social',
        // Si también tiene el otro rol se indica debajo: es el mismo registro en las dos listas.
        cell: (c) => (
          <span>
            {c.getValue()}
            {c.row.original.isClient && c.row.original.isSupplier && <span className="block text-xs text-faint">{config.alsoOther}</span>}
          </span>
        ),
      }),
      col.accessor('countryName', { header: 'País', meta: { hideOnMobile: true }, cell: (c) => <span className="text-muted">{c.getValue()}</span> }),
      col.display({
        id: 'status',
        header: 'Estado',
        // El estado es el del rol de esta lista; si está bloqueado, el motivo va debajo.
        cell: (c) => {
          const p = c.row.original
          if (!config.isBlocked(p)) return <Pill tone="ok">{config.status(p)}</Pill>
          const reason = config.blockReason(p)
          return (
            <span className="flex flex-col items-start gap-1">
              <Pill tone="bad">{config.status(p)}</Pill>
              {reason && <span className="text-xs text-muted">{reason}</span>}
            </span>
          )
        },
      }),
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
                ...((isSuppliers ? p.canAddClientRole : p.canAddSupplierRole)
                  ? [{ label: `Registrar también como ${isSuppliers ? 'cliente' : 'proveedor'}`, icon: <UserPlus />, onSelect: () => onAddOtherRole(p) }]
                  : []),
                { label: 'Ver historial', icon: <HistoryIcon />, onSelect: () => onHistory({ entityType: 'BusinessPartner', entityId: p.id, label: `${p.documentNumber} · ${p.name}` }) },
                config.isBlocked(p)
                  ? { label: config.unblockLabel, icon: <LockOpen />, onSelect: () => onUnblock(p) }
                  : { label: config.blockLabel, icon: <Ban />, onSelect: () => onBlock(p), danger: true },
              ]}
            />
          )
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId, config, isSuppliers],
  )
}
