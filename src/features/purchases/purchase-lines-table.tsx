import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useWatch, type UseFieldArrayReturn, type UseFormReturn } from 'react-hook-form'
import { currenciesQuery, igvAffectationsQuery, unitsOfMeasureQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import type { PartnerRow } from '@/api/partners'
import type { ProductRow } from '@/api/products'
import { Button } from '@/components/ui/button'
import { NumberInput, Select } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { formatAmount, formatMoney } from '@/lib/format'
import type { NewProduct } from './new-product-cell'
import { ProductCell } from './product-cell'
import { asksUnitsPer, emptyLine, type PurchaseFormValues } from './purchase-form'
import type { NewSupplier } from './supplier-field'
import { Totals } from './totals'
import { supplierKey } from './use-supplier-change'

/**
 * Las líneas de una compra nueva, como en la factura: producto, afectación, unidad, cantidad y monto, con lo que
 * calcula la API (subtotal, IGV, total y lo que entra al inventario) y los totales al final.
 */
export function PurchaseLinesTable({
  form,
  lines,
  preview,
  currency,
  amountLabel,
  supplier,
  newSupplier,
}: {
  form: UseFormReturn<PurchaseFormValues>
  lines: UseFieldArrayReturn<PurchaseFormValues, 'lines'>
  /** El cálculo de la API para lo escrito (puede ser el anterior mientras llega el nuevo). */
  preview: { data?: Schemas['PreviewPurchaseResponseDto']; isError: boolean; error: unknown }
  currency: string
  /** "Valor unitario" o "Precio unitario", según cómo vienen los montos de la factura. */
  amountLabel: string
  supplier: PartnerRow | null
  newSupplier: NewSupplier | null
}) {
  const units = useQuery(unitsOfMeasureQuery)
  const igv = useQuery(igvAffectationsQuery)
  const watched = useWatch({ control: form.control, name: 'lines' })

  // Al cambiar de unidad, lo escrito ya no corresponde. Con una fija (Unidad, Docena) no se envía nada: la cantidad
  // la pone la API desde su catálogo. Con una variable (Caja) queda vacío para escribir lo que trae esta factura.
  const applyUnit = (index: number) => form.setValue(`lines.${index}.conversionFactor`, '')
  /**
   * Elige un producto existente para la línea: se proponen su afectación y su unidad (si está activa; si no, el campo
   * se vería vacío pero se enviaría), y el código del proveedor que se vaya a enlazar.
   */
  const chooseProduct = (index: number, p: ProductRow, supplierCode: string) => {
    form.setValue(`lines.${index}.product`, p)
    form.setValue(`lines.${index}.supplierCode`, supplierCode)
    form.setValue(`lines.${index}.invoiceIgvAffectation`, p.igvAffectation ?? '')
    const unit = units.data?.some((u) => u.code === p.unitOfMeasureCode) ? p.unitOfMeasureCode : ''
    form.setValue(`lines.${index}.invoiceUnitOfMeasure`, unit)
    applyUnit(index)
  }
  /** Número de la otra línea que ya tiene ese producto, o 0 si ninguna. */
  const lineOf = (productId: string, except: number) => (watched ?? []).findIndex((l, i) => i !== except && l?.product?.id === productId) + 1
  const showUnitsPer = (watched ?? []).some((l) => asksUnitsPer(units.data, l?.invoiceUnitOfMeasure))
  // El símbolo lo envía la API con cada moneda; sin moneda elegida todavía, soles.
  const currencies = useQuery(currenciesQuery)
  const symbol = currencies.data?.find((c) => c.currency === currency)?.symbol ?? 'S/'
  const money = (v: number) => formatMoney(v, symbol)

  return (
    <>
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
              // Mientras llega el cálculo de lo último escrito se ve el anterior: si desde entonces se agregó o quitó
              // una línea, sus resultados ya no corresponden a cada fila y no se muestran.
              const result = preview.data?.lines.length === lines.fields.length ? preview.data.lines[i] : undefined
              const line = watched?.[i]
              const unit = line?.invoiceUnitOfMeasure ?? ''
              const unitName = units.data?.find((u) => u.code === unit)?.name.toLowerCase() ?? 'caja'
              return (
                <tr key={field.id} className="border-b border-line align-top">
                  <td className="py-2 pr-3">
                    <ProductCell
                      // Con otro proveedor la celda empieza de cero (también un enlace que se estaba buscando).
                      key={supplierKey(supplier, newSupplier)}
                      lineNumber={i + 1}
                      supplierId={supplier?.id}
                      // Un proveedor nuevo sin razón social todavía (SUNAT no respondió) ya es un proveedor: se nombra por su RUC.
                      supplierName={supplier?.name ?? (newSupplier ? newSupplier.name.trim() || `RUC ${newSupplier.ruc}` : null)}
                      product={(line?.product as ProductRow | null | undefined) ?? null}
                      newProduct={(line?.newProduct as NewProduct | null | undefined) ?? null}
                      linkCode={line?.supplierCode ?? ''}
                      otherLineOf={(id) => lineOf(id, i)}
                      onChoose={(p, code) => chooseProduct(i, p, code)}
                      onClear={() => {
                        form.setValue(`lines.${i}.product`, null)
                        form.setValue(`lines.${i}.supplierCode`, '')
                      }}
                      // Producto nuevo: la unidad y la afectación salen de la línea, y la API lo registra con la compra.
                      onNewProduct={(v) => {
                        form.setValue(`lines.${i}.newProduct`, v)
                        if (v) {
                          form.setValue(`lines.${i}.product`, null)
                          form.setValue(`lines.${i}.supplierCode`, '')
                        }
                      }}
                    />
                    {result?.error && <p className="mt-1.5 text-sm text-bad">{result.error}</p>}
                  </td>
                  <td className="px-2 py-2">
                    {/* Nombre corto en la tabla ("Gravado"); el completo de SUNAT aparece al pasar el mouse. */}
                    <Select
                      aria-label="Afectación al IGV"
                      className="min-w-28"
                      title={igv.data?.find((o) => o.igvAffectation === line?.invoiceIgvAffectation)?.description}
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
                    <Select aria-label="Unidad de medida" className="min-w-24" {...form.register(`lines.${i}.invoiceUnitOfMeasure`, { onChange: () => applyUnit(i) })}>
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
                      {asksUnitsPer(units.data, unit) && (
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
                    {/* Lo que entra al inventario: unidades y costo de cada una. El IGV no es costo (es crédito fiscal). */}
                    {result?.inventoryDescription && <span className="block text-xs text-faint">{result.inventoryDescription}</span>}
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
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        {/* Si el cálculo falla (sin conexión, error del servidor), se dice; si no, los totales quedarían en 0 sin explicación. */}
        <ErrorList messages={preview.isError ? errorMessages(preview.error) : []} />
        <Totals base={money(preview.data?.totalBaseAmount ?? 0)} igv={money(preview.data?.totalIgvAmount ?? 0)} total={money(preview.data?.total ?? 0)} />
      </div>
    </>
  )
}
