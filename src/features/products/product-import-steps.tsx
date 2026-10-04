import { CircleAlert, Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState, type DragEvent, type ReactNode } from 'react'
import { errorText } from '@/api/client'
import { downloadProductTemplate, type ProductImportPreview, type ProductImportRow } from '@/api/products'
import { Button } from '@/components/ui/button'
import { ErrorList, Pill } from '@/components/ui/misc'
import { SwitchRow } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { saveBlob } from '@/lib/download'
import { formatInt } from '@/lib/format'

type Action = NonNullable<ProductImportRow['action']>

/** Tono de la pastilla para cada resultado que informa la API. */
const tones: Record<Action, 'ok' | 'warn' | 'bad' | 'neutral'> = {
  Create: 'ok',
  Update: 'warn',
  Skip: 'neutral',
  Unchanged: 'neutral',
  Error: 'bad',
}

/** Color del punto de cada mosaico del resumen: el mismo tono que su pastilla. */
const dots: Record<Action, string> = {
  Create: 'bg-link',
  Update: 'bg-warn',
  Skip: 'bg-disabled',
  Unchanged: 'bg-disabled',
  Error: 'bg-bad',
}

const MAX_ROWS_SHOWN = 200

/** Un paso numerado, como las instrucciones de Apple: el número en un círculo y lo que hay que hacer. */
function NumberedStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex items-start gap-3.5">
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-pill text-sm font-semibold text-pill-ink">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
        <h3 className="text-md font-semibold text-fg">
          <span className="sr-only">Paso {n}: </span>
          {title}
        </h3>
        {children}
      </div>
    </section>
  )
}

