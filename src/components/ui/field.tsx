import { CircleAlert } from 'lucide-react'
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { COMMA_MESSAGE, formatNumberInput, hasComma, numberInputProblem } from '@/lib/number-input'

/**
 * Si el campo está dentro de un `Field` (formulario): entonces mide 56 px y su etiqueta va adentro y sube al escribir.
 * Fuera de un `Field` (una celda de tabla, un filtro) es compacto, de 36 px, y se nombra con `aria-label`.
 */
const FieldContext = createContext(false)

const base =
  'w-full min-w-0 border border-field-line bg-field text-fg outline-none transition-[border-color,box-shadow] duration-200 ease-apple focus:border-fg focus:shadow-focus aria-[invalid=true]:border-bad aria-[invalid=true]:focus:shadow-error disabled:border-rule disabled:bg-muted-fill disabled:text-fg-muted'
const floating = 'h-14 rounded-xl pt-[22px] pb-1.5 px-4 text-apple'
const compact = 'h-9 rounded-[10px] px-3 text-sm placeholder:text-fg-muted'

function useControlClass() {
  return `${base} ${useContext(FieldContext) ? floating : compact}`
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = '', placeholder, ...props }, ref) {
  const inField = useContext(FieldContext)
  // Dentro de un Field el texto de ejemplo siempre existe (aunque sea un espacio): así el CSS sabe si el campo está vacío.
  return <input ref={ref} className={`${useControlClass()} ${className}`} placeholder={inField ? (placeholder ?? ' ') : placeholder} {...props} />
})

/**
 * Lista desplegable. `popup` es el botón gris en píldora de las barras (HIG "Pop-up buttons"), como "Filas por página";
 * si no, tiene el aspecto de un campo.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { popup?: boolean }>(function Select(
  { className = '', children, popup, ...props },
  ref,
) {
  const control = useControlClass()
  const look = popup ? 'press h-9 rounded-full bg-fill pl-3.5 text-sm text-fg outline-none hover:bg-fill-hover focus-visible:shadow-focus' : control
  return (
    <select
      ref={ref}
      className={`${look} cursor-pointer appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10 disabled:cursor-not-allowed ${className}`}
      style={{ backgroundImage: chevron }}
      {...props}
    >
      {children}
    </select>
  )
})

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

// Flechas arriba y abajo, como las listas desplegables de la Mac.
const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236E6E73' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 15 5 5 5-5'/%3E%3Cpath d='m7 9 5-5 5 5'/%3E%3C/svg%3E")`

/** Error junto al campo, en rojo y con ícono (Apple: avisar cerca de lo que describe). */
function FieldError({ id, role, children }: { id?: string; role?: 'alert'; children: ReactNode }) {
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
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}) {
  const id = useId()
  const describedBy = error || hint ? `${id}-desc` : undefined
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="float-field">
        <FieldContext.Provider value={true}>{children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}</FieldContext.Provider>
        {/* Después del campo: se dibuja encima y el CSS la sube cuando el campo tiene foco o texto. */}
        <label htmlFor={id} className="float-label">
          {label}
        </label>
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
