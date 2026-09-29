import { useQuery } from '@tanstack/react-query'
import { Search, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { countriesQuery, identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { useLookupRuc, useSavePartner, type PartnerRole, type PartnerRow } from '@/api/partners'
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
  isClient: boolean
  isSupplier: boolean
}

const empty: Values = { identityDocumentType: '', documentNumber: '', country: null, name: '', isClient: false, isSupplier: false }

/**
 * Formulario de cliente o proveedor. `role` es la lista desde la que se abre: define el título y qué rol viene
 * marcado al crear. Las dos casillas siguen disponibles, porque una empresa puede ser cliente y proveedor.
 */
export function PartnerFormDialog({
  open,
  partner,
  role,
  onClose,
}: {
  open: boolean
  partner: PartnerRow | null
  role: PartnerRole
  onClose: () => void
}) {
  const noun = role === 'proveedores' ? 'proveedor' : 'cliente'
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
            isClient: partner.isClient,
            isSupplier: partner.isSupplier,
          }
        : { ...empty, isClient: role === 'clientes', isSupplier: role === 'proveedores' },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partner, role])

  // El país solo se pregunta con documento extranjero: con DNI o RUC es Perú (lo indica la API en el catálogo).
  const docType = form.watch('identityDocumentType')
  const selectedType = docTypes.data?.find((d) => d.identityDocumentType === docType)
  const asksCountry = selectedType?.requiresCountry ?? false

  // Un proveedor no puede tener DNI (lo indica la API con canBeSupplier): si "Proveedor" está marcado no se ofrece
  // DNI, y si se eligió DNI la casilla "Proveedor" se desactiva. Así no se llega al error recién al guardar.
  const isSupplier = form.watch('isSupplier')
  const docTypeOptions = (docTypes.data ?? []).filter((d) => !isSupplier || d.canBeSupplier || d.identityDocumentType === docType)
  const supplierBlocked = selectedType !== undefined && !selectedType.canBeSupplier

  // Buscar en SUNAT: solo si la API lo permite para este tipo (RUC con la consulta configurada).
  const lookup = useLookupRuc()
  const documentNumber = form.watch('documentNumber')
  useEffect(() => lookup.reset(), [open, docType, documentNumber]) // eslint-disable-line react-hooks/exhaustive-deps
  const searchSunat = () =>
    lookup.mutate(documentNumber, {
      // Solo se llena el nombre: el número lo normaliza la API al guardar, y cambiarlo aquí borraría el resultado.
      onSuccess: (r) => form.setValue('name', r.name),
    })

  const onSubmit = form.handleSubmit((v) =>
    save.mutate(
      {
        edit: partner ? { id: partner.id, rowVersion: partner.rowVersion } : undefined,
        input: {
          identityDocumentType: (v.identityDocumentType || null) as Schemas['IdentityDocumentType'],
          documentNumber: v.documentNumber,
          countryCode: asksCountry ? (v.country?.code ?? null) : null,
          name: v.name,
          // Una casilla desactivada llega vacía: se envía como "no".
          isClient: !!v.isClient,
          isSupplier: !supplierBlocked && !!v.isSupplier,
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
      // Un poco más ancho que el estándar: el número de documento lleva al lado el botón "SUNAT".
      width="max-w-xl"
      title={partner ? `Editar ${noun}` : `Nuevo ${noun}`}
      description={partner ? `${partner.identityDocumentTypeDescription} ${partner.documentNumber}` : 'Queda disponible para todas las empresas.'}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="partner-form" loading={save.isPending}>
            {partner ? 'Guardar cambios' : `Crear ${noun}`}
          </Button>
        </>
      }
    >
      <form id="partner-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={save.isError ? errorMessages(save.error) : []} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Field label="Tipo de documento" hint={isSupplier ? 'Un proveedor necesita RUC o documento extranjero.' : undefined}>
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
          <Field label="Número de documento">
            {(a) =>
              selectedType?.supportsLookup ? (
                <div className="flex gap-2">
                  <Input {...a} className="min-w-0 flex-1 font-mono" {...form.register('documentNumber')} />
                  <Button onClick={searchSunat} loading={lookup.isPending} title="Trae la razón social desde SUNAT">
                    <Search />
                    SUNAT
                  </Button>
                </div>
              ) : (
                <Input {...a} className="font-mono" {...form.register('documentNumber')} />
              )
            }
          </Field>
        </div>

        {lookup.isError && <ErrorList messages={errorMessages(lookup.error)} />}
        {lookup.data && (
          <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm">
            <p>
              <span className="text-muted">Según SUNAT: </span>
              <span className="font-medium">{lookup.data.status}</span>
              <span className="text-muted"> · </span>
              <span className="font-medium">{lookup.data.condition}</span>
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

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-xs font-medium text-muted">Rol (puede ser los dos)</legend>
          <label className="flex items-center gap-2.5 text-base">
            <input type="checkbox" className="size-4 [accent-color:var(--ink)]" {...form.register('isClient')} />
            Cliente
          </label>
          <label className={`flex items-center gap-2.5 text-base ${supplierBlocked ? 'text-faint' : ''}`}>
            <input type="checkbox" className="size-4 [accent-color:var(--ink)]" disabled={supplierBlocked} {...form.register('isSupplier')} />
            Proveedor
          </label>
          {supplierBlocked && <p className="pl-6.5 text-xs text-faint">Con {selectedType.description} no puede ser proveedor: no emite facturas.</p>}
        </fieldset>
      </form>
    </Dialog>
  )
}
