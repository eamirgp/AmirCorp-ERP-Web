/** Resumen de totales de una compra. Los montos llegan ya calculados y formateados. */
export function Totals({ base, igv, total }: { base: string; igv: string; total: string }) {
  return (
    <dl className="ml-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-base">
      <dt className="text-muted">Base imponible</dt>
      <dd className="num text-right">{base}</dd>
      <dt className="text-muted">IGV</dt>
      <dd className="num text-right">{igv}</dd>
      <dt className="border-t border-line pt-2 font-medium">Total</dt>
      <dd className="num border-t border-line pt-2 text-right font-display text-lg font-semibold">{total}</dd>
    </dl>
  )
}
