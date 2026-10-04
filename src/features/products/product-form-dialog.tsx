import { useQuery } from '@tanstack/react-query'
import { PlusCircle, X } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { igvAffectationsQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { searchSuppliers } from '@/api/partners'
import { useSaveProduct, type ProductRow } from '@/api/products'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, NumberInput, Select } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { SearchSelect } from '@/components/ui/search-select'
import { toast } from '@/components/ui/toast'
import { formatNumberInput, parseNumberInput } from '@/lib/number-input'

/** Proveedor elegido en una fila de códigos: lo mínimo para mostrarlo y enviarlo (un PartnerRow también sirve). */
interface SupplierOption {
  id: string
  name: string
  documentNumber: string
}

// Sin reglas de negocio aquí: la API valida y devuelve los mensajes que se muestran arriba del formulario.
interface Values {
  code: string
  name: string
  unitOfMeasure: string
  igvAffectation: string
  salePrice: string
  supplierCodes: { supplier: SupplierOption | null; code: string }[]
}

const empty: Values = { code: '', name: '', unitOfMeasure: '', igvAffectation: '', salePrice: '', supplierCodes: [] }

export function ProductFormDialog({ open, product, onClose }: { open: boolean; product: ProductRow | null; onClose: () => void }) {
  const units = useQuery(unitsOfMeasureQuery)
  const igv = useQuery(igvAffectationsQuery)
  const save = useSaveProduct()
  const form = useForm<Values>({ defaultValues: empty })
  const supplierCodes = useFieldArray({ control: form.control, name: 'supplierCodes' })

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
            unitOfMeasure: product.unitOfMeasureCode,
            igvAffectation: product.igvAffectation ?? '',
            salePrice: formatNumberInput(product.salePrice, 2),
            supplierCodes: product.supplierCodes.map((c) => ({
              supplier: { id: c.supplierId, name: c.supplierName, documentNumber: c.supplierDocumentNumber },
              code: c.code,
            })),
          }
        : empty,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product])

  const onSubmit = form.handleSubmit((v) =>
    save.mutate(
      {
        // Al editar se envía la versión que se abrió: si otra persona lo cambió mientras tanto, la API avisa.
        edit: product ? { id: product.id, rowVersion: product.rowVersion } : undefined,
        input: {
          code: v.code,
          name: v.name,
          unitOfMeasureCode: v.unitOfMeasure || null,
          igvAffectation: (v.igvAffectation || null) as Schemas['IgvAffectation'] | null,
          salePrice: parseNumberInput(v.salePrice),
          supplierCodes: v.supplierCodes.map((c) => ({ supplierId: c.supplier?.id ?? null, code: c.code })),
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
      // Más ancho que el estándar: cada código de proveedor muestra el nombre completo del proveedor.
      width="max-w-2xl"
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
          <Field label="Código interno" hint="El de tu empresa. Sale en tus facturas.">
            {(a) => <Input {...a} className="font-mono" autoFocus placeholder="EL-1003" {...form.register('code')} />}
          </Field>
          <Field label="Precio de venta" prefix="S/" hint="En soles, con IGV.">
            {(a) => <NumberInput {...a} minDecimals={2} placeholder="0.00" {...form.register('salePrice')} />}
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
                {/* La lista trae las unidades activas. Si la del producto se desactivó, se muestra igual: el producto la
                    conserva y puede seguir editándose (la API la acepta si no cambia). */}
                {product && units.data && !units.data.some((u) => u.code === product.unitOfMeasureCode) && (
                  <option value={product.unitOfMeasureCode}>{product.unitOfMeasureName}</option>
                )}
                {units.data?.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.name}
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

        {/* Lista agrupada, como Ajustes de Apple: un bloque gris con una fila por proveedor y "Agregar" al final. */}
        <fieldset className="mt-2 flex flex-col gap-2">
          <legend className="sr-only">Códigos de proveedores</legend>
          <div aria-hidden>
            <p className="text-md font-semibold text-fg">Códigos de proveedores</p>
            <p className="mt-0.5 text-sm text-fg-muted">El código con el que cada proveedor vende este producto. Sirve para encontrarlo al registrar sus facturas.</p>
          </div>

          <div className="mt-1 overflow-hidden rounded-2xl bg-muted-fill">
          {supplierCodes.fields.map((field, i) => (
            <div key={field.id} className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] items-start gap-2 border-b border-hairline py-2.5 pr-2 pl-3.5">
              <Controller
                control={form.control}
                name={`supplierCodes.${i}.supplier`}
                render={({ field: f }) => (
                  <SearchSelect
                    value={f.value}
                    onChange={f.onChange}
                    queryKey="partners"
                    fetchItems={searchSuppliers}
                    itemKey={(s) => s.id}
                    itemLabel={(s) => s.name}
                    renderItem={(s) => (
                      <span className="flex items-baseline justify-between gap-3">
                        {s.name}
                        <span className="shrink-0 font-mono text-xs text-fg-muted">{s.documentNumber}</span>
                      </span>
                    )}
                    placeholder="Busca el proveedor"
                    aria-label={`Proveedor de la fila ${i + 1}`}
                  />
                )}
              />
              <Input className="font-mono" placeholder="YH-2045-BK" aria-label={`Código del proveedor, fila ${i + 1}`} {...form.register(`supplierCodes.${i}.code`)} />
              <Button size="icon" variant="ghost" onClick={() => supplierCodes.remove(i)} aria-label={`Quitar el código de la fila ${i + 1}`} title="Quitar">
                <X />
              </Button>
            </div>
          ))}

          <div className="px-2 py-1">
            <Button size="sm" variant="ghost" onClick={() => supplierCodes.append({ supplier: null, code: '' })}>
              <PlusCircle />
              Agregar código de proveedor
            </Button>
          </div>
          </div>
        </fieldset>
      </form>
    </Dialog>
  )
}
