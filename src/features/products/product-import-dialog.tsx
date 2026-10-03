import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessages } from '@/api/client'
import { previewProductImport, useImportProducts, type ProductImportPreview } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { ReviewStep, UploadStep } from '@/features/products/product-import-steps'
import { countLabel } from '@/lib/filters'
import { formatInt } from '@/lib/format'

type Step = 'upload' | 'review' | 'done'

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
