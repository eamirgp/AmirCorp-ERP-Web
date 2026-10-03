import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Ban, HistoryIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { errorMessages } from '@/api/client'
import { purchaseQuery, useCancelPurchase, type PurchaseDetail } from '@/api/purchases'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/field'
import { Loading } from '@/components/ui/list-controls'
import { ErrorList, Pill } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'
import { HistorySheet } from '@/features/audit/history-sheet'
import { Totals } from '@/features/purchases/totals'
import { formatDate, formatDecimal, formatMoney } from '@/lib/format'

export const Route = createFileRoute('/_app/compras/$id')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(purchaseQuery(params.id)),
  component: PurchaseDetailPage,
})

function PurchaseDetailPage() {
  const { id } = Route.useParams()
  const purchase = useQuery(purchaseQuery(id))
  const [cancelling, setCancelling] = useState(false)
  const [history, setHistory] = useState(false)

  if (purchase.isError) return <ErrorList messages={errorMessages(purchase.error)} />
  if (!purchase.data) return <Loading text="Cargando compra…" />
  const p = purchase.data
  const money = (v: number) => formatMoney(v, p.currency)

  return (
    <>
      <Link to="/compras" className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" />
        Compras
      </Link>

      <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">{p.taxDocumentTypeDescription}</p>
          <h1 className="flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-2xl font-semibold">
            <span className="font-mono tracking-tight">{p.fullNumber}</span>
            {p.isCancelled ? <Pill tone="bad">Anulada</Pill> : <Pill tone="ok">Registrada</Pill>}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setHistory(true)}>
            <HistoryIcon />
            Historial
          </Button>
          {!p.isCancelled && (
            <Button variant="danger" onClick={() => setCancelling(true)}>
              <Ban />
              Anular compra
            </Button>
          )}
        </div>
      </header>

      {p.isCancelled && (
        <p className="border-l-2 border-bad bg-bad-soft px-3.5 py-2.5 text-base text-bad">
          Anulada. Motivo: {p.cancellationReason}
        </p>
      )}

      <dl className="grid gap-x-8 gap-y-4 border-y border-line py-5 text-base sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Empresa">{p.companyName}</Info>
        <Info label="Proveedor">
          {p.supplierName}
          <span className="block font-mono text-xs text-faint">
            {p.supplierIdentityDocumentTypeDescription} {p.supplierDocumentNumber}
          </span>
        </Info>
        <Info label="Fecha de emisión">{formatDate(p.issueDate)}</Info>
        <Info label="Moneda">
          {p.currencyDescription}
          {p.exchangeRate != null && <span className="block text-xs text-faint">Tipo de cambio {formatDecimal(p.exchangeRate)}</span>}
        </Info>
      </dl>

      <section className="overflow-x-auto">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="text-left text-xs text-faint">
              <Th>#</Th>
              <Th>Producto</Th>
              <Th>Unidad</Th>
              <Th right>Cantidad</Th>
              <Th right>{p.invoicePriceTypeDescription}</Th>
              <Th right>Base</Th>
              <Th right>IGV</Th>
              <Th right>Total</Th>
            </tr>
          </thead>
          <tbody>
            {p.lines.map((l) => (
              <tr key={l.lineNumber} className="border-b border-line">
                <Td className="text-faint">{l.lineNumber}</Td>
                <Td>
                  {l.productName}
                  {/* El código de la factura es una copia: aunque el enlace se corrija después en Productos, aquí queda lo que decía el comprobante. */}
                  {l.supplierProductCode && (
                    <span className="block text-xs text-faint">
                      Código en la factura: <span className="font-mono text-muted">{l.supplierProductCode}</span>
                    </span>
                  )}
                  <span className="block text-xs text-faint">
                    Código interno: <span className="font-mono">{l.productCode}</span> · {l.invoiceIgvAffectationDescription}
                  </span>
                </Td>
                <Td className="text-muted">{l.invoiceUnitOfMeasureName}</Td>
                <Td right>{formatDecimal(l.invoiceQuantity)}</Td>
                <Td right>{formatDecimal(l.invoiceUnitAmount)}</Td>
                <Td right>{money(l.baseAmount)}</Td>
                <Td right>{money(l.igvAmount)}</Td>
                <Td right>
                  {money(l.total)}
                  {/* Lo que entró al inventario, como al registrarla: "120 und. (24 por caja) · costo 5.00 c/u". */}
                  <span className="block text-xs whitespace-nowrap text-faint">{l.inventoryDescription}</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Totals base={money(p.totalBaseAmount)} igv={money(p.totalIgvAmount)} total={money(p.total)} />

      <HistorySheet target={history ? { entityType: 'Purchase', entityId: p.id, label: `${p.taxDocumentTypeDescription} ${p.fullNumber} · ${p.supplierName}` } : null} onClose={() => setHistory(false)} />

      {cancelling && <CancelDialog purchase={p} onClose={() => setCancelling(false)} />}
    </>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps pb-1">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => (
  <th className={`border-b border-line px-3 py-2.5 font-normal whitespace-nowrap first:pl-0 last:pr-0 ${right ? 'text-right' : ''}`}>{children}</th>
)

const Td = ({ children, right, className = '' }: { children: ReactNode; right?: boolean; className?: string }) => (
  <td className={`px-3 py-3 align-top first:pl-0 last:pr-0 ${right ? 'num text-right whitespace-nowrap' : ''} ${className}`}>{children}</td>
)

function CancelDialog({ purchase, onClose }: { purchase: PurchaseDetail; onClose: () => void }) {
  const cancel = useCancelPurchase(purchase.id)
  const form = useForm({ defaultValues: { reason: '' } })
  const onSubmit = form.handleSubmit((v) => cancel.mutate(v.reason, { onSuccess: () => (toast.ok('Compra anulada'), onClose()) }))

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Anular compra"
      description={`${purchase.fullNumber} · ${purchase.supplierName}. La mercadería de esta compra sale del stock.`}
      footer={
        <>
          <Button onClick={onClose}>Volver</Button>
          <Button variant="danger" type="submit" form="cancel-form" loading={cancel.isPending}>
            Anular compra
          </Button>
        </>
      }
    >
      <form id="cancel-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={cancel.isError ? errorMessages(cancel.error) : []} />
        <Field label="Motivo de la anulación">{(a) => <Input {...a} autoFocus {...form.register('reason')} />}</Field>
      </form>
    </Dialog>
  )
}
