import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { countriesQuery, identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { useLookupDocument, useSavePartner, type IdentityDocumentType, type PartnerRole, type PartnerRow } from '@/api/partners'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { LookupResult } from '@/components/ui/lookup-result'
import { ErrorList } from '@/components/ui/misc'
import { SearchSelect } from '@/components/ui/search-select'
import { toast } from '@/components/ui/toast'
import { ExistingPartnerNotice, useExistingPartner } from '@/features/partners/existing-partner'
import { compactDocument, lookupOnEnter, useLookedUpName } from '@/features/shared/use-looked-up-name'
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
  const form = useForm<Values>({ defaultValues: empty })

  useEffect(() => {
    if (!open) return
    save.reset()
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
  const name = useLookedUpName({
    getName: () => form.getValues('name'),
    setName: (v) => form.setValue('name', v),
    getDocument: () => form.getValues('documentNumber'),
    onDocumentChange: () => lookup.reset(),
    deps: [open, docType, documentNumber],
  })
  const existing = useExistingPartner({ open, partner, docType, documentNumber })
  const found = existing.found

  // Si el documento ya lo tiene otro, no se gasta la consulta y sale el aviso.
  const searchSource = async () => {
    const type = docType as IdentityDocumentType
    const number = compactDocument(documentNumber)
    if ((await existing.takenByOther(type, number)) || !name.isCurrent(number)) return
    lookup.mutate(
      { identityDocumentType: type, documentNumber: number, partnerId: partner?.id },
      // Solo se llena el nombre: el número lo normaliza la API al guardar, y cambiarlo aquí borraría el resultado.
      { onSuccess: (r, asked) => name.fill(r.name, asked.documentNumber) },
    )
  }

  // La consulta en SUNAT o RENIEC nunca es automática: cada una cuenta en el cupo del servicio y un DNI no se puede
  // validar antes (cualquier número de 8 dígitos se consultaría). La pide el usuario con el botón o con Enter en el
  // número. El aviso de duplicado sí es inmediato, porque busca en la base propia.
  const canLookup = !!selectedType?.supportsLookup && !found

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
        <ErrorList messages={save.isError ? errorMessages(save.error) : []} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {/* La lista ya trae solo los documentos que admite este rol (lo indica la API). */}
          <Field label="Tipo de documento">
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
          <Field label="Número de documento" hint={canLookup ? `Presiona ${selectedType?.lookupSource} o Enter para ${partner ? 'actualizar' : 'traer'} el nombre.` : undefined}>
            {(a) =>
              selectedType?.supportsLookup ? (
                <div className="flex gap-2">
                  <Input
                    {...a}
                    className="min-w-0 flex-1 font-mono"
                    {...form.register('documentNumber')}
                    onKeyDown={lookupOnEnter(() => canLookup && !existing.checking && !lookup.isPending && !!compactDocument(documentNumber), searchSource)}
                  />
                  {/* Si ya está registrado no hace falta consultarlo: el aviso de abajo dice quién es. */}
                  <Button onClick={searchSource} loading={existing.checking || lookup.isPending} disabled={!canLookup} title={`Trae el nombre desde ${selectedType.lookupSource}`}>
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

        {found && <ExistingPartnerNotice found={found} partner={partner} role={role} typed={existing.typed} onAdded={onClose} onOpenExisting={onOpenExisting} />}

        {lookup.isError && <ErrorList messages={errorMessages(lookup.error)} />}
        {lookup.data && <LookupResult data={lookup.data} />}

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
