import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'icon'

/**
 * Estilos de la guía de Apple (HIG "Buttons"): se distinguen por el estilo, no por el tamaño, y hay uno o dos
 * principales por vista.
 * - primary: píldora negra, la acción más probable.
 * - secondary: píldora gris.
 * - ghost: solo texto en jade (acción simple, como "Limpiar filtros"); con un ícono solo, un círculo sin fondo.
 * - danger: texto rojo sobre gris, para lo que quita algo.
 */
const variants: Record<Variant, string> = {
  primary: 'bg-pill text-pill-ink hover:bg-pill-hover',
  secondary: 'bg-fill text-fg hover:bg-fill-hover',
  ghost: 'bg-transparent text-link hover:bg-[rgb(42_116_69/0.08)]',
  danger: 'bg-fill text-bad hover:bg-fill-hover',
}

// 44 px el normal (el mínimo que pide Apple para tocar o hacer clic) y 36 px el compacto, en barras y tablas.
const sizes: Record<Size, string> = {
  md: 'h-11 text-base gap-2 [&_svg]:size-[18px]',
  sm: 'h-9 text-sm gap-1.5 [&_svg]:size-4',
  icon: 'size-9 [&_svg]:size-[18px]',
}

// El de solo texto lleva menos relleno: no tiene fondo que lo enmarque.
const padding = (variant: Variant, size: Size) => (size === 'icon' ? '' : variant === 'ghost' ? 'px-2.5' : size === 'md' ? 'px-5' : 'px-3.5')

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

/**
 * Botón en forma de píldora que se hunde al presionarlo (`press`). Con `loading` muestra un círculo que gira junto al
 * texto (Apple: el botón dice que está trabajando), no se puede volver a presionar y la ventana que lo contiene no se
 * cierra. `size="icon"` es un botón redondo con un solo ícono (necesita `aria-label`).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, disabled, className = '', children, type = 'button', ...props },
  ref,
) {
  // Un botón de solo ícono no lleva fondo gris: es un símbolo sin borde, como en las barras de Apple.
  const look = size === 'icon' && variant !== 'primary' ? 'bg-transparent text-fg hover:bg-hover' : variants[variant]
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      // Mientras guarda: la ventana que lo contiene no se cierra (Dialog).
      aria-busy={loading || undefined}
      className={`press inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:shrink-0 ${look} ${sizes[size]} ${padding(variant, size)} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {/* Con un solo ícono, mientras carga se ve solo el círculo que gira. */}
      {!(loading && size === 'icon') && children}
    </button>
  )
})

/** Círculo que gira: algo está en curso. Es decoración: lo que pasa lo dice el texto o `aria-busy`. */
export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <span className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden />
}
