import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { currenciesQuery, storedExchangeRateQuery, useExchangeRate, type ExchangeRate } from '@/api/catalogs'
import type { Schemas } from '@/api/client'
import { parseNumberInput } from '@/lib/number-input'

/**
 * El campo "Tipo de cambio" de una compra: tipo de cambio venta de SUNAT para la fecha de emisión.
 * - Solo aplica a las monedas que lo piden (lo dice el catálogo de la API); al volver a soles, lo escrito se borra.
 * - Si la API ya lo tiene guardado, se llena solo al elegir la moneda o la fecha (leer lo guardado no gasta consultas).
 * - Si no, queda vacío y el usuario lo pide con el botón: esa consulta sí cuenta en el cupo del servicio.
 * - Al cambiar la moneda o la fecha, el que vino de SUNAT ya no corresponde y se quita; el escrito a mano se respeta,
 *   con un aviso para revisarlo.
 */
export function useExchangeRateField({
  currency,
  issueDate,
  value,
  getValue,
  setValue,
}: {
  currency: string
  issueDate: string
  /** Lo que hay en el campo, para mostrar. */
  value: string
  /** Lo que hay en el campo en este momento (dentro de los efectos, el valor del último dibujo puede estar atrasado). */
  getValue: () => string
  setValue: (value: string) => void
}) {
  const currencies = useQuery(currenciesQuery)
  const info = currencies.data?.find((c) => c.currency === currency)
  const needed = info?.requiresExchangeRate ?? false
  const canLookup = info?.supportsExchangeRateLookup ?? false
  const lookup = useExchangeRate()
  const stored = useQuery({ ...storedExchangeRateQuery(currency, issueDate), enabled: canLookup && !!issueDate })

  // Lo último que llenó SUNAT (valor y explicación), para saber si lo que hay en el campo sigue siendo eso.
  const [sunatRate, setSunatRate] = useState<{ value: number; description: string } | null>(null)
  const [review, setReview] = useState(false)
  const fromSunat = sunatRate != null && parseNumberInput(value) === sunatRate.value

  const apply = (r: ExchangeRate) => {
    setValue(String(r.rate))
    setSunatRate({ value: r.rate, description: r.description })
    setReview(false)
  }

  useEffect(() => {
    if (!needed) setValue('')
  }, [needed]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    lookup.reset()
    const current = getValue()
    if (sunatRate && parseNumberInput(current) === sunatRate.value) setValue('')
    else if (current) setReview(true)
    setSunatRate(null)
  }, [currency, issueDate]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (stored.data && !getValue()) apply(stored.data)
  }, [stored.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const hint = fromSunat
    ? sunatRate.description
    : review && value
      ? 'Cambiaste la moneda o la fecha de emisión. Revisa que el tipo de cambio corresponda.'
      : canLookup
        ? 'Presiona SUNAT para traer el de la fecha de emisión.'
        : undefined

  return {
    needed,
    canLookup,
    lookup,
    hint,
    /** Pide a SUNAT el de la fecha de emisión (cuenta en el cupo del servicio). */
    fetch: () => lookup.mutate({ currency: currency as NonNullable<Schemas['Currency']>, date: issueDate }, { onSuccess: apply }),
    /** El usuario escribió en el campo: ya no hace falta el aviso de revisarlo. */
    typed: () => setReview(false),
  }
}
