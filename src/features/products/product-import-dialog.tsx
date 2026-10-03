import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { errorMessages } from '@/api/client'
import {
  downloadProductTemplate,
  previewProductImport,
  useImportProducts,
  type ProductImportPreview,
  type ProductImportRow,
} from '@/api/products'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { FilterChip, type Option } from '@/components/ui/filters'
import { ErrorList, Pill } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { saveBlob } from '@/lib/download'
import { countLabel } from '@/lib/filters'
import { formatInt } from '@/lib/format'

type Step = 'upload' | 'review' | 'done'
type Action = NonNullable<ProductImportRow['action']>

/** Tono del punto de estado para cada resultado que informa la API. */
const tones: Record<Action, 'ok' | 'warn' | 'bad' | 'neutral'> = {
  Create: 'ok',
  Update: 'warn',
  Skip: 'neutral',
  Unchanged: 'neutral',
  Error: 'bad',
}

const MAX_ROWS_SHOWN = 200

/**
 * Carga masiva de productos: subir el Excel, revisar qué pasará con cada fila y confirmar.
 * Todo lo decide la API; esta pantalla solo envía el archivo y muestra la respuesta.
 */
export function ProductImportDialog({
  open,
  onClose,
  onExport,
}: {
  open: boolean
  onClose: () => void
  /** Cierra la importación y abre la exportación, para editar productos que ya existen. */
  onExport: () => void
}) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [preview, setPreview] = useState<ProductImportPreview | null>(null)
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null)
  const review = useMutation({ mutationFn: () => previewProductImport(file!, updateExisting) })
  const confirm = useImportProducts()

  useEffect(() => {
    if (!open) return
    setStep('upload')
    setFile(null)
    setUpdateExisting(false)
    setPreview(null)
    setResult(null)
    review.reset()
    confirm.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const runReview = () =>
    review.mutate(undefined, {
      onSuccess: (data) => {
        setPreview(data)
        setStep('review')
      },
    })

  const runImport = () =>
    confirm.mutate(
      { file: file!, updateExisting, planVersion: preview!.planVersion },
      {
        onSuccess: (data) => {
          setResult(data)
          setStep('done')
          toast.ok('Productos importados')
        },
      },
    )

  const title = step === 'upload' ? 'Importar productos desde Excel' : step === 'review' ? 'Revisa antes de importar' : 'Importación terminada'

  return (
    <Dialog
      open={open}
      // Mientras se guarda no se puede cerrar: así nadie cree que canceló una importación que sigue en curso.
      onOpenChange={(o) => !o && !confirm.isPending && onClose()}
      title={title}
      description={step === 'review' && file ? file.name : undefined}
      width={step === 'review' ? 'max-w-4xl' : 'max-w-xl'}
      footer={
        step === 'upload' ? (
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" disabled={!file} loading={review.isPending} onClick={runReview}>
              Revisar archivo
            </Button>
          </>
        ) : step === 'review' ? (
          <>
            <Button
              disabled={confirm.isPending}
              onClick={() => {
                // Al volver a subir se limpia el error de la importación anterior, y el archivo se elige de nuevo: si se
                // corrigió en el disco, el navegador no puede volver a enviar el que se eligió antes.
                confirm.reset()
                review.reset()
                setFile(null)
                setStep('upload')
              }}
            >
              Subir otro archivo
            </Button>
            <Button variant="primary" disabled={!preview?.canImport} loading={confirm.isPending} onClick={runImport}>
              {preview?.canImport ? `Importar ${countLabel(preview.toImport, 'producto', 'productos')}` : 'Importar'}
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={onClose}>
            Listo
          </Button>
        )
      }
    >
      {step === 'upload' && (
        <UploadStep
          file={file}
          onFile={setFile}
          updateExisting={updateExisting}
          onUpdateExisting={setUpdateExisting}
          onExport={onExport}
          errors={review.isError ? errorMessages(review.error) : []}
        />
      )}
      {step === 'review' && preview && <ReviewStep preview={preview} errors={confirm.isError ? errorMessages(confirm.error) : []} />}
      {step === 'done' && result && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="size-10 text-ok" strokeWidth={1.5} />
          <p className="text-md">
            Se crearon <strong>{formatInt(result.created)}</strong> y se actualizaron <strong>{formatInt(result.updated)}</strong> productos.
          </p>
        </div>
      )}
    </Dialog>
  )
}

