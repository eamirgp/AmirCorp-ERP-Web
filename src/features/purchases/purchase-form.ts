import type { Schemas } from '@/api/client'
import type { PartnerRow } from '@/api/partners'
import type { ProductRow } from '@/api/products'
import { parseNumberInput } from '@/lib/number-input'
import type { NewProduct } from './new-product-cell'
import type { NewSupplier } from './supplier-field'

// El formulario de "Nueva compra" guarda exactamente lo que se escribe. La API valida y calcula todo.

export interface PurchaseLineValues {
  product: ProductRow | null
  /** Producto que todavía no existe: la API lo registra junto con la compra. Va en vez de `product`. */
  newProduct: NewProduct | null
  /** Con un producto existente: el código con que lo vende el proveedor de esta compra, para enlazarlo. */
  supplierCode: string
  invoiceIgvAffectation: string
  invoiceUnitOfMeasure: string
  invoiceQuantity: string
  invoiceAmount: string
  conversionFactor: string
}

export interface PurchaseFormValues {
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
  lines: PurchaseLineValues[]
}

export const emptyLine: PurchaseLineValues = {
  product: null,
  newProduct: null,
  supplierCode: '',
  invoiceIgvAffectation: '',
  invoiceUnitOfMeasure: '',
  invoiceQuantity: '',
  invoiceAmount: '',
  conversionFactor: '',
}

/** Texto → valor para el contrato de la API; si está vacío va null y la API responde el mensaje. */
export const orNull = <T>(value: string | undefined) => (value ? (value as T) : null)

type Units = Schemas['ListUnitsOfMeasureResponseDto'][] | undefined

/**
 * Las unidades por caja se piden solo si la unidad de la línea no las trae fijas (Unidad 1, Docena 12, según el
 * catálogo de la API). Con una variable (Caja), las dice la factura.
 */
export const asksUnitsPer = (units: Units, unit: string | undefined) =>
  !!unit && (units?.find((u) => u.code === unit)?.fixedConversionFactor ?? null) == null

/** Las unidades por caja que se envían: solo si la unidad las pide; con una fija no se envía nada (las pone la API). */
export const unitsPerFor = (units: Units, line: { invoiceUnitOfMeasure?: string; conversionFactor?: string } | undefined) =>
  asksUnitsPer(units, line?.invoiceUnitOfMeasure) ? parseNumberInput(line?.conversionFactor) : null
