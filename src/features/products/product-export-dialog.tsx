import { Check, Download } from 'lucide-react'
import { useState } from 'react'
import { errorText } from '@/api/client'
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
      toast.error(errorText(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  return { run, busy }
}

/**
 * Con filtros aplicados, pregunta qué exportar: los productos que se ven (por defecto) o todos. Cada opción es una
 * tarjeta con su marca; la elegida queda blanca con borde. El Excel sale en el formato de la plantilla, así se puede
 * editar y volver a importar.
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

  const option = (value: 'filtered' | 'all', title: string, hint: string) => {
    const checked = scope === value
    return (
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-[14px] px-3.5 py-3 transition-[background-color,box-shadow] duration-200 has-[:focus-visible]:shadow-focus ${checked ? 'bg-page shadow-[0_0_0_2px_var(--fg)]' : 'bg-muted-fill hover:bg-row-hover'}`}
      >
        <input type="radio" name="export-scope" className="sr-only" checked={checked} onChange={() => setScope(value)} />
        <span
          aria-hidden
          className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${checked ? 'border-pill bg-pill text-pill-ink' : 'border-field-line'}`}
        >
          {checked && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span>
          <span className="block text-base font-semibold">{title}</span>
          <span className="block text-sm text-fg-muted">{hint}</span>
        </span>
      </label>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Exportar productos"
      description="Sale en el formato de la plantilla: puedes editarlo y volver a importarlo."
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
          matching === undefined ? 'Solo los que estás viendo' : `Solo los que estás viendo · ${countLabel(matching, 'producto', 'productos')}`,
          'Con la búsqueda y los filtros, en el mismo orden de la pantalla.',
        )}
        {option('all', 'Todo el catálogo', 'Sin filtros.')}
      </fieldset>
    </Dialog>
  )
}
