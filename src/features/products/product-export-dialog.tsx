import { Download } from 'lucide-react'
import { useState } from 'react'
import { errorMessages } from '@/api/client'
import { exportProducts, type ProductExportParams } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { saveBlob } from '@/lib/download'
import { countLabel } from '@/lib/filters'

/** Descarga el Excel de productos que genera la API y avisa si falla. */
export function useProductExport() {
  const [busy, setBusy] = useState(false)

  const run = async (params: ProductExportParams) => {
    setBusy(true)
    try {
      const { blob, fileName } = await exportProducts(params)
      saveBlob(blob, fileName)
      toast.ok('Excel descargado')
      return true
    } catch (e) {
      toast.error(errorMessages(e)[0])
      return false
    } finally {
      setBusy(false)
    }
  }

  return { run, busy }
}

/**
 * Con filtros aplicados, pregunta qué exportar: los productos que se ven (por defecto) o todos.
 * El Excel sale en el formato de la plantilla, así se puede editar y volver a importar.
 */
export function ProductExportDialog({
  open,
  params,
  matching,
  onClose,
}: {
  open: boolean
  /** Filtros y orden de la pantalla. */
  params: ProductExportParams
  /** Cuántos productos coinciden con los filtros, según la API. */
  matching: number | undefined
  onClose: () => void
}) {
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered')
  const { run, busy } = useProductExport()

  const download = async () => {
    // "Todos" conserva el orden de la pantalla, pero sin filtros.
    const ok = await run(scope === 'filtered' ? params : { sortBy: params.sortBy, descending: params.descending })
    if (ok) onClose()
  }

  const option = (value: 'filtered' | 'all', title: string, hint: string) => (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${scope === value ? 'border-ink/40 bg-surface-2' : 'border-line hover:border-line-strong'}`}
    >
      <input type="radio" name="export-scope" className="mt-1 size-4 [accent-color:var(--ink)]" checked={scope === value} onChange={() => setScope(value)} />
      <span>
        <span className="block text-base font-medium">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Exportar productos"
      description="El Excel sale en el formato de la plantilla: puedes editarlo y volver a importarlo."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={download} loading={busy}>
            <Download />
            Descargar Excel
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">Qué productos exportar</legend>
        {option(
          'filtered',
          matching === undefined ? 'Solo los que estás viendo' : `Solo los que estás viendo (${countLabel(matching, 'producto', 'productos')})`,
          'Con la búsqueda y los filtros aplicados, en el mismo orden de la pantalla.',
        )}
        {option('all', 'Todos los productos', 'Todo el catálogo, sin filtros.')}
      </fieldset>
    </Dialog>
  )
}
