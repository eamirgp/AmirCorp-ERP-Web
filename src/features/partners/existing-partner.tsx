import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessages } from '@/api/client'
import { fetchPartnerRow, findPartnerByDocument, partnerKeys, useAddPartnerRole, type FoundPartner, type IdentityDocumentType, type PartnerRole, type PartnerRow } from '@/api/partners'
import { Button } from '@/components/ui/button'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { compactDocument } from '@/features/shared/use-looked-up-name'

const duplicateKey = (type: string, number: string) => [...partnerKeys.all, 'by-document', type, number]

/**
 * ¿Alguien más ya tiene este documento? Se consulta un momento después de dejar de escribir. Al editar, encontrarse a
 * sí mismo no es un duplicado; sí lo es que el documento nuevo ya lo tenga otro.
 */
export function useExistingPartner({ open, partner, docType, documentNumber }: { open: boolean; partner: PartnerRow | null; docType: string; documentNumber: string }) {
  const [typed, setTyped] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setTyped(compactDocument(documentNumber)), 400)
    return () => clearTimeout(t)
  }, [documentNumber])

  const existing = useQuery({
    queryKey: duplicateKey(docType, typed),
    queryFn: () => findPartnerByDocument(docType as IdentityDocumentType, typed),
    enabled: open && !!docType && typed.length >= 3,
  })
  // Mientras se sigue escribiendo, el resultado es del número anterior y no se muestra.
  const upToDate = compactDocument(documentNumber) === typed
  const found = upToDate && existing.data && existing.data.id !== partner?.id ? existing.data : null

  // Antes de gastar una consulta en SUNAT o RENIEC se revisa el duplicado sin esperar a que el usuario deje de
  // escribir: con un Enter rápido, el aviso todavía no habría llegado.
  const queryClient = useQueryClient()
  const [checking, setChecking] = useState(false)
  /** true si el documento ya lo tiene otro (sale el aviso). Si la revisión falla, se sigue: la API lo impide al guardar. */
  const takenByOther = async (type: IdentityDocumentType, number: string) => {
    setTyped(number)
    setChecking(true)
    try {
      const duplicate = await queryClient.fetchQuery({ queryKey: duplicateKey(type!, number), queryFn: () => findPartnerByDocument(type, number), staleTime: 30_000 })
      return !!duplicate && duplicate.id !== partner?.id
    } catch {
      return false
    } finally {
      setChecking(false)
    }
  }

  return { found, typed, checking, takenByOther }
}

/** Ya existe: en vez de crear un duplicado, se ofrece agregarlo a esta lista, abrirlo, o se explica por qué no. */
export function ExistingPartnerNotice({
  found,
  partner,
  role,
  typed,
  onAdded,
  onOpenExisting,
}: {
  found: FoundPartner
  partner: PartnerRow | null
  role: PartnerRole
  /** El número buscado, para encontrar su fila en la lista. */
  typed: string
  onAdded: () => void
  onOpenExisting: (partner: PartnerRow) => void
}) {
  const isSuppliers = role === 'proveedores'
  const noun = isSuppliers ? 'proveedor' : 'cliente'
  const canAddHere = isSuppliers ? found.canAddSupplierRole : found.canAddClientRole
  const alreadyHere = isSuppliers ? found.isSupplier : found.isClient
  const addRole = useAddPartnerRole()

  const addHere = () =>
    addRole.mutate(
      { id: found.id, role: isSuppliers ? 'Supplier' : 'Client' },
      {
        onSuccess: () => {
          toast.ok(`${found.name} ahora también es ${noun}`)
          onAdded()
        },
      },
    )

  // Ya está en esta lista: se abre su ficha para editarlo, en vez de dejar al usuario buscándolo.
  const [opening, setOpening] = useState(false)
  const openExisting = async () => {
    setOpening(true)
    try {
      const row = await fetchPartnerRow(found.id, typed, role)
      if (row) onOpenExisting(row)
      else toast.error('No se pudo abrir. Búscalo en la lista.')
    } catch (e) {
      toast.error(errorMessages(e)[0])
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm">
      <p>{found.summary}</p>
      {addRole.isError && <ErrorList messages={errorMessages(addRole.error)} />}
      {partner ? (
        <p className="text-muted">Dos registros no pueden tener el mismo documento. Revisa el número.</p>
      ) : canAddHere ? (
        <div>
          <Button variant="primary" size="sm" onClick={addHere} loading={addRole.isPending}>
            <UserPlus />
            Agregarlo también como {noun}
          </Button>
        </div>
      ) : alreadyHere ? (
        <div>
          <Button variant="primary" size="sm" onClick={openExisting} loading={opening}>
            <Pencil />
            Abrir {found.name}
          </Button>
        </div>
      ) : (
        // Por qué no se le puede agregar este rol: lo dice la API.
        <p className="text-muted">{isSuppliers ? found.addSupplierRoleError : found.addClientRoleError}</p>
      )}
    </div>
  )
}
