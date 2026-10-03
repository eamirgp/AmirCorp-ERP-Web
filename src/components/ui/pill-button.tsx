import type { ButtonHTMLAttributes } from 'react'

/**
 * Botón principal del estilo Apple (docs/diseno.md): una píldora oscura de 50 px. Al pasar el mouse cambia apenas de tono
 * y al presionarlo se hunde (`press`). Con `loading` muestra el indicador, no se puede volver a presionar y la ventana que
 * lo contiene no se cierra (aria-busy, como `Button`).
 */
export function PillButton({
  loading,
  disabled,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`press inline-flex h-12.5 items-center justify-center gap-2.5 rounded-full bg-pill px-6 text-apple font-semibold text-pill-ink hover:bg-pill-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-80 ${className}`}
      {...props}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}
