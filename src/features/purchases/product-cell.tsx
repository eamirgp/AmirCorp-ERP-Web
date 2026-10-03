import { useState } from 'react'
import { searchProducts, searchSupplierProducts, type ProductRow } from '@/api/products'
import { SearchSelect } from '@/components/ui/search-select'
import { NewProductCell, type NewProduct } from './new-product-cell'

/**
 * Producto de una línea de compra. La búsqueda es solo entre los productos enlazados a este proveedor (por su código,
 * el código interno o el nombre):
 * - Si está, se elige.
 * - Si no, la lista pregunta qué es: "Enlazar X a un producto que ya tengo" (se busca el producto y el código queda
 *   enlazado al registrar la compra) o "Crear producto nuevo con código X".
 * La decisión "¿lo tengo o es nuevo?" se toma una sola vez, al principio. Sin proveedor no se busca: el código de la
 * factura solo significa algo para ese proveedor.
 */
export function ProductCell({
  lineNumber,
  supplierId,
  supplierName,
  product,
  newProduct,
  linkCode,
  otherLineOf,
  onChoose,
  onClear,
  onNewProduct,
}: {
  lineNumber: number
  /** Proveedor registrado de la compra (sin él, uno nuevo que todavía no tiene códigos). */
  supplierId?: string
  /** Nombre del proveedor elegido o nuevo; null si todavía no hay proveedor. */
  supplierName: string | null
  product: ProductRow | null
  newProduct: NewProduct | null
  /** Código de la factura que se enlazará al producto elegido ('' si ninguno). */
  linkCode: string
  /** Número de la otra línea que ya tiene ese producto, o 0. */
  otherLineOf: (productId: string) => number
  onChoose: (product: ProductRow, linkCode: string) => void
  onClear: () => void
  onNewProduct: (value: NewProduct | null) => void
}) {
  // "Enlazar X a un producto que ya tengo": mientras se busca ese producto, la celda guarda el código a enlazar.
  const [linking, setLinking] = useState<string | null>(null)

  if (newProduct)
    return <NewProductCell lineNumber={lineNumber} value={newProduct} onChange={onNewProduct} onCancel={() => onNewProduct(null)} />

  // Buscador para enlazar un código: en todo el catálogo (la primera búsqueda era solo lo de este proveedor). Se usa al
  // elegir el producto la primera vez y también para cambiarlo, escribiendo de nuevo en el mismo campo.
  const linkSearch = (code: string, value: ProductRow | null, onPick: (p: ProductRow) => void) => (
        <SearchSelect<ProductRow>
          autoFocus={!value}
          aria-label={`Producto al que se enlaza el código ${code}`}
          value={value}
          onChange={(p) => p && onPick(p)}
          queryKey="products"
          // Para enlazar se busca en todo el catálogo (la primera búsqueda era solo lo de este proveedor).
          scope={`all:${supplierId ?? 'nuevo'}:${code}`}
          fetchItems={(term) => searchProducts(term, supplierId, code)}
          itemKey={(p) => p.id}
          itemLabel={(p) => `${p.code} · ${p.name}`}
          // No se puede elegir el que ya está en otra línea, ni el que ya tiene otro código de este proveedor (lo dice
          // la API en linkError; eso se corrige en Productos).
          isItemDisabled={(p) => otherLineOf(p.id) > 0 || !!p.linkError}
          renderItem={(p) => (
            <span>
              <span className="mr-2 font-mono text-xs text-faint">{p.code}</span>
              {p.name}
              {otherLineOf(p.id) > 0 ? (
                <span className="block text-xs text-bad">Ya está en la línea {otherLineOf(p.id)}.</span>
              ) : (
                p.linkError && <span className="block text-xs text-faint">{p.linkError}</span>
              )}
            </span>
          )}
          emptyText={() => 'Ningún producto coincide. Prueba con otra palabra del nombre.'}
          placeholder="Busca tu producto por nombre o código interno"
        />
  )

  if (linking)
    return (
      <div className="flex flex-col gap-1.5">
        {linkSearch(linking, null, (p) => {
          setLinking(null)
          onChoose(p, linking)
        })}
        <p className="text-xs text-faint">
          Se enlazará el código <span className="font-mono text-muted uppercase">{linking}</span> de {supplierName}.{' '}
          <button type="button" onClick={() => setLinking(null)} className="text-muted underline hover:text-ink">
            Cancelar
          </button>
        </p>
      </div>
    )

  // Producto elegido con un código por enlazar: para cambiarlo se escribe en el mismo campo, que busca en todo el
  // catálogo y conserva el código. "Quitar enlace" vuelve al inicio.
  if (product && linkCode)
    return (
      <div className="flex flex-col gap-1.5">
        {linkSearch(linkCode, product, (p) => onChoose(p, linkCode))}
        <p className="text-xs text-faint">
          El código <span className="font-mono text-muted uppercase">{linkCode}</span> de {supplierName} se enlazará a este producto al registrar la compra.{' '}
          <button type="button" onClick={onClear} className="text-muted underline hover:text-ink">
            Quitar enlace
          </button>
        </p>
      </div>
    )

  return (
    <div className="flex flex-col gap-1.5">
      <SearchSelect
        disabled={!supplierName}
        aria-label={`Producto de la línea ${lineNumber}`}
        value={product}
        onChange={(p) => (p ? onChoose(p, '') : onClear())}
        queryKey="products"
        // Solo lo que ya se le compra a este proveedor, con su código. Si no está, se enlaza o se crea.
        scope={`supplier:${supplierId ?? 'nuevo'}`}
        fetchItems={(term) => searchSupplierProducts(term, supplierId)}
        itemKey={(p) => p.id}
        itemLabel={(p) => `${p.code} · ${p.name}`}
        // Un producto va en una sola línea (la API también lo exige): el que ya está en otra se ve, pero no se elige.
        isItemDisabled={(p) => otherLineOf(p.id) > 0}
        renderItem={(p) => (
          <span>
            <span className="mr-2 font-mono text-xs text-faint">{p.code}</span>
            {p.name}
            {otherLineOf(p.id) > 0 ? (
              <span className="block text-xs text-bad">Ya está en la línea {otherLineOf(p.id)}. Cambia ahí la cantidad.</span>
            ) : p.supplierCode ? (
              <span className="block text-xs text-faint">
                Código del proveedor: <span className="font-mono">{p.supplierCode}</span>
              </span>
            ) : (
              p.searchMatch && <span className="block text-xs text-faint">{p.searchMatch}</span>
            )}
          </span>
        )}
        // Si lo escrito no es el código de un producto de este proveedor, se pregunta qué es: uno que ya está
        // registrado (se enlaza el código) o uno nuevo.
        extraOptions={(term, items) => {
          // Tal cual se escribió: la API lo guarda en mayúsculas y aquí solo se muestra así (clase uppercase).
          const code = term.trim()
          // La API dice si lo buscado es justo el código del proveedor de alguno (normalizado como lo guarda).
          if (items.some((p) => p.isSupplierCodeMatch)) return []
          return [
            {
              key: 'link',
              label: (
                <>
                  Enlazar <span className="font-mono uppercase">{code}</span> a un producto que ya tengo
                </>
              ),
              onSelect: () => setLinking(code),
            },
            {
              key: 'new',
              label: (
                <>
                  Crear producto nuevo con código <span className="font-mono uppercase">{code}</span>
                </>
              ),
              onSelect: () => onNewProduct({ code, name: '', supplierCode: code }),
            },
          ]
        }}
        emptyText={(term) =>
          term ? `Ningún producto de ${supplierName} tiene ese código o nombre.` : `Todavía no tienes productos enlazados a ${supplierName}.`
        }
        placeholder={supplierName ? 'Código de la factura, código interno o nombre' : 'Elige primero el proveedor'}
      />
    </div>
  )
}
