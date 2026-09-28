import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { igvAffectationsQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { useSaveProduct, type ProductRow } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'

// Sin reglas de negocio aquí: la API valida y devuelve los mensajes que se muestran arriba del formulario.
interface Values {
  code: string
  name: string
  unitOfMeasure: string
  igvAffectation: string
  salePrice: string
}

const empty: Values = { code: '', name: '', unitOfMeasure: '', igvAffectation: '', salePrice: '' }

/** Convierte lo escrito a número; si no es un número, envía null y la API responde con el mensaje. */
const toNumber = (value: string) => (value.trim() === '' || Number.isNaN(Number(value)) ? null : Number(value))

export function ProductFormDialog({ open, product, onClose }: { open: boolean; product: ProductRow | null; onClose: () => void }) {
  const units = useQuery(unitsOfMeasureQuery)
  const igv = useQuery(igvAffectationsQuery)
  const save = useSaveProduct()
  const form = useForm<Values>({ defaultValues: empty })

  // Carga los datos del producto a editar (o limpia el formulario) cada vez que se abre.
  useEffect(() => {
    if (!open) return
    save.reset()
    form.reset(
      product
        ? {
            code: product.code,
            name: product.name,
            // El contrato marca los enums como opcionales aunque la API siempre los envía.
            unitOfMeasure: product.unitOfMeasure ?? '',
            igvAffectation: product.igvAffectation ?? '',
            salePrice: String(product.salePrice),
          }
        : empty,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product])

  const onSubmit = form.handleSubmit((v) =>
    save.mutate(
      {
        id: product?.id,
        input: {
          code: v.code,
          name: v.name,
          unitOfMeasure: (v.unitOfMeasure || null) as Schemas['UnitOfMeasure'] | null,
          igvAffectation: (v.igvAffectation || null) as Schemas['IgvAffectation'] | null,
          salePrice: toNumber(v.salePrice),
        },
      },
      {
        onSuccess: () => {
          toast.ok(product ? 'Producto actualizado' : 'Producto creado')
          onClose()
        },
      },
    ),
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={product ? 'Editar producto' : 'Nuevo producto'}
      description={product ? `${product.code} · ${product.name}` : 'El producto queda disponible para todas las empresas.'}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="product-form" loading={save.isPending}>
            {product ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={save.isError ? errorMessages(save.error) : []} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Field label="Código">
            {(a) => <Input {...a} className="font-mono" autoFocus placeholder="EL-1003" {...form.register('code')} />}
          </Field>
          <Field label="Precio de venta (S/, con IGV)">
            {(a) => <Input {...a} className="num text-right" inputMode="decimal" placeholder="0.00" {...form.register('salePrice')} />}
          </Field>
        </div>

        <Field label="Nombre">
          {(a) => <Input {...a} placeholder="Power bank 20 000 mAh carga rápida" {...form.register('name')} />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unidad de medida">
            {(a) => (
              <Select {...a} {...form.register('unitOfMeasure')}>
                <option value="">Elige…</option>
                {units.data?.map((u) => (
                  <option key={u.unitOfMeasure} value={u.unitOfMeasure ?? ''}>
                    {u.description}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Afectación al IGV">
            {(a) => (
              <Select {...a} {...form.register('igvAffectation')}>
                <option value="">Elige…</option>
                {igv.data?.map((i) => (
                  <option key={i.igvAffectation} value={i.igvAffectation ?? ''}>
                    {i.description}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </form>
    </Dialog>
  )
}