/** Paso 1 de la importación: descargar la plantilla y subir el archivo lleno. */
export function UploadStep({
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
      toast.error(errorText(e))
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

      <NumberedStep n={1} title="Descarga la plantilla y llénala en Excel">
        <p className="text-sm text-fg-muted">
          ¿Vas a cambiar productos que ya tienes, como sus precios?{' '}
          <button type="button" onClick={onExport} className="font-semibold text-link hover:opacity-75">
            Expórtalos
          </button>
          , edítalos y súbelos aquí.
        </p>
        <div>
          <Button size="sm" onClick={getTemplate} loading={downloading}>
            <Download />
            Descargar plantilla
          </Button>
        </div>
      </NumberedStep>

      <NumberedStep n={2} title="Sube el archivo lleno">
        <input ref={input} type="file" accept=".xlsx" className="sr-only" tabIndex={-1} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="flex items-center gap-3 rounded-2xl bg-muted-fill py-3 pr-3 pl-3.5">
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-ok-soft text-link">
              <FileSpreadsheet className="size-[22px]" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{file.name}</span>
              <span className="num block text-xs text-fg-muted">{formatInt(Math.max(1, Math.round(file.size / 1024)))} KB</span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => input.current?.click()}>
              Cambiar
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex w-full flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed px-5 py-7 text-center transition-colors duration-200 ${dragging ? 'border-fg bg-muted-fill' : 'border-[#c7c7cc] hover:border-field-line hover:bg-stripe'}`}
          >
            <span aria-hidden className="flex size-[52px] items-center justify-center rounded-full bg-muted-fill text-fg-muted">
              <Upload className="size-6" strokeWidth={1.75} />
            </span>
            <span className="text-base font-semibold">Arrastra el archivo aquí o haz clic para elegirlo</span>
            <span className="text-xs text-fg-muted">Excel (.xlsx), hasta 5 MB</span>
          </button>
        )}
      </NumberedStep>

      <SwitchRow
        label="Actualizar los productos que ya existen"
        description="Se reconocen por el código. Si está apagado, esos productos se omiten y no se tocan."
        checked={updateExisting}
        onChange={onUpdateExisting}
      />
    </div>
  )
}

/**
 * Paso 2 de la importación: qué pasará con cada fila, según la revisión de la API. El resumen va en mosaicos con la
 * cifra grande (como Recordatorios de Apple); un clic en un mosaico muestra solo esas filas y otro clic las muestra todas.
 */
export function ReviewStep({ preview, errors }: { preview: ProductImportPreview; errors: string[] }) {
  const [filter, setFilter] = useState<Action | undefined>(preview.withErrors > 0 ? 'Error' : undefined)

  const rows = filter ? preview.rows.filter((r) => r.action === filter) : preview.rows
  const summary = (
    [
      { action: 'Create', label: 'se crearán', value: preview.toCreate },
      { action: 'Update', label: 'se actualizarán', value: preview.toUpdate },
      { action: 'Skip', label: 'se omitirán', value: preview.skipped },
      { action: 'Unchanged', label: 'sin cambios', value: preview.unchanged },
      { action: 'Error', label: 'con errores', value: preview.withErrors },
    ] as const
  ).filter((s) => s.value > 0)

  return (
    <div className="flex flex-col gap-4">
      <ErrorList messages={errors} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5" role="group" aria-label="Mostrar filas por resultado">
        {summary.map((s) => {
          const active = filter === s.action
          return (
            <button
              key={s.action}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? undefined : s.action)}
              className={`press flex flex-col items-start gap-1.5 rounded-2xl p-3.5 text-left transition-[background-color,box-shadow] duration-200 ${active ? 'bg-page shadow-[0_0_0_2px_var(--fg)]' : 'bg-muted-fill hover:bg-row-hover'}`}
            >
              <span aria-hidden className={`size-2.5 rounded-full ${dots[s.action]}`} />
              <span className="num font-display text-2xl leading-none font-bold">{formatInt(s.value)}</span>
              <span className="text-sm text-fg-muted">{s.label}</span>
            </button>
          )
        })}
      </div>

      {preview.withErrors > 0 ? (
        <ErrorList messages={['Hay filas con errores. Corrígelas en tu archivo y vuelve a subirlo: no se guardará nada mientras haya errores.']} />
      ) : !preview.canImport ? (
        <p className="text-sm text-fg-muted">No hay productos para crear ni actualizar.</p>
      ) : null}

      <div className="relative max-h-[45vh] overflow-auto rounded-xl">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-page">
            <tr className="text-left text-xs font-semibold text-fg-muted">
              <th className="h-10 w-14 border-b border-rule px-3">Fila</th>
              <th className="h-10 border-b border-rule px-3">Código</th>
              <th className="h-10 border-b border-rule px-3">Nombre</th>
              <th className="h-10 border-b border-rule px-3">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, MAX_ROWS_SHOWN).map((r) => (
              <tr key={r.rowNumber} className="align-top even:bg-stripe">
                <td className="num px-3 py-3 text-fg-muted">{r.rowNumber}</td>
                <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-fg-muted">{r.code ?? '—'}</td>
                <td className="px-3 py-3">{r.name ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <Pill tone={r.action ? tones[r.action] : 'neutral'}>{r.actionDescription}</Pill>
                  {r.errors.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-0.5 text-sm text-bad">
                      {r.errors.map((e) => (
                        <li key={e} className="flex gap-1.5">
                          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.changes.length > 0 && (
                    <ul className="mt-1.5 text-sm text-fg-muted">
                      {/* En un producto nuevo no hay valor anterior: se muestra solo el que se va a crear. */}
                      {r.changes.map((c) => (
                        <li key={c.field}>
                          {c.field}:{' '}
                          {c.from != null && (
                            <>
                              <s className="text-disabled">{c.from}</s> →{' '}
                            </>
                          )}
                          <span className="font-medium text-fg">{c.to}</span>
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
      <p className="num text-xs text-fg-muted">
        {rows.length > MAX_ROWS_SHOWN
          ? `Se muestran las primeras ${MAX_ROWS_SHOWN} filas de ${formatInt(rows.length)}.`
          : `${formatInt(rows.length)} ${rows.length === 1 ? 'fila' : 'filas'}`}
      </p>
    </div>
  )
}
