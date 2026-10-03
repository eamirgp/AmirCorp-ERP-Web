import { useQuery } from '@tanstack/react-query'
import { findProductByCode } from '@/api/products'
import { Input } from '@/components/ui/field'
import { useDebounced } from '@/lib/use-debounced'

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
  value,
  onChange,
  onCancel,
}: {
  lineNumber: number
  value: NewProduct
  onChange: (value: NewProduct) => void
  onCancel: () => void
}) {
  // Se revisa un momento después de dejar de escribir el código.
  const code = useDebounced(value.code.trim(), 400)
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
