import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { countriesQuery, identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { useSavePartner, type PartnerRow } from '@/api/partners'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'

interface Values {
  identityDocumentType: string
  documentNumber: string
  country: string
  name: string
  isClient: boolean
  isSupplier: boolean
}

const empty: Values = { identityDocumentType: '', documentNumber: '', country: '', name: '', isClient: false, isSupplier: false }

export function PartnerFormDialog({ open, partner, onClose }: { open: boolean; partner: PartnerRow | null; onClose: () => void }) {
  const docTypes = useQuery(identityDocumentTypesQuery)
  const countries = useQuery(countriesQuery)
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
            country: partner.country,
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
          country: asksCountry ? ((v.country || null) as Schemas['Country']) : null,
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

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
          <Field label="País" hint="De dónde es el proveedor extranjero.">
            {(a) => (
              <Select {...a} {...form.register('country')}>
                <option value="">Elige…</option>
                {countries.data?.map((c) => (
                  <option key={c.country} value={c.country ?? ''}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-xs font-medium text-muted">Rol</legend>
          <label className="flex items-center gap-2.5 text-base">
            <input type="checkbox" className="size-4 [accent-color:var(--ink)]" {...form.register('isClient')} />
            Cliente: le vendemos
          </label>
          <label className="flex items-center gap-2.5 text-base">
            <input type="checkbox" className="size-4 [accent-color:var(--ink)]" {...form.register('isSupplier')} />
            Proveedor: le compramos
          </label>
        </fieldset>
      </form>
    </Dialog>
  )
}
