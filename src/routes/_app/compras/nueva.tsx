import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import {
  currenciesQuery,
  igvAffectationsQuery,
  invoicePriceTypesQuery,
  storedExchangeRateQuery,
  taxDocumentTypesQuery,
  unitsOfMeasureQuery,
  useExchangeRate,
  type ExchangeRate,
} from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { companiesQuery } from '@/api/companies'
import type { PartnerRow } from '@/api/partners'
import { searchProducts, type ProductRow } from '@/api/products'
import { purchasePreviewQuery, useCreatePurchase } from '@/api/purchases'
import { Button } from '@/components/ui/button'
import { Field, Input, NumberInput, Select } from '@/components/ui/field'
import { Card, ErrorList, PageHeader } from '@/components/ui/misc'
import { SearchSelect } from '@/components/ui/search-select'
import { toast } from '@/components/ui/toast'
import { SupplierField, type NewSupplier } from '@/features/purchases/supplier-field'
import { Totals } from '@/features/purchases/totals'
import { formatAmount, formatDecimal, formatMoney, todayIso } from '@/lib/format'
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
  /** Producto que todavía no existe: la API lo registra junto con la compra. Va en vez de `product`. */
  newProduct: { code: string; name: string; supplierCode: string } | null
  invoiceIgvAffectation: string
  invoiceUnitOfMeasure: string
  invoiceQuantity: string
  invoiceAmount: string
  conversionFactor: string
}

interface Values {
  companyId: string
  supplier: PartnerRow | null
  newSupplier: NewSupplier | null
  taxDocumentType: string
  serie: string
  number: string
  issueDate: string
  currency: string
  exchangeRate: string
  invoicePriceType: string
  lines: LineValues[]
}

