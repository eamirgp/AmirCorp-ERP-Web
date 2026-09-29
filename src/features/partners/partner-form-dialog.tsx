import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { countriesQuery, identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { useSavePartner, type PartnerRow } from '@/api/partners'
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

export function PartnerFormDialog({ open, partner, onClose }: { open: boolean; partner: PartnerRow | null; onClose: () => void }) {
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
        : empty,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partner])

  // El país solo se pregunta con documento extranjero: con DNI o RUC es Perú (lo indica la API en el catálogo).
  const docType = form.watch('identityDocumentType')
  const asksCountry = docTypes.data?.find((d) => d.identityDocumentType === docType)?.requiresCountry ?? false

  const onSubmit = form.handleSubmit((v) =>
    save.mutate(
      {
        edit: partner ? { id: partner.id, rowVersion: partner.rowVersion } : undefined,
        input: {
          identityDocumentType: (v.identityDocumentType || null) as Schemas['IdentityDocumentType'],
          documentNumber: v.documentNumber,
          countryCode: asksCountry ? (v.country?.code ?? null) : null,
          name: v.name,
          isClient: v.isClient,
          isSupplier: v.isSupplier,
        },
      },
      {
        onSuccess: () => {
          toast.ok(partner ? 'Registro actualizado' : 'Registro creado')
          onClose()
        },
      },
    ),
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={partner ? 'Editar cliente o proveedor' : 'Nuevo cliente o proveedor'}
      description={partner ? `${partner.identityDocumentTypeDescription} ${partner.documentNumber}` : 'Queda disponible para todas las empresas.'}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="partner-form" loading={save.isPending}>
            {partner ? 'Guardar cambios' : 'Crear'}
          </Button>
        </>
      }
    >
      <form id="partner-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={save.isError ? errorMessages(save.error) : []} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de documento">
            {(a) => (
              <Select {...a} autoFocus {...form.register('identityDocumentType')}>
                <option value="">Elige…</option>
                {docTypes.data?.map((d) => (
                  <option key={d.identityDocumentType} value={d.identityDocumentType}>
                    {d.description}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Número de documento">{(a) => <Input {...a} className="font-mono" {...form.register('documentNumber')} />}</Field>
        </div>

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
          <legend className="mb-1.5 text-xs font-medium text-muted">Rol</legend>
          <label className="flex items-center gap-2.5 text-base">
            <input type="checkbox" className="size-4 [accent-color:var(--ink)]" {...form.register('isClient')} />
            Cliente
          </label>
          <label className="flex items-center gap-2.5 text-base">
            <input type="checkbox" className="size-4 [accent-color:var(--ink)]" {...form.register('isSupplier')} />
            Proveedor
          </label>
        </fieldset>
      </form>
    </Dialog>
  )
}
