import { useQuery } from '@tanstack/react-query'
import { Pencil, Search, TriangleAlert, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { countriesQuery, identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { fetchPartnerRow, findPartnerByDocument, partnerKeys, useAddPartnerRole, useLookupDocument, useSavePartner, type IdentityDocumentType, type PartnerRole, type PartnerRow } from '@/api/partners'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { SearchSelect } from '@/components/ui/search-select'
import { toast } from '@/components/ui/toast'
import { matchesText } from '@/lib/text'

type CountryOption = Schemas['ListCountriesResponseDto']

interface Values {
  identityDocumentType: string
  documentNumber: string
  country: CountryOption | null
  name: string
}

const empty: Values = { identityDocumentType: '', documentNumber: '', country: null, name: '' }

/**
 * Formulario de cliente o proveedor. No tiene casillas de rol, como en Odoo o Business Central: el rol lo da la lista
 * desde la que se crea ("Nuevo cliente" o "Nuevo proveedor"). Si alguien ya existe en la otra lista, se ofrece
 * agregarlo también a esta en vez de crear un duplicado; si ya existe, se agrega el otro rol desde el menú ⋯.
 */
export function PartnerFormDialog({
  open,
  partner,
  role,
  onClose,
  onOpenExisting,
}: {
  open: boolean
  partner: PartnerRow | null
  role: PartnerRole
  onClose: () => void
  /** Al crear, el documento ya existe en esta lista y el usuario pide abrir ese registro. */
  onOpenExisting: (partner: PartnerRow) => void
}) {
  const isSuppliers = role === 'proveedores'
  const noun = isSuppliers ? 'proveedor' : 'cliente'
  const docTypes = useQuery(identityDocumentTypesQuery)
  const countries = useQuery(countriesQuery)
  // La API envía todos los países (son pocos y fijos): buscar entre ellos es solo presentación, sin tildes.
  const findCountries = (term: string) => Promise.resolve((countries.data ?? []).filter((c) => !term || matchesText(term, c.name, c.code)))
  const save = useSavePartner()
  const addRole = useAddPartnerRole()
  const form = useForm<Values>({ defaultValues: empty })

  useEffect(() => {
    if (!open) return
    save.reset()
    addRole.reset()
    lookedUpName.current = ''
    form.reset(
      partner
        ? {
            identityDocumentType: partner.identityDocumentType,
            documentNumber: partner.documentNumber,
            country: { code: partner.countryCode, name: partner.countryName },
            name: partner.name,
          }
        : empty,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partner])

  // Roles que debe admitir el documento: los que ya tiene el registro o, al crear, el de esta lista. Qué documento
  // admite cada rol lo indica la API (canBeClient, canBeSupplier): así no se ofrecen combinaciones imposibles.
  const needsClient = partner ? partner.isClient : !isSuppliers
  const needsSupplier = partner ? partner.isSupplier : isSuppliers
  const docType = form.watch('identityDocumentType')
  const docTypeOptions = (docTypes.data ?? []).filter(
    (d) => d.identityDocumentType === docType || ((!needsClient || d.canBeClient) && (!needsSupplier || d.canBeSupplier)),
  )
  const selectedType = docTypes.data?.find((d) => d.identityDocumentType === docType)
  const asksCountry = selectedType?.requiresCountry ?? false

  // Buscar el RUC en SUNAT o el DNI en RENIEC: solo si la API lo permite para este tipo (con la consulta configurada).
  const lookup = useLookupDocument()
  const documentNumber = form.watch('documentNumber')
  // El nombre que llenó la consulta. Si el documento cambia y el nombre sigue siendo ese, ya no corresponde: se
  // borra para que la consulta del número nuevo lo llene. Un nombre escrito a mano se respeta.
  const lookedUpName = useRef('')
  const fillName = (name: string) => {
    form.setValue('name', name)
    lookedUpName.current = name
  }
  useEffect(() => {
    lookup.reset()
    if (lookedUpName.current && form.getValues('name') === lookedUpName.current) form.setValue('name', '')
    lookedUpName.current = ''
  }, [open, docType, documentNumber]) // eslint-disable-line react-hooks/exhaustive-deps
  const compact = (n: string | undefined) => n?.replace(/\s/g, '') ?? ''
  // Una respuesta que llega tarde, cuando el número ya es otro, no debe llenar el nombre.
  const stillCurrent = (asked: string) => compact(form.getValues('documentNumber')) === compact(asked)
  const searchSource = () =>
    lookup.mutate(
      { identityDocumentType: docType as IdentityDocumentType, documentNumber },
      {
        // Solo se llena el nombre: el número lo normaliza la API al guardar, y cambiarlo aquí borraría el resultado.
        onSuccess: (r, asked) => stillCurrent(asked.documentNumber) && fillName(r.name),
      },
    )

  // Al crear o al cambiar el documento: ¿alguien más ya lo tiene? Se consulta un momento después de dejar de escribir.
  const [typed, setTyped] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setTyped(compact(documentNumber)), 400)
    return () => clearTimeout(t)
  }, [documentNumber])
  const existing = useQuery({
    queryKey: [...partnerKeys.all, 'by-document', docType, typed],
    queryFn: () => findPartnerByDocument(docType as IdentityDocumentType, typed),
    enabled: open && !!docType && typed.length >= 3,
  })
  // Al editar, encontrarse a sí mismo no es un duplicado; sí lo es que el documento nuevo ya lo tenga otro.
  // Mientras se sigue escribiendo, el resultado es del número anterior y no se muestra.
  const upToDate = compact(documentNumber) === typed
  const found = upToDate && existing.data && existing.data.id !== partner?.id ? existing.data : null
  const canAddHere = found && (isSuppliers ? found.canAddSupplierRole : found.canAddClientRole)
  const alreadyHere = found && (isSuppliers ? found.isSupplier : found.isClient)

  // La consulta en SUNAT o RENIEC nunca es automática: cada una cuenta en el cupo del servicio y un DNI no se puede
  // validar antes (cualquier número de 8 dígitos se consultaría). La pide el usuario con el botón o con Enter en el
  // número. El aviso de duplicado sí es inmediato, porque busca en la base propia.
  const canLookup = !!selectedType?.supportsLookup && !found
  const lookupOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (canLookup && !lookup.isPending && compact(documentNumber)) searchSource()
  }

  // Ya está en esta lista: se abre su ficha para editarlo, en vez de dejar al usuario buscándolo.
  const [opening, setOpening] = useState(false)
  const openExisting = async () => {
    if (!found) return
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

  const addHere = () =>
    found &&
    addRole.mutate(
      { id: found.id, role: isSuppliers ? 'Supplier' : 'Client' },
      {
        onSuccess: () => {
          toast.ok(`${found.name} ahora también es ${noun}`)
          onClose()
        },
      },
    )

  const onSubmit = form.handleSubmit((v) =>
    save.mutate(
      {
        edit: partner ? { id: partner.id, rowVersion: partner.rowVersion } : undefined,
        input: {
          identityDocumentType: (v.identityDocumentType || null) as Schemas['IdentityDocumentType'],
          documentNumber: v.documentNumber,
          countryCode: asksCountry ? (v.country?.code ?? null) : null,
          name: v.name,
          // Al crear, el rol es el de la lista; al editar no se envía (los roles se agregan desde el menú ⋯).
          isClient: !isSuppliers,
          isSupplier: isSuppliers,
        },
      },
      {
        onSuccess: () => {
          toast.ok(partner ? `${noun[0].toUpperCase()}${noun.slice(1)} actualizado` : `${noun[0].toUpperCase()}${noun.slice(1)} creado`)
          onClose()
        },
      },
    ),
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      // Un poco más ancho que el estándar: el número de documento lleva al lado el botón "SUNAT" o "RENIEC".
      width="max-w-xl"
      title={partner ? `Editar ${noun}` : `Nuevo ${noun}`}
      description={partner ? `${partner.identityDocumentTypeDescription} ${partner.documentNumber}` : 'Queda disponible para todas las empresas.'}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="partner-form" loading={save.isPending} disabled={!!found}>
            {partner ? 'Guardar cambios' : `Crear ${noun}`}
          </Button>
        </>
      }
    >
      <form id="partner-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={save.isError ? errorMessages(save.error) : addRole.isError ? errorMessages(addRole.error) : []} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Field label="Tipo de documento" hint={isSuppliers ? 'Un proveedor tiene RUC o documento extranjero.' : 'Un cliente tiene RUC o DNI.'}>
            {(a) => (
              <Select {...a} autoFocus {...form.register('identityDocumentType')}>
                <option value="">Elige…</option>
                {docTypeOptions.map((d) => (
                  <option key={d.identityDocumentType} value={d.identityDocumentType}>
                    {d.description}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Número de documento" hint={canLookup ? `Presiona ${selectedType?.lookupSource} o Enter para traer el nombre.` : undefined}>
            {(a) =>
              selectedType?.supportsLookup ? (
                <div className="flex gap-2">
                  <Input {...a} className="min-w-0 flex-1 font-mono" {...form.register('documentNumber')} onKeyDown={lookupOnEnter} />
                  {/* Si ya está registrado no hace falta consultarlo: el aviso de abajo dice quién es. */}
                  <Button onClick={searchSource} loading={lookup.isPending} disabled={!canLookup} title={`Trae el nombre desde ${selectedType.lookupSource}`}>
                    <Search />
                    {selectedType.lookupSource}
                  </Button>
                </div>
              ) : (
                <Input {...a} className="font-mono" {...form.register('documentNumber')} />
              )
            }
          </Field>
        </div>

        {/* Ya existe: en vez de crear un duplicado, se ofrece agregarlo a esta lista (o se explica por qué no). */}
        {found && (
          <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm">
            <p>
              <span className="font-medium">{found.name}</span> ya está registrado como <span className="font-medium">{found.roleDescription.toLowerCase()}</span>.
            </p>
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
              <p className="text-muted">
                Con {selectedType?.description ?? 'este documento'} no puede ser {noun}.
              </p>
            )}
          </div>
        )}

        {lookup.isError && <ErrorList messages={errorMessages(lookup.error)} />}
        {lookup.data && (
          <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm">
            {/* SUNAT informa estado y condición; RENIEC solo el nombre. */}
            <p>
              <span className="text-muted">Según {lookup.data.source}: </span>
              {lookup.data.status ? (
                <>
                  <span className="font-medium">{lookup.data.status}</span>
                  <span className="text-muted"> · </span>
                  <span className="font-medium">{lookup.data.condition}</span>
                </>
              ) : (
                <span className="font-medium">{lookup.data.name}</span>
              )}
            </p>
            {lookup.data.address && <p className="text-muted">{lookup.data.address}</p>}
            {lookup.data.warnings.map((w) => (
              <p key={w} className="flex gap-2 rounded bg-warn-soft px-3 py-2 text-warn-text">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {w}
              </p>
            ))}
          </div>
        )}

        <Field label="Nombre o razón social">{(a) => <Input {...a} {...form.register('name')} />}</Field>

        {asksCountry && (
          <Field label="País" hint="De dónde es el proveedor extranjero. Escribe para buscarlo.">
            {(a) => (
              <Controller
                control={form.control}
                name="country"
                render={({ field }) => (
                  <SearchSelect
                    {...a}
                    value={field.value}
                    onChange={field.onChange}
                    queryKey="countries"
                    fetchItems={findCountries}
                    itemKey={(c) => c.code}
                    itemLabel={(c) => c.name}
                    placeholder="Busca el país"
                  />
                )}
              />
            )}
          </Field>
        )}
      </form>
    </Dialog>
  )
}
