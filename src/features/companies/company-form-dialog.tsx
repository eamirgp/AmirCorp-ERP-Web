import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { errorMessages } from '@/api/client'
import { useSaveCompany, type CompanyRow } from '@/api/companies'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'

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

  const onSubmit = form.handleSubmit((v) =>
    save.mutate(
      { id: company?.id, input: v },
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
        <Field label="RUC">{(a) => <Input {...a} className="font-mono" inputMode="numeric" autoFocus {...form.register('ruc')} />}</Field>
        <Field label="Razón social">{(a) => <Input {...a} {...form.register('name')} />}</Field>      </form>
    </Dialog>
  )
}
