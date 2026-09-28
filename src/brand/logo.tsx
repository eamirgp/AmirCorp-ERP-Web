import iconDark from './icon-dark.png'
import iconLight from './icon-light.png'
import { brand } from '.'

// Proporción del ícono (ancho / alto) tal como viene del manual.
const ICON_RATIO = 214 / 256

type Tone = 'light' | 'dark' | 'auto'

/**
 * Ícono de la "P" con la tapa de rueda.
 * - light: para fondos claros (P negra, rueda jade).
 * - dark: para fondos oscuros (P jade, rueda blanca).
 * - auto: cambia según el tema activo.
 */
export function LogoMark({ height = 32, tone = 'auto', className = '' }: { height?: number; tone?: Tone; className?: string }) {
  const size = { height, width: Math.round(height * ICON_RATIO) }
  if (tone === 'light') return <img src={iconLight} alt="" {...size} className={className} />
  if (tone === 'dark') return <img src={iconDark} alt="" {...size} className={className} />
  return (
    <>
      <img src={iconLight} alt="" {...size} className={`only-light ${className}`} />
      <img src={iconDark} alt="" {...size} className={`only-dark ${className}`} />
    </>
  )
}

/**
 * Logotipo completo: ícono + "pizarro" en League Spartan Bold con "ACCESORIOS" espaciado debajo,
 * alineado a la derecha, como en el manual. `size` es el tamaño de la palabra "pizarro" en px.
 */
export function Logo({ size = 22, tone = 'auto', className = '' }: { size?: number; tone?: Tone; className?: string }) {
  const color = tone === 'dark' ? 'text-white' : tone === 'light' ? 'text-black' : 'text-ink'
  return (
    <span className={`inline-flex items-end gap-[0.28em] ${color} ${className}`} style={{ fontSize: size }} role="img" aria-label={brand.name}>
      <LogoMark height={Math.round(size * 1.75)} tone={tone} />
      <span className="flex flex-col items-end pb-[0.06em] font-display leading-none font-bold" aria-hidden>
        <span className="tracking-[-0.01em]">pizarro</span>
        <span className="mt-[0.12em] -mr-[0.3em] text-[0.2em] tracking-[0.3em]">ACCESORIOS</span>
      </span>
    </span>
  )
}
