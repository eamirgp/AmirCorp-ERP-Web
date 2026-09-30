import { useForm } from 'react-hook-form'
import { errorMessages } from '@/api/client'
import { useBlockPartnerRole, type PartnerApiRole, type PartnerRow } from '@/api/partners'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'

/**
 * Confirma el bloqueo de compras (proveedor) o de ventas (cliente), con un motivo opcional que queda en la lista y
 * en el historial. El otro rol no cambia: si también es cliente, se le sigue vendiendo.
 */
export function BlockRoleDialog({ partner, role, onClose }: { partner: PartnerRow; role: PartnerApiRole; onClose: () => void }) {
  const block = useBlockPartnerRole()
  const form = useForm({ defaultValues: { reason: '' } })
  const isSupplier = role === 'Supplier'
  const action = isSupplier ? 'Bloquear compras' : 'Bloquear ventas'
  const otherRole = isSupplier ? partner.isClient && 'Como cliente no cambia: se le puede seguir vendiendo.' : partner.isSupplier && 'Como proveedor no cambia: se le puede seguir comprando.'

  const onSubmit = form.handleSubmit((v) =>
    block.mutate(
      { id: partner.id, role, blocked: true, reason: v.reason.trim() },
      {
        onSuccess: () => {
          toast.ok(`${isSupplier ? 'Compras' : 'Ventas'} bloqueadas: ${partner.name}`)
          onClose()
        },
      },
    ),
  )

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && !block.isPending && onClose()}
      width="max-w-md"
      title={action}
      description={partner.name}
      footer={
        <>
          <Button onClick={onClose} disabled={block.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" type="submit" form="block-form" loading={block.isPending}>
            {action}
          </Button>
        </>
      }
    >
      <form id="block-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={block.isError ? errorMessages(block.error) : []} />
        <div className="flex flex-col gap-2 text-base text-muted">
          <p>
            {isSupplier
              ? 'Ya no se podrá elegir en compras nuevas. Las compras que ya tiene no cambian.'
              : 'Ya no se podrá elegir en ventas nuevas. Las ventas que ya tiene no cambian.'}
          </p>
          {otherRole && <p>{otherRole}</p>}
          <p>Puedes desbloquearlas cuando quieras.</p>
        </div>
        <Field label="Motivo (opcional)" hint="Por ejemplo: mercadería defectuosa, deuda pendiente.">
          {(a) => <Input {...a} autoFocus {...form.register('reason')} />}
        </Field>
      </form>
    </Dialog>
  )
}
