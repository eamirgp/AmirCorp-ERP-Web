import { LogoMark } from './logo'

/**
 * El emblema de la marca al estilo de un ícono de app de Apple: la "P" dentro de un cuadrado blanco de esquinas
 * redondeadas con sombra suave, y detrás un brillo jade difuminado. El ícono llega creciendo un poco y queda quieto; solo
 * el brillo respira, despacio. Todo queda quieto con "reducir movimiento". Es decoración: no lo lee un lector de pantalla.
 */
export function AppIcon({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`relative flex size-40 items-center justify-center ${className}`}>
      <div className="animate-breathe absolute size-[150px] rounded-full bg-accent blur-[42px]" />
      <div className="animate-arrive relative flex size-28 items-center justify-center rounded-[28px] border border-[#e8e8ed] bg-white shadow-[0_12px_32px_rgb(29_29_31/0.10),0_2px_6px_rgb(29_29_31/0.06)]">
        <LogoMark height={60} tone="light" />
      </div>
    </div>
  )
}
