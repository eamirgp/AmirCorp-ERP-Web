import { useState } from 'react'
import { searchProducts, type ProductRow } from '@/api/products'
import { SearchSelect } from '@/components/ui/search-select'
import { NewProductCell, type NewProduct } from './new-product-cell'

/**
 * Producto de una línea de compra. Se escribe el código de la factura, el código interno o el nombre:
 * - Si el código ya está enlazado a un producto de este proveedor, aparece primero y se elige.
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

  if (linking)
    return (
      <div className="flex flex-col gap-1.5">
        <SearchSelect<ProductRow>
          autoFocus
          aria-label={`Producto al que se enlaza el código ${linking}`}
          value={null}
          onChange={(p) => {
            if (!p) return
            setLinking(null)
            onChoose(p, linking)
          }}
          queryKey="products"
          scope={supplierId}
          fetchItems={(term) => searchProducts(term, supplierId)}
          itemKey={(p) => p.id}
          itemLabel={(p) => `${p.code} · ${p.name}`}
          // No se puede elegir el que ya está en otra línea, ni el que ya tiene otro código de este proveedor (eso se
          // corrige en Productos).
          isItemDisabled={(p) => otherLineOf(p.id) > 0 || (!!p.supplierCode && p.supplierCode !== linking)}
          renderItem={(p) => (
            <span>
              <span className="mr-2 font-mono text-xs text-faint">{p.code}</span>
              {p.name}
              {otherLineOf(p.id) > 0 ? (
                <span className="block text-xs text-bad">Ya está en la línea {otherLineOf(p.id)}.</span>
              ) : (
                p.supplierCode &&
                p.supplierCode !== linking && (
                  <span className="block text-xs text-faint">
                    Ya tiene el código <span className="font-mono">{p.supplierCode}</span> de este proveedor. Si cambió, corrígelo en Productos.
                  </span>
                )
              )}
            </span>
          )}
          emptyText={() => 'Ningún producto coincide. Prueba con otra palabra del nombre.'}
          placeholder="Busca tu producto por nombre o código interno"
        />
        <p className="text-xs text-faint">
          Se enlazará el código <span className="font-mono text-muted">{linking}</span> de {supplierName}.{' '}
          <button type="button" onClick={() => setLinking(null)} className="text-muted underline hover:text-ink">
            Cancelar
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
        // Con el proveedor elegido, cada producto trae el código de ese proveedor (el de su factura).
        scope={supplierId}
        fetchItems={(term) => searchProducts(term, supplierId)}
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
          const code = term.toUpperCase()
          if (items.some((p) => p.supplierCode === code)) return []
          return [
            {
              key: 'link',
              label: (
                <>
                  Enlazar <span className="font-mono">{code}</span> a un producto que ya tengo
                </>
              ),
              onSelect: () => setLinking(code),
            },
            {
              key: 'new',
              label: (
                <>
                  Crear producto nuevo con código <span className="font-mono">{code}</span>
                </>
              ),
              onSelect: () => onNewProduct({ code, name: '', supplierCode: code }),
            },
          ]
        }}
        emptyText={() => 'Ningún producto tiene ese código o nombre.'}
        placeholder={supplierName ? 'Código de la factura, código interno o nombre' : 'Elige primero el proveedor'}
      />
      {product && linkCode && (
        <p className="text-xs text-faint">
          El código <span className="font-mono text-muted">{linkCode}</span> de {supplierName} se enlazará a este producto al registrar la compra.{' '}
          <button type="button" onClick={onClear} className="text-muted underline hover:text-ink">
            Cambiar
          </button>
        </p>
      )}
    </div>
  )
}
