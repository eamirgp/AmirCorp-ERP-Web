/**
 * La "tapa de rueda" del logo como elemento decorativo: rayos en abanico con separaciones,
 * como la marca de agua de la hoja membretada del manual.
 */
export function WheelMotif({ className = '' }: { className?: string }) {
  const cx = 0
  const cy = 0
  const outer = 100
  const inner = 30
  const spokes = 6
  const from = -8
  const to = 82
  const gap = 4.5
  const step = (to - from) / spokes

  const point = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
  }

  const paths = Array.from({ length: spokes }, (_, i) => {
    const a1 = from + i * step + gap / 2
    const a2 = from + (i + 1) * step - gap / 2
    return `M ${point(inner, a1)} L ${point(outer, a1)} A ${outer} ${outer} 0 0 1 ${point(outer, a2)} L ${point(inner, a2)} A ${inner} ${inner} 0 0 0 ${point(inner, a1)} Z`
  })

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {paths.map((d) => (
        <path key={d} d={d} fill="currentColor" />
      ))}
    </svg>
  )
}
