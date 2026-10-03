import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { errorMessages } from '@/api/client'
import { useRenameUnit, type UnitRow } from '@/api/units'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'

/**
 * Cambiar el nombre corto de una unidad ("Unidad" en vez de "UNIDAD (BIENES)"). El código y el nombre de SUNAT
 * se muestran solo para leer: son los que van en la factura y no se cambian.
 */
export function UnitNameDialog({ unit, onClose }: { unit: UnitRow | null; onClose: () => void }) {
  const rename = useRenameUnit()
  const form = useForm<{ name: string }>({ defaultValues: { name: '' } })

  useEffect(() => {
    if (!unit) return
    rename.reset()
    form.reset({ name: unit.name })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit])

  const onSubmit = form.handleSubmit((v) =>
    rename.mutate(
      { id: unit!.id, name: v.name, rowVersion: unit!.rowVersion },
      {
        onSuccess: () => {
          toast.ok('Nombre actualizado')
          onClose()
        },
      },
    ),
  )

  return (
    <Dialog
      open={unit !== null}
      onOpenChange={(o) => !o && onClose()}
      title="Cambiar nombre"
      description={unit ? `Código SUNAT ${unit.code} · ${unit.sunatName}` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="unit-form" loading={rename.isPending}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="unit-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={rename.isError ? errorMessages(rename.error) : []} />
        <Field label="Nombre en el sistema" hint="Es el que se ve en productos, compras y el Excel. En la factura va el código SUNAT.">
          {(a) => <Input {...a} autoFocus {...form.register('name')} />}
        </Field>
      </form>
    </Dialog>
  )
}
