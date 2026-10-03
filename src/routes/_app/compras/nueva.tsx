import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useBlocker, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { currenciesQuery, igvAffectationsQuery, invoicePriceTypesQuery, taxDocumentTypesQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages, errorText, type Schemas } from '@/api/client'
import { activeCompaniesQuery } from '@/api/companies'
import { purchasePreviewQuery, useCreatePurchase } from '@/api/purchases'
import { Button } from '@/components/ui/button'
import { Field, Input, NumberInput, Select } from '@/components/ui/field'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Card, ErrorList, PageHeader } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { emptyLine, orNull, unitsPerFor, type PurchaseFormValues } from '@/features/purchases/purchase-form'
import { PurchaseLinesTable } from '@/features/purchases/purchase-lines-table'
import { SupplierField } from '@/features/purchases/supplier-field'
import { useExchangeRateField } from '@/features/purchases/use-exchange-rate-field'
import { useSupplierChange } from '@/features/purchases/use-supplier-change'
import { todayIso } from '@/lib/format'
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
    return qc.ensureQueryData(activeCompaniesQuery)
  },
  component: NewPurchasePage,
})

/**
 * Registrar la factura o boleta de un proveedor, en el orden en que se lee: proveedor, comprobante y productos. Las
 * partes con su propia lógica de pantalla están aparte: el tipo de cambio (`useExchangeRateField`), el cambio de
 * proveedor (`useSupplierChange`) y las líneas (`PurchaseLinesTable`).
 */
function NewPurchasePage() {
  const navigate = useNavigate()
  const companies = useQuery(activeCompaniesQuery)
  const taxDocs = useQuery(taxDocumentTypesQuery)
  const currencies = useQuery(currenciesQuery)
  const priceTypes = useQuery(invoicePriceTypesQuery)
  const units = useQuery(unitsOfMeasureQuery)
  const create = useCreatePurchase()

  // Salir con la compra a medio cargar (enlace, Cancelar, Atrás o cerrar la pestaña) pide confirmación.
  const touched = useRef(false)
  const saved = useRef(false)
  const blocker = useBlocker({
    shouldBlockFn: () => touched.current && !saved.current,
    enableBeforeUnload: () => touched.current && !saved.current,
    withResolver: true,
  })

  const form = useForm<PurchaseFormValues>({
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
    const active = companies.data ?? []
    if (!form.getValues('companyId') && active.length === 1) form.setValue('companyId', active[0].id)
  }, [companies.data, form])

  const supplierChange = useSupplierChange({
    hasProducts: () => form.getValues('lines').some((l) => l.product || l.newProduct),
    clearProducts: () =>
      form.getValues('lines').forEach((_, i) => {
        form.setValue(`lines.${i}.product`, null)
        form.setValue(`lines.${i}.newProduct`, null)
        form.setValue(`lines.${i}.supplierCode`, '')
      }),
  })

  // Vista previa: la API calcula montos y totales mientras se llena el formulario.
  const watched = useWatch({ control: form.control })
  const supplier = useWatch({ control: form.control, name: 'supplier' })
  const newSupplier = useWatch({ control: form.control, name: 'newSupplier' })
  const previewInput = useMemo<Schemas['PreviewPurchaseRequest']>(
    () => ({
      invoicePriceType: orNull<Schemas['InvoicePriceType']>(watched.invoicePriceType),
      // Solo para que el costo de cada línea salga con su moneda ("costo US$ 5.00 c/u").
      currency: orNull<Schemas['Currency']>(watched.currency),
      lines: (watched.lines ?? []).map((l) => ({
        invoiceIgvAffectation: orNull<Schemas['IgvAffectation']>(l?.invoiceIgvAffectation),
        invoiceUnitOfMeasureCode: l?.invoiceUnitOfMeasure || null,
        invoiceQuantity: parseNumberInput(l?.invoiceQuantity),
        invoiceAmount: parseNumberInput(l?.invoiceAmount),
        conversionFactor: unitsPerFor(units.data, l),
      })),
    }),
    [watched, units.data],
  )
  const preview = useQuery(purchasePreviewQuery(useDebounced(previewInput, 300)))

  const rate = useExchangeRateField({
    currency: watched.currency ?? '',
    issueDate: watched.issueDate ?? '',
    value: watched.exchangeRate ?? '',
    getValue: () => form.getValues('exchangeRate'),
    setValue: (value) => form.setValue('exchangeRate', value),
  })
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
          conversionFactor: unitsPerFor(units.data, l),
          supplierCode: !l.newProduct && l.product && l.supplierCode.trim() ? l.supplierCode.trim() : null,
        })),
      },
      {
        onSuccess: ({ id }) => {
          saved.current = true
          toast.ok('Compra registrada')
          navigate({ to: '/compras/$id', params: { id } })
        },
        onError: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
      },
    ),
  )

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
      // Lo escrito por el usuario (no lo que el sistema llena solo) cuenta para avisar antes de salir sin guardar.
      onInput={() => (touched.current = true)}
      // Enter en un campo no registra la compra: una factura a medio cargar no debe guardarse ni mover el stock.
      // Se registra solo con el botón "Registrar compra".
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault()
      }}
    >
      {blocker.status === 'blocked' && (
        <ConfirmDialog
          open
          title="¿Salir sin registrar la compra?"
          confirmLabel="Salir sin guardar"
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        >
          Lo que escribiste en esta compra se perderá.
        </ConfirmDialog>
      )}
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
          onSupplier={(s) =>
            supplierChange.change(s?.id ?? null, s?.name ?? '', () => {
              form.setValue('supplier', s)
              form.setValue('newSupplier', null)
            })
          }
          onNewSupplier={(s) =>
            supplierChange.change(s ? `ruc:${s.ruc}` : null, s ? s.name || `RUC ${s.ruc}` : '', () => {
              form.setValue('newSupplier', s)
              form.setValue('supplier', null)
            })
          }
        />
        {supplierChange.dialog}
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
                {companies.data?.map((c) => (
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
          <Field label="Tipo de cambio" error={rate.lookup.isError ? errorText(rate.lookup.error) : undefined} hint={rate.hint}>
            {(a) => (
              <div className="flex gap-2">
                {/* El campo ocupa todo el ancho que deja el botón (o toda la celda, si no hay botón). */}
                <div className="min-w-0 flex-1">
                  <NumberInput {...a} disabled={!rate.needed} placeholder={rate.needed ? '0.000' : 'No aplica'} {...form.register('exchangeRate', { onChange: rate.typed })} />
                </div>
                {/* La consulta es a pedido, como la de RUC: cada una cuenta en el cupo del servicio. */}
                {rate.canLookup && (
                  <Button onClick={rate.fetch} loading={rate.lookup.isPending} title="Trae el tipo de cambio venta de SUNAT para la fecha de emisión">
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
        <PurchaseLinesTable
          form={form}
          lines={lines}
          preview={preview}
          currency={watched.currency ?? ''}
          amountLabel={amountLabel}
          supplier={supplier}
          newSupplier={newSupplier}
        />
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
