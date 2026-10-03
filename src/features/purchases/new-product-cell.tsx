import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { findProductByCode, searchProducts, type ProductRow } from '@/api/products'
import { Input } from '@/components/ui/field'

/** Producto que todavía no existe: la API lo registra junto con la compra. */
export interface NewProduct {
  code: string
  name: string
  supplierCode: string
}

/**
 * Producto nuevo en una línea de compra. Se escribe el nombre; el código interno viene propuesto con el de la factura
 * y se puede cambiar. El código del proveedor (lo que se buscó) se guarda aparte, ligado a ese proveedor, así que puede
 * coincidir con el código interno de otro producto. Si el código interno ya lo usa otro producto, se avisa al momento
 * (la API también lo rechaza al registrar).
 */
export function NewProductCell({
  lineNumber,
  supplierId,
  value,
  onChange,
  onCancel,
  onPickExisting,
  isInOtherLine,
}: {
  lineNumber: number
  /** Proveedor de la compra, para mostrar si un parecido ya tiene un código de ese proveedor. */
  supplierId?: string
  value: NewProduct
  onChange: (value: NewProduct) => void
  onCancel: () => void
  /** "Es este": usar un producto existente en vez de crear uno nuevo. */
  onPickExisting: (product: ProductRow) => void
  /** Si ese producto ya está en otra línea de la compra (no se puede elegir dos veces). */
  isInOtherLine: (productId: string) => boolean
}) {
  // ¿Es alguno de estos? Mientras se escribe el nombre se buscan productos parecidos, para no crear un duplicado de
  // uno que ya existe con el código de otro proveedor.
  const [name, setName] = useState(value.name.trim())
  useEffect(() => {
    const t = setTimeout(() => setName(value.name.trim()), 400)
    return () => clearTimeout(t)
  }, [value.name])
  const similar = useQuery({
    queryKey: ['products', 'similar', supplierId ?? '', name],
    queryFn: () => searchProducts(name, supplierId),
    enabled: name.length >= 3,
  })
  const candidates = (similar.data ?? []).slice(0, 5)

  // Se revisa un momento después de dejar de escribir el código.
  const [code, setCode] = useState(value.code.trim())
  useEffect(() => {
    const t = setTimeout(() => setCode(value.code.trim()), 400)
    return () => clearTimeout(t)
  }, [value.code])
  const owner = useQuery({
    queryKey: ['products', 'by-code', code.toUpperCase()],
    queryFn: () => findProductByCode(code),
    enabled: code.length > 0,
  })
  const taken = code === value.code.trim() && owner.data ? owner.data : null

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        autoFocus
        aria-label={`Nombre del producto nuevo de la línea ${lineNumber}`}
        placeholder="Nombre del producto nuevo"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      {candidates.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-line bg-surface-2 px-2.5 py-2">
          <p className="text-xs font-medium">¿Es alguno de estos? Así no se crea un producto repetido.</p>
          {candidates.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="mr-1.5 font-mono text-xs text-faint">{p.code}</span>
                {p.name}
              </span>
              {isInOtherLine(p.id) ? (
                <span className="shrink-0 text-xs text-faint">Ya está en otra línea</span>
              ) : (
                <button type="button" onClick={() => onPickExisting(p)} className="shrink-0 rounded border border-line-strong px-2 py-0.5 text-xs font-medium hover:bg-surface">
                  Es este
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-xs text-muted" htmlFor={`new-product-code-${lineNumber}`}>
          Código interno
        </label>
        <Input
          id={`new-product-code-${lineNumber}`}
          aria-invalid={!!taken}
          className="h-8 min-w-0 flex-1 font-mono text-sm"
          value={value.code}
          onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })}
        />
        <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">Nuevo</span>
      </div>
      {taken && (
        <p role="alert" className="text-xs text-bad">
          {taken.code} ya es el código interno de «{taken.name}»{taken.isActive ? '' : ' (desactivado)'}. Escribe otro código interno para este producto.
        </p>
      )}
      <p className="text-xs text-faint">
        Código del proveedor: <span className="font-mono text-muted">{value.supplierCode}</span>. Se registrará al guardar la compra.{' '}
        <button type="button" onClick={onCancel} className="text-muted underline hover:text-ink">
          Buscar otro producto
        </button>
      </p>
    </div>
  )
}
