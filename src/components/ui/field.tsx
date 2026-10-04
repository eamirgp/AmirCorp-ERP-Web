import { CircleAlert } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { COMMA_MESSAGE, formatNumberInput, hasComma, numberInputProblem } from '@/lib/number-input'
import { FieldContext, useControlClass, useInField } from './control'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', placeholder, ...props }, ref) {
  const inField = useInField()
  // Dentro de un Field el texto de ejemplo siempre existe (aunque sea un espacio): así el CSS sabe si el campo está vacío.
  return <input ref={ref} className={`${useControlClass()} ${className}`} placeholder={inField ? (placeholder ?? ' ') : placeholder} {...props} />
})

// La lista desplegable vive en su propio archivo; se exporta también desde aquí, junto a los demás campos.
export { Select } from './select'

/**
 * Campo para números escritos a mano (precios, cantidades, tipo de cambio).
 * - Si se escribe una coma, avisa en el momento: "Usa punto para los decimales. No uses comas."
 * - Si al salir del campo lo escrito no es un número ("12a"), avisa: "Escribe solo números…". Si no, la API recibiría
 *   el campo vacío y diría "es requerido".
 * - Al salir del campo reordena el número para leerlo fácil: "1500.5" → "1 500.50" (nunca redondea).
 */
export const NumberInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { minDecimals?: number }>(function NumberInput(
  { className = '', minDecimals = 0, onChange, onBlur, ...props },
  ref,
) {
  const [problem, setProblem] = useState<string | null>(null)

  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <Input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        className={`num ${className}`}
        {...props}
        aria-invalid={!!problem || props['aria-invalid']}
        onChange={(e) => {
          // Mientras se escribe solo se avisa la coma; lo demás, al salir (para no avisar a medio escribir).
          setProblem(hasComma(e.target.value) ? COMMA_MESSAGE : null)
          onChange?.(e)
        }}
        onBlur={(e) => {
          const formatted = formatNumberInput(e.target.value, minDecimals)
          if (formatted !== e.target.value) {
            // Se cambia como si lo hubiera escrito el usuario, así el formulario (y sus cálculos en vivo) se enteran.
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(e.target, formatted)
            e.target.dispatchEvent(new Event('input', { bubbles: true }))
          }
          setProblem(numberInputProblem(e.target.value))
          onBlur?.(e)
        }}
      />
      {problem && <FieldError role="alert">{problem}</FieldError>}
    </span>
  )
})

/**
 * Error junto al campo, en rojo y con ícono (Apple: avisar cerca de lo que describe). `Field` lo usa solo; un campo
 * compacto (una fila de una lista) lo pone debajo.
 */
export function FieldError({ id, role, children }: { id?: string; role?: 'alert'; children: ReactNode }) {
  return (
    <p id={id} role={role} className="flex gap-1.5 px-1 text-sm text-bad">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/**
 * Campo de formulario al estilo Apple: la etiqueta va dentro del campo y sube al escribir; debajo, la ayuda o el error.
 * Conecta los atributos de accesibilidad con el campo que se dibuja adentro.
 */
export function Field({
  label,
  hint,
  error,
  prefix,
  children,
}: {
  label: string
  hint?: string
  error?: string
  /** Símbolo delante del valor ("S/"): aparece cuando la etiqueta sube. Va también en el nombre que leen los lectores de pantalla. */
  prefix?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}) {
  const id = useId()
  const describedBy = error || hint ? `${id}-desc` : undefined
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className={`float-field ${prefix ? 'has-prefix' : ''}`}>
        <FieldContext.Provider value={true}>{children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}</FieldContext.Provider>
        {/* Después del campo: se dibuja encima y el CSS la sube cuando el campo tiene foco o texto. */}
        <label htmlFor={id} className="float-label">
          {label}
          {prefix && <span className="sr-only"> ({prefix})</span>}
        </label>
        {prefix && (
          <span className="float-prefix" aria-hidden>
            {prefix}
          </span>
        )}
      </div>
      {error ? (
        <FieldError id={describedBy}>{error}</FieldError>
      ) : (
        hint && (
          <p id={describedBy} className="px-1 text-xs text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
