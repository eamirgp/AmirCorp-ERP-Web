import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { igvAffectationsQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { useSaveProduct, type ProductRow } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'

// Mismos límites que Product en el dominio de la API.
const CODE_MAX = 50
const NAME_MAX = 100

const schema = z.object({
  code: z.string().trim().min(1, 'El código es requerido.').max(CODE_MAX, `Máximo ${CODE_MAX} caracteres.`),
  name: z.string().trim().min(1, 'El nombre es requerido.').max(NAME_MAX, `Máximo ${NAME_MAX} caracteres.`),
  unitOfMeasure: z.string().min(1, 'Elige la unidad de medida.'),
  igvAffectation: z.string().min(1, 'Elige la afectación al IGV.'),
  salePrice: z.number({ error: 'Ingresa el precio.' }).min(0, 'El precio no puede ser negativo.'),
})
type Values = z.infer<typeof schema>

const empty: Values = { code: '', name: '', unitOfMeasure: '', igvAffectation: '', salePrice: Number.NaN }

export function ProductFormDialog({ open, product, onClose }: { open: boolean; product: ProductRow | null; onClose: () => void }) {
  const units = useQuery(unitsOfMeasureQuery)
  const igv = useQuery(igvAffectationsQuery)
  const save = useSaveProduct()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty })
  const { errors } = form.formState

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
            salePrice: Number(product.salePrice),
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
          unitOfMeasure: v.unitOfMeasure as Schemas['UnitOfMeasure'],
          igvAffectation: v.igvAffectation as Schemas['IgvAffectation'],
          salePrice: v.salePrice,
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
      description={product ? `${product.code} · ${product.name}` : 'El producto queda disponible para las 3 empresas.'}
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
          <Field label="Código" hint="Se guarda en mayúsculas." error={errors.code?.message}>
            {(a) => <Input {...a} className="font-mono uppercase" autoFocus placeholder="EL-1003" {...form.register('code')} />}
          </Field>
          <Field label="Precio de venta (S/, con IGV)" error={errors.salePrice?.message}>
            {(a) => (
              <Input {...a} className="num text-right" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" {...form.register('salePrice', { valueAsNumber: true })} />
            )}
          </Field>
        </div>

        <Field label="Nombre" error={errors.name?.message}>
          {(a) => <Input {...a} placeholder="Power bank 20 000 mAh carga rápida" {...form.register('name')} />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unidad de medida" error={errors.unitOfMeasure?.message}>
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
          <Field label="Afectación al IGV" error={errors.igvAffectation?.message}>
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