function UploadStep({
  file,
  onFile,
  updateExisting,
  onUpdateExisting,
  onExport,
  errors,
}: {
  file: File | null
  onFile: (file: File | null) => void
  updateExisting: boolean
  onUpdateExisting: (value: boolean) => void
  onExport: () => void
  errors: string[]
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const getTemplate = async () => {
    setDownloading(true)
    try {
      const { blob, fileName } = await downloadProductTemplate()
      saveBlob(blob, fileName)
    } catch (e) {
      toast.error(errorMessages(e)[0])
    } finally {
      setDownloading(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }

  return (
    <div className="flex flex-col gap-5">
      <ErrorList messages={errors} />

      <section className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          <strong className="font-medium text-ink">1.</strong> Descarga la plantilla y llénala en Excel. Para cambiar productos que ya tienes (por ejemplo, sus precios),
          descárgalos con{' '}
          <button type="button" onClick={onExport} className="font-medium text-accent-text underline underline-offset-4 hover:text-ink">
            Exportar
          </button>
          , edítalos y súbelos aquí.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={getTemplate} loading={downloading}>
            <Download />
            Descargar plantilla
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          <strong className="font-medium text-ink">2.</strong> Sube el archivo lleno.
        </p>
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors ${dragging ? 'border-ink bg-surface-2' : 'border-line-strong hover:border-ink/40'}`}
        >
          <input ref={input} type="file" accept=".xlsx" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <>
              <FileSpreadsheet className="size-7 text-accent" strokeWidth={1.5} />
              <span className="text-base font-medium">{file.name}</span>
              <span className="text-xs text-faint">Haz clic para elegir otro archivo</span>
            </>
          ) : (
            <>
              <Upload className="size-7 text-faint" strokeWidth={1.5} />
              <span className="text-base">Arrastra el archivo aquí o haz clic para elegirlo</span>
              <span className="text-xs text-faint">Excel (.xlsx), hasta 5 MB</span>
            </>
          )}
        </label>
      </section>

      <label className="flex items-start gap-3 text-base">
        <input type="checkbox" className="mt-1 size-4 [accent-color:var(--ink)]" checked={updateExisting} onChange={(e) => onUpdateExisting(e.target.checked)} />
        <span>
          Actualizar los productos que ya existen
          <span className="block text-sm text-muted">Se reconocen por el código. Si no marcas esta opción, esos productos se omiten y no se modifican.</span>
        </span>
      </label>
    </div>
  )
}

function ReviewStep({ preview, errors }: { preview: ProductImportPreview; errors: string[] }) {
  const [filter, setFilter] = useState<Action | undefined>(preview.withErrors > 0 ? 'Error' : undefined)

  // Las opciones del filtro son los resultados que trae la API, con su descripción.
  const options = useMemo(() => {
    const seen = new Map<Action, string>()
    for (const r of preview.rows) if (r.action) seen.set(r.action, r.actionDescription ?? r.action)
    return [...seen].map(([value, label]) => ({ value, label })) as Option<Action>[]
  }, [preview.rows])

  const rows = filter ? preview.rows.filter((r) => r.action === filter) : preview.rows
  const summary = [
    { label: 'Se crearán', value: preview.toCreate, tone: 'ok' as const },
    { label: 'Se actualizarán', value: preview.toUpdate, tone: 'warn' as const },
    { label: 'Se omitirán', value: preview.skipped, tone: 'neutral' as const },
    { label: 'Sin cambios', value: preview.unchanged, tone: 'neutral' as const },
    { label: 'Con errores', value: preview.withErrors, tone: 'bad' as const },
  ].filter((s) => s.value > 0)

  return (
    <div className="flex flex-col gap-4">
      <ErrorList messages={errors} />

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {summary.map((s) => (
          <Pill key={s.label} tone={s.tone}>
            <span className="num font-medium text-ink">{formatInt(s.value)}</span> {s.label.toLowerCase()}
          </Pill>
        ))}
      </div>

      {preview.withErrors > 0 ? (
        <p className="border-l-2 border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
          Hay filas con errores. Corrígelas en tu archivo y vuelve a subirlo: no se guardará nada mientras haya errores.
        </p>
      ) : !preview.canImport ? (
        <p className="border-l-2 border-line-strong bg-surface-2 px-3.5 py-2.5 text-sm text-muted">No hay productos para crear ni actualizar.</p>
      ) : null}

      <div className="flex items-center gap-3">
        <FilterChip label="Resultado" options={options} value={filter} onChange={setFilter} />
        <span className="num text-sm text-faint">
          {formatInt(rows.length)} {rows.length === 1 ? 'fila' : 'filas'}
        </span>
      </div>

      <div className="relative max-h-[45vh] overflow-auto border-y border-line">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-left text-xs text-faint">
              <th className="border-b border-line py-2 pr-3 font-normal">Fila</th>
              <th className="border-b border-line px-3 py-2 font-normal">Código</th>
              <th className="border-b border-line px-3 py-2 font-normal">Nombre</th>
              <th className="border-b border-line px-3 py-2 font-normal">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, MAX_ROWS_SHOWN).map((r) => (
              <tr key={r.rowNumber} className="border-b border-line align-top">
                <td className="num py-2.5 pr-3 text-faint">{r.rowNumber}</td>
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{r.code ?? '—'}</td>
                <td className="px-3 py-2.5">{r.name ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <Pill tone={r.action ? tones[r.action] : 'neutral'}>{r.actionDescription}</Pill>
                  {r.errors.length > 0 && (
                    <ul className="mt-1 text-sm text-bad">
                      {r.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  )}
                  {r.changes.length > 0 && (
                    <ul className="mt-1 text-sm text-muted">
                      {/* En un producto nuevo no hay valor anterior: se muestra solo el que se va a crear. */}
                      {r.changes.map((c) => (
                        <li key={c.field}>
                          {c.field}:{' '}
                          {c.from != null && (
                            <>
                              <span className="line-through">{c.from}</span> →{' '}
                            </>
                          )}
                          <span className="text-ink">{c.to}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > MAX_ROWS_SHOWN && (
        <p className="text-xs text-faint">
          Se muestran las primeras {MAX_ROWS_SHOWN} filas de {formatInt(rows.length)}.
        </p>
      )}
    </div>
  )
}