const emptyLine: LineValues = { product: null, newProduct: null,invoiceIgvAffectation: '', invoiceUnitOfMeasure: '', invoiceQuantity: '', invoiceAmount: '', conversionFactor: '' }

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
      newSupplier: null,
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

  /** Unidades fijas que trae la unidad, según el catálogo de la API (Unidad 1, Docena 12); null si las dice la factura (Caja). */
  const fixedFactor = (unit: string) => units.data?.find((u) => u.code === unit)?.fixedConversionFactor ?? null
  /** Las unidades por caja se piden solo si la unidad de la línea no las trae fijas. */
  const asksUnitsPer = (unit: string | undefined) => !!unit && fixedFactor(unit) == null
  // Con una unidad fija, su cantidad se pone sola y no se muestra; con una variable (Caja) el campo queda vacío para
  // que se escriba lo que trae esta factura.
  const applyUnit = (index: number, unit: string) => {
    const f = fixedFactor(unit)
    form.setValue(`lines.${index}.conversionFactor`, f != null ? String(f) : '')
  }

  // Vista previa: la API calcula montos y totales mientras se llena el formulario.
  const watched = useWatch({ control: form.control })
  const supplier = useWatch({ control: form.control, name: 'supplier' })
  const newSupplier = useWatch({ control: form.control, name: 'newSupplier' })
  const previewInput = useMemo<Schemas['PreviewPurchaseRequest']>(
    () => ({
      invoicePriceType: orNull<Schemas['InvoicePriceType']>(watched.invoicePriceType),
      lines: (watched.lines ?? []).map((l) => ({
        invoiceIgvAffectation: orNull<Schemas['IgvAffectation']>(l?.invoiceIgvAffectation),
        invoiceUnitOfMeasureCode: l?.invoiceUnitOfMeasure || null,
        invoiceQuantity: parseNumberInput(l?.invoiceQuantity),
        invoiceAmount: parseNumberInput(l?.invoiceAmount),
        conversionFactor: parseNumberInput(l?.conversionFactor),
      })),
    }),
    [watched],
  )
  const preview = useQuery(purchasePreviewQuery(useDebounced(previewInput, 300)))
  const money = (v: number) => formatMoney(v, watched.currency || 'PEN')
  const showUnitsPer = (watched.lines ?? []).some((l) => asksUnitsPer(l?.invoiceUnitOfMeasure))
  /** Número de la otra línea que ya tiene ese producto, o 0 si ninguna. */
  const lineOf = (productId: string, except: number) => (watched.lines ?? []).findIndex((l, i) => i !== except && l?.product?.id === productId) + 1
  const needsExchangeRate = currencies.data?.find((c) => c.currency === watched.currency)?.requiresExchangeRate ?? false
  // Al volver a una moneda sin tipo de cambio, lo que se había escrito se borra para no enviarlo.
  useEffect(() => {
    if (!needsExchangeRate) form.setValue('exchangeRate', '')
  }, [needsExchangeRate, form])

  // Tipo de cambio de SUNAT para la fecha de emisión.
  // - Si la API ya lo tiene guardado, se llena solo al elegir la moneda o la fecha (leer lo guardado no gasta consultas).
  // - Si no, queda vacío y el usuario lo pide con el botón: esa consulta sí cuenta en el cupo del servicio.
  // - Al cambiar la moneda o la fecha, el que vino de SUNAT ya no corresponde y se quita; el escrito a mano se
  //   respeta, con un aviso para revisarlo.
  const rate = useExchangeRate()
  const canLookupRate = currencies.data?.find((c) => c.currency === watched.currency)?.supportsExchangeRateLookup ?? false
  const storedRate = useQuery({ ...storedExchangeRateQuery(watched.currency, watched.issueDate), enabled: canLookupRate && !!watched.issueDate })
  // Lo último que llenó SUNAT (valor y explicación), para saber si lo que hay en el campo sigue siendo eso.
  const [sunatRate, setSunatRate] = useState<{ value: number; description: string } | null>(null)
  const [reviewRate, setReviewRate] = useState(false)
  const rateIsFromSunat = sunatRate != null && parseNumberInput(watched.exchangeRate) === sunatRate.value
  const applyRate = (r: ExchangeRate) => {
    form.setValue('exchangeRate', String(r.rate))
    setSunatRate({ value: r.rate, description: r.description })
    setReviewRate(false)
  }
  useEffect(() => {
    rate.reset()
    const current = form.getValues('exchangeRate')
    if (sunatRate && parseNumberInput(current) === sunatRate.value) form.setValue('exchangeRate', '')
    else if (current) setReviewRate(true)
    setSunatRate(null)
  }, [watched.currency, watched.issueDate]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (storedRate.data && !form.getValues('exchangeRate')) applyRate(storedRate.data)
  }, [storedRate.data]) // eslint-disable-line react-hooks/exhaustive-deps
  const fetchRate = () =>
    rate.mutate({ currency: watched.currency as NonNullable<Schemas['Currency']>, date: watched.issueDate ?? '' }, { onSuccess: applyRate })
  const rateHint = rateIsFromSunat
    ? sunatRate.description
    : reviewRate && watched.exchangeRate
      ? 'Cambiaste la moneda o la fecha de emisión. Revisa que el tipo de cambio corresponda.'
      : canLookupRate
        ? 'Presiona SUNAT para traer el de la fecha de emisión.'
        : undefined
  const amountLabel = priceTypes.data?.find((p) => p.invoicePriceType === watched.invoicePriceType)?.description ?? 'Monto unitario'

  const onSubmit = form.handleSubmit((v) =>
    create.mutate(
      {
        companyId: v.companyId || null,
        supplierId: v.newSupplier ? null : (v.supplier?.id ?? null),
        newSupplier: v.newSupplier,
        taxDocumentType: orNull<Schemas['TaxDocumentType']>(v.taxDocumentType),
        serie: v.serie,
        number: v.number,
        issueDate: v.issueDate || null,
        currency: orNull<Schemas['Currency']>(v.currency),
        exchangeRate: parseNumberInput(v.exchangeRate),
        invoicePriceType: orNull<Schemas['InvoicePriceType']>(v.invoicePriceType),
        lines: v.lines.map((l) => ({
          productId: l.newProduct ? null : (l.product?.id ?? null),
          newProduct: l.newProduct
            ? { code: l.newProduct.code, name: l.newProduct.name, supplierCode: l.newProduct.supplierCode || null }
            : null,
          invoiceIgvAffectation: orNull<Schemas['IgvAffectation']>(l.invoiceIgvAffectation),
          invoiceUnitOfMeasureCode: l.invoiceUnitOfMeasure || null,
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <Link to="/compras" className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" />
          Compras
        </Link>
        <PageHeader title="Nueva compra" description="Registra la factura o boleta del proveedor. Al guardarla, la mercadería entra al stock de la empresa." />
        <ErrorList messages={create.isError ? errorMessages(create.error) : []} />
      </div>

      {/* Cada bloque en su tarjeta, en el orden en que se lee una factura: de quién es, qué documento es y qué trae. */}
      <Card title="Proveedor">
        <SupplierField
          aria-label="Proveedor"
          supplier={supplier}
          newSupplier={newSupplier}
          // Uno u otro: el registrado o el nuevo, que la API registra junto con la compra.
          onSupplier={(s) => {
            form.setValue('supplier', s)
            form.setValue('newSupplier', null)
          }}
          onNewSupplier={(s) => {
            form.setValue('newSupplier', s)
            form.setValue('supplier', null)
          }}
        />
      </Card>

      <Card title="Comprobante">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tipo de comprobante">
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

        <Field label="Empresa que compra">
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
        {/* Solo aplica a las monedas que lo piden (lo dice el catálogo de la API): en soles queda bloqueado y vacío. */}
        <Field
          label="Tipo de cambio"
          error={rate.isError ? errorMessages(rate.error)[0] : undefined}
          hint={rateHint}
        >
          {(a) => (
            <div className="flex gap-2">
              {/* El campo ocupa todo el ancho que deja el botón (o toda la celda, si no hay botón). */}
              <div className="min-w-0 flex-1">
                <NumberInput {...a} disabled={!needsExchangeRate} placeholder={needsExchangeRate ? '0.000' : 'No aplica'} {...form.register('exchangeRate', { onChange: () => setReviewRate(false) })} />
              </div>
              {/* La consulta es a pedido, como la de RUC: cada una cuenta en el cupo del servicio. */}
              {canLookupRate && (
                <Button onClick={fetchRate} loading={rate.isPending} title="Trae el tipo de cambio venta de SUNAT para la fecha de emisión">
                  <Search />
                  SUNAT
                </Button>
              )}
            </div>
          )}
        </Field>
        <Field label="Montos de la factura en">
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
      </Card>

      <Card title="Productos">
        <div className="overflow-x-auto">
          {/* Ancho mínimo: los campos de cada línea no se encogen; en pantallas angostas la tabla se desplaza. */}
          <table className="w-full min-w-[1060px] border-collapse text-base">
            <thead>
              <tr className="text-left text-xs text-faint">
                <th className="w-[24%] border-b border-line py-2 pr-3 font-normal">Producto</th>
                <th className="border-b border-line px-2 py-2 font-normal">Afectación</th>
                <th className="border-b border-line px-2 py-2 font-normal">Unidad</th>
                <th className="border-b border-line px-2 py-2 text-right font-normal">Cantidad</th>
                <th className="border-b border-line px-2 py-2 text-right font-normal">{amountLabel}</th>
                {/* La columna aparece solo si alguna línea se compra por caja (o por otra unidad sin cantidad fija). */}
                {showUnitsPer && (
                  <th className="border-b border-line px-2 py-2 text-right font-normal" title="Cuántas unidades trae cada caja de esta factura">
                    Unidades por caja
                  </th>
                )}
                <th className="border-b border-line px-2 py-2 text-right font-normal" title="Monto de la línea sin IGV">
                  Subtotal
                </th>
                <th className="border-b border-line px-2 py-2 text-right font-normal">IGV</th>
                <th className="border-b border-line px-2 py-2 text-right font-normal">Total</th>
                <th className="w-8 border-b border-line" />
              </tr>
            </thead>
            <tbody>
              {lines.fields.map((field, i) => {
                const result = preview.data?.lines[i]
                const unit = watched.lines?.[i]?.invoiceUnitOfMeasure ?? ''
                const unitName = units.data?.find((u) => u.code === unit)?.name.toLowerCase() ?? 'caja'
                return (
                  <tr key={field.id} className="border-b border-line align-top">
                    <td className="py-2 pr-3">
                      {/* Producto nuevo: solo se escribe el nombre (el código ya vino de lo buscado). La unidad y la
                          afectación salen de la línea, y la API lo registra junto con la compra. */}
                      {watched.lines?.[i]?.newProduct ? (
                        <div className="flex flex-col gap-1.5">
                          <Input autoFocus aria-label={`Nombre del producto nuevo de la línea ${i + 1}`} placeholder="Nombre del producto nuevo" {...form.register(`lines.${i}.newProduct.name`)} />
                          <div className="flex items-center gap-2">
                            <Input
                              aria-label="Código interno del producto nuevo"
                              title="Código interno. Por defecto, el mismo de la factura; cámbialo si usas otro."
                              className="h-8 min-w-0 flex-1 font-mono text-sm"
                              {...form.register(`lines.${i}.newProduct.code`)}
                            />
                            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">Nuevo</span>
                            <button
                              type="button"
                              onClick={() => form.setValue(`lines.${i}.newProduct`, null)}
                              className="shrink-0 text-xs text-muted underline hover:text-ink"
                            >
                              Buscar otro
                            </button>
                          </div>
                          <p className="text-xs text-faint">
                            Se registrará al guardar la compra, con el código {watched.lines?.[i]?.newProduct?.supplierCode} de la factura para este proveedor.
                          </p>
                        </div>
                      ) : (
                      <Controller
                        control={form.control}
                        name={`lines.${i}.product`}
                        render={({ field: f }) => (
                          <SearchSelect
                            createOption={{
                              label: (term) => `Crear producto nuevo con código ${term.toUpperCase()}`,
                              onSelect: (term) => {
                                f.onChange(null)
                                form.setValue(`lines.${i}.newProduct`, { code: term.toUpperCase(), name: '', supplierCode: term.toUpperCase() })
                              },
                            }}
                            value={f.value}
                            onChange={(p) => {
                              f.onChange(p)
                              // Se proponen la afectación y la unidad del producto; el usuario puede cambiarlas.
                              if (p) {
                                form.setValue(`lines.${i}.invoiceIgvAffectation`, p.igvAffectation ?? '')
                                form.setValue(`lines.${i}.invoiceUnitOfMeasure`, p.unitOfMeasureCode)
                                applyUnit(i, p.unitOfMeasureCode)
                              }
                            }}
                            queryKey="products"
                            // Con el proveedor elegido, cada producto trae el código de ese proveedor (el de su factura).
                            scope={watched.supplier?.id}
                            fetchItems={(term) => searchProducts(term, watched.supplier?.id)}
                            itemKey={(p) => p.id}
                            itemLabel={(p) => `${p.code} · ${p.name}`}
                            // Un producto va en una sola línea (la API también lo exige): el que ya está en otra se ve, pero no se elige.
                            isItemDisabled={(p) => lineOf(p.id, i) > 0}
                            renderItem={(p) => (
                              <span>
                                <span className="mr-2 font-mono text-xs text-faint">{p.code}</span>
                                {p.name}
                                {lineOf(p.id, i) > 0 ? (
                                  <span className="block text-xs text-bad">Ya está en la línea {lineOf(p.id, i)}. Cambia ahí la cantidad.</span>
                                ) : p.supplierCode ? (
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
                      )}
                      {result?.error && <p className="mt-1.5 text-sm text-bad">{result.error}</p>}
                    </td>
                    <td className="px-2 py-2">
                      {/* Nombre corto en la tabla ("Gravado"); el completo de SUNAT aparece al pasar el mouse. */}
                      <Select
                        aria-label="Afectación al IGV"
                        className="min-w-28"
                        title={igv.data?.find((o) => o.igvAffectation === watched.lines?.[i]?.invoiceIgvAffectation)?.description}
                        {...form.register(`lines.${i}.invoiceIgvAffectation`)}
                      >
                        <option value="">—</option>
                        {igv.data?.map((o) => (
                          <option key={o.igvAffectation} value={o.igvAffectation ?? ''}>
                            {o.shortDescription}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Select aria-label="Unidad de medida" className="min-w-24" {...form.register(`lines.${i}.invoiceUnitOfMeasure`, { onChange: (e) => applyUnit(i, e.target.value) })}>
                        <option value="">—</option>
                        {units.data?.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <NumberInput aria-label="Cantidad" className="w-24 min-w-24 text-right" {...form.register(`lines.${i}.invoiceQuantity`)} />
                    </td>
                    <td className="px-2 py-2">
                      <NumberInput aria-label={amountLabel} className="w-28 min-w-28 text-right" minDecimals={2} {...form.register(`lines.${i}.invoiceAmount`)} />
                    </td>
                    {showUnitsPer && (
                      <td className="px-2 py-2">
                        {asksUnitsPer(unit) && (
                          <NumberInput
                            aria-label={`Unidades por ${unitName}`}
                            className="w-24 min-w-24 text-right"
                            title={`¿Cuántas unidades trae cada ${unitName} de esta factura?`}
                            {...form.register(`lines.${i}.conversionFactor`)}
                          />
                        )}
                      </td>
                    )}
                    {/* Subtotal, IGV y total de la línea, como en la factura. Sin símbolo: la moneda está en el comprobante y en los totales. */}
                    <td className="num px-2 py-2 pt-4 text-right whitespace-nowrap text-muted">
                      {result?.baseAmount != null ? formatAmount(result.baseAmount) : <span className="text-faint">—</span>}
                    </td>
                    <td className="num px-2 py-2 pt-4 text-right whitespace-nowrap text-muted">
                      {result?.igvAmount != null ? formatAmount(result.igvAmount) : <span className="text-faint">—</span>}
                    </td>
                    <td className="num px-2 py-2 pt-4 text-right whitespace-nowrap">
                      {result?.total != null ? formatAmount(result.total) : <span className="text-faint">—</span>}
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
        {/* Los totales cierran la tabla, abajo a la derecha, como en una factura. */}
        <div className="border-t border-line pt-4">
          <Totals base={money(preview.data?.totalBaseAmount ?? 0)} igv={money(preview.data?.totalIgvAmount ?? 0)} total={money(preview.data?.total ?? 0)} />
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={() => navigate({ to: '/compras' })}>Cancelar</Button>
        <Button variant="primary" type="submit" loading={create.isPending}>
          Registrar compra
        </Button>
      </div>
    </form>
  )
}
