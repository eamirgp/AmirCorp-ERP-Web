import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { identityDocumentTypesQuery } from '@/api/catalogs'
import { errorMessages } from '@/api/client'
import { useLookupCompanyRuc, useSaveCompany, type CompanyRow } from '@/api/companies'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { LookupResult } from '@/components/ui/lookup-result'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { compactDocument, lookupOnEnter, useLookedUpName } from '@/features/shared/use-looked-up-name'

interface Values {
  ruc: string
  name: string
}

export function CompanyFormDialog({ open, company, onClose }: { open: boolean; company: CompanyRow | null; onClose: () => void }) {
  const save = useSaveCompany()
  const form = useForm<Values>({ defaultValues: { ruc: '', name: '' } })

  useEffect(() => {
    if (!open) return
    save.reset()
    form.reset(company ? { ruc: company.ruc, name: company.name } : { ruc: '', name: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company])

  // Buscar el RUC en SUNAT: lo pide el usuario con el botón o con Enter, nunca solo (cada consulta cuenta en el cupo).
  // Si la consulta no está configurada, la API no da fuente para el RUC: el botón no aparece y la razón social se
  // escribe a mano (como en clientes y proveedores).
  const docTypes = useQuery(identityDocumentTypesQuery)
  const source = docTypes.data?.find((d) => d.identityDocumentType === 'Ruc')?.lookupSource ?? null
  const lookup = useLookupCompanyRuc()
  const ruc = form.watch('ruc')
  const name = useLookedUpName({
    getName: () => form.getValues('name'),
    setName: (v) => form.setValue('name', v),
    getDocument: () => form.getValues('ruc'),
    onDocumentChange: () => lookup.reset(),
    deps: [open, ruc],
  })

  const searchSunat = () =>
    lookup.mutate({ ruc: compactDocument(ruc), companyId: company?.id }, { onSuccess: (r, asked) => name.fill(r.name, asked.ruc) })

  const onSubmit = form.handleSubmit((v) =>
    save.mutate(
      { edit: company ? { id: company.id, rowVersion: company.rowVersion } : undefined, input: v },
      {
        onSuccess: () => {
          toast.ok(company ? 'Empresa actualizada' : 'Empresa creada')
          onClose()
        },
      },
    ),
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      // Un poco más ancho que el estándar: el RUC lleva al lado el botón "SUNAT".
      width="max-w-xl"
      title={company ? 'Editar empresa' : 'Nueva empresa'}
      description={company ? `RUC ${company.ruc}` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" form="company-form" loading={save.isPending}>
            {company ? 'Guardar cambios' : 'Crear empresa'}
          </Button>
        </>
      }
    >
      <form id="company-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={save.isError ? errorMessages(save.error) : []} />
        <Field label="RUC" hint={source ? `Presiona ${source} o Enter para ${company ? 'actualizar' : 'traer'} la razón social.` : undefined}>
          {(a) => (
            <div className="flex items-start gap-2">
              <Input
                {...a}
                className="min-w-0 flex-1 font-mono"
                inputMode="numeric"
                autoFocus
                {...form.register('ruc')}
                onKeyDown={source ? lookupOnEnter(() => !lookup.isPending && !!compactDocument(ruc), searchSunat) : undefined}
              />
              {source && (
                <Button className="mt-1.5" onClick={searchSunat} loading={lookup.isPending} disabled={!compactDocument(ruc)} title={`Trae la razón social desde ${source}`}>
                  <Search />
                  {source}
                </Button>
              )}
            </div>
          )}
        </Field>
        {lookup.isError && <ErrorList messages={errorMessages(lookup.error)} />}
        {lookup.data && <LookupResult data={lookup.data} />}
        <Field label="Razón social">{(a) => <Input {...a} {...form.register('name')} />}</Field>
      </form>
    </Dialog>
  )
}
