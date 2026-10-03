import { useRef, useState } from 'react'
import type { PartnerRow } from '@/api/partners'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { NewSupplier } from './supplier-field'

/** Identifica al proveedor de la compra: el registrado por su id, el nuevo por su RUC. */
export const supplierKey = (s: PartnerRow | null | undefined, n: NewSupplier | null | undefined) => s?.id ?? (n ? `ruc:${n.ruc}` : 'ninguno')

/**
 * Cambiar el proveedor de una compra a medio llenar. Los productos de las líneas se buscan y se enlazan con los códigos
 * de un proveedor: si se cambia por otro, ya no corresponden. Se pregunta antes y se quitan de las líneas (la unidad,
 * las cantidades y los montos se quedan). "Cambiar" en un proveedor nuevo deja el campo vacío sin preguntar; se
 * pregunta al elegir el siguiente.
 */
export function useSupplierChange({ hasProducts, clearProducts }: { hasProducts: () => boolean; clearProducts: () => void }) {
  const linesSupplier = useRef<{ key: string; name: string } | null>(null)
  const [pending, setPending] = useState<{ from: string; to: string; apply: () => void } | null>(null)

  /**
   * @param key El proveedor elegido (`supplierKey`), o null si el campo queda vacío.
   * @param apply Lo que cambia el proveedor en el formulario.
   */
  const change = (key: string | null, name: string, apply: () => void) => {
    const from = linesSupplier.current
    if (key && from && from.key !== key && hasProducts()) {
      setPending({
        from: from.name,
        to: name,
        apply: () => {
          apply()
          clearProducts()
          linesSupplier.current = { key, name }
        },
      })
      return
    }
    apply()
    if (key) linesSupplier.current = { key, name }
  }

  const dialog = pending && (
    <ConfirmDialog
      open
      title="¿Cambiar el proveedor?"
      confirmLabel="Cambiar proveedor"
      onConfirm={() => {
        pending.apply()
        setPending(null)
      }}
      onCancel={() => setPending(null)}
    >
      Los productos de las líneas se buscaron con los códigos de {pending.from}. Al cambiar a {pending.to} se quitarán de las líneas para que
      los busques de nuevo. La unidad, las cantidades y los montos se quedan.
    </ConfirmDialog>
  )

  return { change, dialog }
}
