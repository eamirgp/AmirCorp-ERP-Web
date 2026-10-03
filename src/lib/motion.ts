/** Si la computadora pide "reducir movimiento": entonces nada se sacude ni flota. */
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * La "sacudida" de Apple cuando la contraseña está mal (Mac, iPhone): el elemento se mueve de lado a lado, rápido, como
 * diciendo "no" (docs/diseno.md). Se puede repetir en cada intento rechazado sin volver a montar el formulario.
 */
export function shake(element: HTMLElement | null) {
  if (!element || reducedMotion()) return
  element.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-9px)', offset: 0.15 },
      { transform: 'translateX(8px)', offset: 0.3 },
      { transform: 'translateX(-6px)', offset: 0.45 },
      { transform: 'translateX(5px)', offset: 0.6 },
      { transform: 'translateX(-2px)', offset: 0.75 },
      { transform: 'translateX(0)' },
    ],
    { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  )
}
