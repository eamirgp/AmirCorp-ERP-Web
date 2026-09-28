import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

const control =
  'h-10 w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 text-base text-ink placeholder:text-faint transition-colors focus:border-ink focus:outline-none aria-[invalid=true]:border-bad disabled:opacity-60'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref,
) {
  return <input ref={ref} className={`${control} ${className}`} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={`${control} appearance-none bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8 ${className}`} style={{ backgroundImage: chevron }} {...props}>
      {children}
    </select>
  )
})

const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238A969E' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`

/** Etiqueta + control + ayuda o error, con los atributos de accesibilidad conectados. */
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
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {(error || hint) && (
        <p id={describedBy} className={`text-xs ${error ? 'text-bad' : 'text-faint'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
