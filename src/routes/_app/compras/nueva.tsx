import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { currenciesQuery, igvAffectationsQuery, invoicePriceTypesQuery, taxDocumentTypesQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { companiesQuery } from '@/api/companies'
import { searchSuppliers, type PartnerRow } from '@/api/partners'
import { searchProducts, type ProductRow } from '@/api/products'
import { purchasePreviewQuery, useCreatePurchase } from '@/api/purchases'
import { Button } from '@/components/ui/button'
import { Field, Input, NumberInput, Select } from '@/components/ui/field'
import { ErrorList, PageHeader } from '@/components/ui/misc'
import { SearchSelect } from '@/components/ui/search-select'
import { toast } from '@/components/ui/toast'
import { Totals } from '@/features/purchases/totals'
import { formatDecimal, formatMoney, todayIso } from '@/lib/format'
import { parseNumberInput } from '@/lib/number-input'
import { useDebounced } from '@/lib/use-debounced'

export const Route = createFileRoute('/_app/compras/nueva')({
  loader: ({ context }) => {
    const qc = context.queryClient
    void qc.prefetchQuery(taxDocumentTypesQuery)
    void qc.prefetchQuery(currenciesQuery)
    void qc.prefetchQuery(invoicePriceTypesQuery)
    void qc.prefetchQuery(unitsOfMeasureQuery)
    void qc.prefetchQuery(igvAffectationsQuery)
    return qc.ensureQueryData(companiesQuery)
  },
  component: NewPurchasePage,
})

// El formulario guarda exactamente lo que se escribe. La API valida y calcula todo.
interface LineValues {
  product: ProductRow | null
  invoiceIgvAffectation: string
  invoiceUnitOfMeasure: string
  invoiceQuantity: string
  invoiceAmount: string
  conversionFactor: string
}

interface Values {
  companyId: string
  supplier: PartnerRow | null
  taxDocumentType: string
  serie: string
  number: string
  issueDate: string
  currency: string
  exchangeRate: string
  invoicePriceType: string
  lines: LineValues[]
}

const emptyLine: LineValues = { product: null, invoiceIgvAffectation: '', invoiceUnitOfMeasure: '', invoiceQuantity: '', invoiceAmount: '', conversionFactor: '' }

/** Texto → número para el contrato de la API; si no es un número, va null y la API responde con el mensaje. */
const orNull = <T,>(value: string | undefined) => (value ? (value as T) : null)

function NewPurchasePage() {
  const navigate = useNavigate()
  const companies = useQuery(companiesQuery)
  const taxDocs = useQuery(taxDocumentTypesQuery)
  const currencies = useQuery(currenciesQuery)
  const priceTypes = useQuery(invoicePriceTypesQuery)
  const units = useQuery(unitsOfMeasureQuery)
  const igv = useQuery(igvAffectationsQuery)
  const create = useCreatePurchase()

  const form = useForm<Values>({
    defaultValues: {
      companyId: '',
      supplier: null,
      taxDocumentType: '',
      serie: '',
      number: '',
      issueDate: todayIso(),
      currency: 'PEN',
      exchangeRate: '',
      invoicePriceType: '',
      lines: [emptyLine],
    },
  })
  const lines = useFieldArray({ control: form.control, name: 'lines' })

  // Si hay una sola empresa activa, se elige sola.
  useEffect(() => {
    const active = companies.data?.filter((c) => c.isActive) ?? []
    if (!form.getValues('companyId') && active.length === 1) form.setValue('companyId', active[0].id)
  }, [companies.data, form])

  /** Factor de conversión fijo de la unidad, según el catálogo de la API (null si lo define la compra). */
  const fixedFactor = (unit: string) => units.data?.find((u) => u.unitOfMeasure === unit)?.fixedConversionFactor ?? null
  const applyUnit = (index: number, unit: string) => {
    const f = fixedFactor(unit)
    if (f != null) form.setValue(`lines.${index}.conversionFactor`, String(f))
  }

  // Vista previa: la API calcula montos y totales mientras se llena el formulario.
  const watched = useWatch({ control: form.control })
  const previewInput = useMemo<Schemas['PreviewPurchaseRequest']>(
    () => ({
      invoicePriceType: orNull<Schemas['InvoicePriceType']>(watched.invoicePriceType),
      lines: (watched.lines ?? []).map((l) => ({
        invoiceIgvAffectation: orNull<Schemas['IgvAffectation']>(l?.invoiceIgvAffectation),
        invoiceUnitOfMeasure: orNull<Schemas['UnitOfMeasure']>(l?.invoiceUnitOfMeasure),
        invoiceQuantity: parseNumberInput(l?.invoiceQuantity),
        invoiceAmount: parseNumberInput(l?.invoiceAmount),
        conversionFactor: parseNumberInput(l?.conversionFactor),
      })),
    }),
    [watched],
  )
  const preview = useQuery(purchasePreviewQuery(useDebounced(previewInput, 300)))
  const money = (v: number) => formatMoney(v, watched.currency || 'PEN')
  const amountLabel = priceTypes.data?.find((p) => p.invoicePriceType === watched.invoicePriceType)?.description ?? 'Monto unitario'

  const onSubmit = form.handleSubmit((v) =>
    create.mutate(
      {
        companyId: v.companyId || null,
        supplierId: v.supplier?.id ?? null,
        taxDocumentType: orNull<Schemas['TaxDocumentType']>(v.taxDocumentType),
        serie: v.serie,
        number: v.number,
        issueDate: v.issueDate || null,
        currency: orNull<Schemas['Currency']>(v.currency),
        exchangeRate: parseNumberInput(v.exchangeRate),
        invoicePriceType: orNull<Schemas['InvoicePriceType']>(v.invoicePriceType),
        lines: v.lines.map((l) => ({
          productId: l.product?.id ?? null,
          invoiceIgvAffectation: orNull<Schemas['IgvAffectation']>(l.invoiceIgvAffectation),
          invoiceUnitOfMeasure: orNull<Schemas['UnitOfMeasure']>(l.invoiceUnitOfMeasure),
          invoiceQuantity: parseNumberInput(l.invoiceQuantity),
          invoiceAmount: parseNumberInput(l.invoiceAmount),
          conversionFactor: parseNumberInput(l.conversionFactor),
        })),
      },
      {
        onSuccess: ({ id }) => {
          toast.ok('Compra registrada')
          navigate({ to: '/compras/$id', params: { id } })
        },
        onError: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      },
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link to="/compras" className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" />
          Compras
        </Link>
        <PageHeader title="Nueva compra" description="Registra la factura o boleta del proveedor. Al guardarla, la mercadería entra al stock de la empresa." />
        <ErrorList messages={create.isError ? errorMessages(create.error) : []} />
      </div>

      <section className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Empresa">
          {(a) => (
            <Select {...a} {...form.register('companyId')}>
              <option value="">Elige…</option>
              {companies.data
                ?.filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <div className="lg:col-span-3">
          <Field label="Proveedor">
            {(a) => (
              <Controller
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <SearchSelect
                    {...a}
                    value={field.value}
                    onChange={field.onChange}
                    queryKey="partners"
                    fetchItems={searchSuppliers}
                    itemKey={(p) => p.id}
                    itemLabel={(p) => `${p.name} · ${p.documentNumber}`}
                    renderItem={(p) => (
                      <span className="flex items-baseline justify-between gap-3">
                        {p.name}
                        <span className="shrink-0 font-mono text-xs text-faint">
                          {p.identityDocumentTypeDescription} {p.documentNumber}
                        </span>
                      </span>
                    )}
                    placeholder="Busca por RUC o razón social"
                  />
                )}
              />
            )}
          </Field>
        </div>

        <Field label="Comprobante">
          {(a) => (
            <Select {...a} {...form.register('taxDocumentType')}>
              <option value="">Elige…</option>
              {taxDocs.data?.map((t) => (
                <option key={t.taxDocumentType} value={t.taxDocumentType ?? ''}>
                  {t.description}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Serie">{(a) => <Input {...a} className="font-mono" placeholder="F001" {...form.register('serie')} />}</Field>
        <Field label="Número">{(a) => <Input {...a} className="font-mono" inputMode="numeric" {...form.register('number')} />}</Field>
        <Field label="Fecha de emisión">{(a) => <Input {...a} type="date" {...form.register('issueDate')} />}</Field>

        <Field label="Moneda">
          {(a) => (
            <Select {...a} {...form.register('currency')}>
              {currencies.data?.map((c) => (
                <option key={c.currency} value={c.currency ?? ''}>
                  {c.description}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Tipo de cambio">{(a) => <NumberInput {...a} placeholder="0.000" {...form.register('exchangeRate')} />}</Field>
        <div className="sm:col-span-2">
          <Field label="Los montos de la factura están en">
            {(a) => (
              <Select {...a} {...form.register('invoicePriceType')}>
                <option value="">Elige…</option>
                {priceTypes.data?.map((p) => (
                  <option key={p.invoicePriceType} value={p.invoicePriceType ?? ''}>
                    {p.description}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="label-caps">Detalle</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-base">
            <thead>
              <tr className="text-left text-xs text-faint">
                <th className="w-[30%] border-b border-line py-2 pr-3 font-normal">Producto</th>
                <th className="border-b border-line px-2 py-2 font-normal">IGV</th>
                <th className="border-b border-line px-2 py-2 font-normal">Unidad</th>
                <th className="border-b border-line px-2 py-2 text-right font-normal">Cantidad</th>
                <th className="border-b border-line px-2 py-2 text-right font-normal">{amountLabel}</th>
                <th className="border-b border-line px-2 py-2 text-right font-normal" title="Unidades de inventario por cada unidad de la factura">
                  Factor
                </th>
                <th className="border-b border-line px-2 py-2 text-right font-normal">Total</th>
                <th className="w-8 border-b border-line" />
              </tr>
            </thead>
            <tbody>
              {lines.fields.map((field, i) => {
                const result = preview.data?.lines[i]
                const unit = watched.lines?.[i]?.invoiceUnitOfMeasure ?? ''
                const locked = fixedFactor(unit) != null
                return (
                  <tr key={field.id} className="border-b border-line align-top">
                    <td className="py-2 pr-3">
                      <Controller
                        control={form.control}
                        name={`lines.${i}.product`}
                        render={({ field: f }) => (
                          <SearchSelect
                            value={f.value}
                            onChange={(p) => {
                              f.onChange(p)
                              // Se proponen la afectación y la unidad del producto; el usuario puede cambiarlas.
                              if (p) {
                                form.setValue(`lines.${i}.invoiceIgvAffectation`, p.igvAffectation ?? '')
                                form.setValue(`lines.${i}.invoiceUnitOfMeasure`, p.unitOfMeasure ?? '')
                                applyUnit(i, p.unitOfMeasure ?? '')
                              }
                            }}
                            queryKey="products"
                            // Con el proveedor elegido, cada producto trae el código de ese proveedor (el de su factura).
                            scope={watched.supplier?.id}
                            fetchItems={(term) => searchProducts(term, watched.supplier?.id)}
                            itemKey={(p) => p.id}
                            itemLabel={(p) => `${p.code} · ${p.name}`}
                            renderItem={(p) => (
                              <span>
                                <span className="mr-2 font-mono text-xs text-faint">{p.code}</span>
                                {p.name}
                                {p.supplierCode ? (
                                  <span className="block text-xs text-faint">
                                    Código del proveedor: <span className="font-mono">{p.supplierCode}</span>
                                  </span>
                                ) : (
                                  p.searchMatch && <span className="block text-xs text-faint">{p.searchMatch}</span>
                                )}
                              </span>
                            )}
                            placeholder="Busca el producto"
                            aria-label={`Producto de la línea ${i + 1}`}
                          />
                        )}
                      />
                      {result?.error && <p className="mt-1.5 text-sm text-bad">{result.error}</p>}
                    </td>
                    <td className="px-2 py-2">
                      <Select aria-label="Afectación al IGV" className="min-w-28" {...form.register(`lines.${i}.invoiceIgvAffectation`)}>
                        <option value="">—</option>
                        {igv.data?.map((o) => (
                          <option key={o.igvAffectation} value={o.igvAffectation ?? ''}>
                            {o.description}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Select aria-label="Unidad de medida" className="min-w-24" {...form.register(`lines.${i}.invoiceUnitOfMeasure`, { onChange: (e) => applyUnit(i, e.target.value) })}>
                        <option value="">—</option>
                        {units.data?.map((u) => (
                          <option key={u.unitOfMeasure} value={u.unitOfMeasure ?? ''}>
                            {u.description}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <NumberInput aria-label="Cantidad" className="w-24 text-right" {...form.register(`lines.${i}.invoiceQuantity`)} />
                    </td>
                    <td className="px-2 py-2">
                      <NumberInput aria-label={amountLabel} className="w-28 text-right" minDecimals={2} {...form.register(`lines.${i}.invoiceAmount`)} />
                    </td>
                    <td className="px-2 py-2">
                      <NumberInput
                        aria-label="Factor de conversión"
                        className="w-20 text-right read-only:bg-surface-2 read-only:text-muted"
                        readOnly={locked}
                        title={locked ? 'Fijo para esta unidad de medida' : 'Unidades de inventario por cada unidad de la factura'}
                        {...form.register(`lines.${i}.conversionFactor`)}
                      />
                    </td>
                    <td className="num px-2 py-2 pt-4 text-right whitespace-nowrap">
                      {result?.total != null ? money(result.total) : <span className="text-faint">—</span>}
                      {result?.inventoryQuantity != null && result.inventoryUnitCost != null && (
                        <span className="block text-xs text-faint">
                          {formatDecimal(result.inventoryQuantity)} und. a {formatDecimal(result.inventoryUnitCost)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pt-2.5 pl-1">
                      {lines.fields.length > 1 && (
                        <button type="button" onClick={() => lines.remove(i)} className="rounded p-1 text-faint hover:text-bad" aria-label={`Quitar línea ${i + 1}`}>
                          <X className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Button size="sm" variant="ghost" className="w-fit" onClick={() => lines.append(emptyLine)}>
          <Plus />
          Agregar línea
        </Button>
      </section>

      <Totals base={money(preview.data?.totalBaseAmount ?? 0)} igv={money(preview.data?.totalIgvAmount ?? 0)} total={money(preview.data?.total ?? 0)} />

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-5">
        <Button onClick={() => navigate({ to: '/compras' })}>Cancelar</Button>
        <Button variant="primary" type="submit" loading={create.isPending}>
          Registrar compra
        </Button>
      </div>
    </form>
  )
}
