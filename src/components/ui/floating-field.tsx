import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

/**
 * Campo del estilo Apple (docs/diseno.md), como el de Cuenta de Apple: 56 px de alto y la etiqueta dentro del campo.
 * Vacío, la etiqueta se ve grande, como texto de ejemplo; al hacer clic o al escribir, sube y se achica con una
 * transición suave, y el borde se oscurece con un halo azul. `trailing` es una acción al final del campo ("Mostrar").
 */
export const FloatingField = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> & { label: string; trailing?: ReactNode }>(
  // `className` y `style` van al recuadro (por ejemplo, su animación de entrada); lo demás, al campo.
  function FloatingField({ label, trailing, id, className = '', style, ...props }, ref) {
    const autoId = useId()
    const inputId = id ?? autoId

    return (
      <div
        style={style}
        className={`relative flex h-14 items-center rounded-xl border border-field-line bg-field transition-[border-color,box-shadow] duration-200 ease-apple focus-within:border-fg focus-within:shadow-focus has-[input[aria-invalid=true]]:border-bad ${className}`}
      >
        <div className="relative h-full min-w-0 flex-1">
          {/* El placeholder vacío (" ") permite saber con CSS si el campo tiene texto (:placeholder-shown). */}
          <input
            ref={ref}
            id={inputId}
            placeholder=" "
            className="peer h-full w-full rounded-xl bg-transparent px-4 pt-6 pb-1.5 text-apple text-fg outline-none disabled:opacity-60"
            {...props}
          />
          <label
            htmlFor={inputId}
            className="pointer-events-none absolute top-1/2 left-4 origin-left -translate-y-1/2 text-apple text-fg-muted transition-[top,transform,font-size] duration-200 ease-apple peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-label peer-focus:font-medium peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-label peer-[:not(:placeholder-shown)]:font-medium"
          >
            {label}
          </label>
        </div>
        {trailing && <div className="shrink-0 pr-1.5">{trailing}</div>}
      </div>
    )
  },
)
