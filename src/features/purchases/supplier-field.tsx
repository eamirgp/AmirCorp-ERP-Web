import { useQuery } from '@tanstack/react-query'
import { Search, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { identityDocumentTypesQuery } from '@/api/catalogs'
import { ApiError, errorMessages } from '@/api/client'
import { fetchPartnerRow, findPartnerByDocument, searchSuppliers, useLookupDocument, type PartnerRow } from '@/api/partners'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { SearchSelect } from '@/components/ui/search-select'

/** Proveedor que todavía no existe: la API lo registra junto con la compra (o no registra ninguno de los dos). */
export interface NewSupplier {
  ruc: string
  name: string
}

/**
 * Proveedor de una compra. Se busca por RUC o razón social entre los registrados; si no existe, se escribe su RUC y
 * se presiona SUNAT (o Enter): trae la razón social y queda como proveedor nuevo, que se registra al guardar la
 * compra. La consulta nunca es automática, y antes de hacerla se revisa si el RUC ya está registrado.
 */
export function SupplierField({
  supplier,
  newSupplier,
  onSupplier,
  onNewSupplier,
  ...aria
}: {
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  supplier: PartnerRow | null
  newSupplier: NewSupplier | null
  onSupplier: (supplier: PartnerRow | null) => void
  onNewSupplier: (supplier: NewSupplier | null) => void
}) {
  const docTypes = useQuery(identityDocumentTypesQuery)
  // Si la consulta no está configurada, el proveedor nuevo se llena a mano y el botón lo dice.
  const source = docTypes.data?.find((d) => d.identityDocumentType === 'Ruc')?.lookupSource ?? null
  const lookup = useLookupDocument()
  const [term, setTerm] = useState('')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  // Ya existe como cliente: se usa ese registro (la API le agrega el rol de proveedor) y su nombre no se edita aquí.
  const [existingNote, setExistingNote] = useState<string | null>(null)

  // Cada elección o consulta nueva cambia este número: la respuesta de una consulta que llega tarde (SUNAT tardó y
  // mientras tanto se eligió otro proveedor de la lista) se descarta en vez de reemplazar lo elegido.
  const attempt = useRef(0)

  const choose = (row: PartnerRow | null) => {
    attempt.current++
    setTerm('')
    setErrors([])
    onSupplier(row)
  }

  const clearNew = () => {
    attempt.current++
    // El buscador vuelve vacío: el botón SUNAT no debe quedar con el RUC anterior.
    setTerm('')
    lookup.reset()
    setErrors([])
    setExistingNote(null)
    onNewSupplier(null)
  }

  const takeRuc = async (text: string) => {
    const ruc = text.replace(/\s/g, '')
    if (!ruc || busy) return
    const mine = ++attempt.current
    const stale = () => attempt.current !== mine
    setErrors([])
    setExistingNote(null)
    lookup.reset()
    setBusy(true)
    try {
      // Primero la base propia (gratis): si ya está registrado no se consulta SUNAT.
      const existing = await findPartnerByDocument('Ruc', ruc)
      if (stale()) return
      if (existing?.isSupplier) {
        const row = await fetchPartnerRow(existing.id, ruc, 'proveedores')
        if (stale()) return
        if (!row) setErrors(['No se pudo abrir el proveedor. Búscalo en la lista.'])
        else if (row.isPurchasingBlocked) setErrors([`${row.name}: ${blockedText(row)}`])
        else choose(row)
        return
      }
      if (existing) {
        setExistingNote('Ya está registrado como cliente. Al guardar la compra quedará también como proveedor.')
        onNewSupplier({ ruc, name: existing.name })
        return
      }
      if (!source) {
        onNewSupplier({ ruc, name: '' })
        return
      }
      const found = await lookup.mutateAsync({ identityDocumentType: 'Ruc', documentNumber: ruc })
      if (stale()) return
      onNewSupplier({ ruc: found.documentNumber, name: found.name })
    } catch (e) {
      if (stale()) return
      setErrors(errorMessages(e))
      // SUNAT no responde: se sigue a mano, con la razón social escrita por el usuario.
      if (e instanceof ApiError && e.status === 503) onNewSupplier({ ruc, name: '' })
    } finally {
      setBusy(false)
    }
  }

  // Proveedor nuevo: ocupa lo mismo que el campo (no descuadra el formulario) y el detalle va en una línea debajo.
  // Si SUNAT no trajo la razón social, en su lugar se escribe a mano.
  if (newSupplier) {
    const manual = !existingNote && !lookup.data
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          {manual ? (
            <Input
              {...aria}
              autoFocus
              className="min-w-0 flex-1"
              placeholder={`Razón social del RUC ${newSupplier.ruc}`}
              value={newSupplier.name}
              onChange={(e) => onNewSupplier({ ...newSupplier, name: e.target.value })}
            />
          ) : (
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface-2 px-3">
              <span className="truncate font-medium" title={newSupplier.name}>
                {newSupplier.name}
              </span>
              <span className="shrink-0 font-mono text-xs text-faint">RUC {newSupplier.ruc}</span>
              <span className="ml-auto shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">
                {existingNote ? 'Ya es cliente' : 'Nuevo'}
              </span>
            </div>
          )}
          <Button onClick={clearNew}>Cambiar</Button>
        </div>
        <ErrorList messages={errors} />
        {lookup.data?.warnings.map((w) => (
          <p key={w} className="flex gap-2 rounded bg-warn-soft px-3 py-2 text-sm text-warn-text">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {w}
          </p>
        ))}
        <p className="text-xs text-faint">
          {existingNote ??
            (lookup.data
              ? `${lookup.data.summary}. Se registrará como proveedor al guardar la compra.`
              : 'Escribe la razón social. Se registrará como proveedor al guardar la compra.')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <SearchSelect
            // Al elegir (también desde el botón) el campo vuelve a su estado inicial y muestra al elegido.
            key={supplier?.id ?? 'none'}
            {...aria}
            value={supplier}
            onChange={choose}
            queryKey="partners"
            fetchItems={searchSuppliers}
            itemKey={(p) => p.id}
            itemLabel={(p) => `${p.name} · ${p.documentNumber}`}
            // Los bloqueados se ven (para que nadie crea que no existen) pero no se pueden elegir.
            isItemDisabled={(p) => p.isPurchasingBlocked}
            renderItem={(p) => (
              <span className="flex flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-3">
                  {p.name}
                  <span className="shrink-0 font-mono text-xs text-faint">
                    {p.identityDocumentTypeDescription} {p.documentNumber}
                  </span>
                </span>
                {p.isPurchasingBlocked && <span className="text-xs text-bad">{blockedText(p)}</span>}
              </span>
            )}
            emptyText={() => `Ningún proveedor coincide. Si es nuevo, escribe su RUC completo y presiona ${source ?? 'Nuevo'}.`}
            onTermChange={setTerm}
            onSubmitTerm={takeRuc}
            placeholder="Busca por RUC o razón social"
          />
        </div>
        {/* mousedown sin perder el foco: lo escrito sigue a la vista mientras se consulta. */}
        <Button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => takeRuc(term)}
          loading={busy}
          disabled={!term.trim()}
          title={source ? `Trae la razón social desde ${source} y lo usa como proveedor nuevo` : 'Usa este RUC como proveedor nuevo'}
        >
          <Search />
          {source ?? 'Nuevo'}
        </Button>
      </div>
      <ErrorList messages={errors} />
    </div>
  )
}

/** "Compras bloqueadas: mercadería defectuosa" (el estado lo escribe la API). */
const blockedText = (p: PartnerRow) => (p.purchasingBlockReason ? `${p.supplierStatus}: ${p.purchasingBlockReason}` : p.supplierStatus)
