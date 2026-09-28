import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { login } from '@/api/account'
import { errorMessages } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { session } from '@/lib/session'

const searchSchema = z.object({ redirect: z.string().optional().catch(undefined) })

export const Route = createFileRoute('/login')({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: ({ search }) => {
    if (session.isAuthenticated) throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: LoginPage,
})

/** Solo se permite volver a rutas internas, nunca a otro sitio. */
function safeRedirect(target?: string) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

// Sin reglas propias: la API valida el correo y la contraseña y devuelve los mensajes.
type FormValues = { email: string; password: string }

function LoginPage() {
  const router = useRouter()
  const { redirect: target } = Route.useSearch()
  const form = useForm<FormValues>({ defaultValues: { email: '', password: '' } })

  const mutation = useMutation({
    mutationFn: (v: FormValues) => login(v.email, v.password),
    onSuccess: ({ token }) => {
      session.start(token)
      router.history.push(safeRedirect(target))
    },
  })

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-accent p-12 text-accent-ink lg:flex lg:flex-col">
        <ManifestPattern />
        <div className="relative flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-ink/15 font-display text-[15px] font-extrabold">AC</span>
          <span className="font-display text-xl font-bold">AmirCorp</span>
        </div>
        <div className="relative mt-auto max-w-md">
          <h2 className="font-display text-[34px] leading-[1.1] font-bold tracking-[-0.015em]">
            Del contenedor en Ningbo a la factura en Lima.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed opacity-85">
            Importaciones, inventario y ventas de tus empresas en un solo lugar, con el costo real de cada producto puesto en almacén.
          </p>
        </div>
      </aside>

      <main className="grid place-items-center px-5 py-12">
        <form className="flex w-full max-w-sm flex-col gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
          <div>
            <h1 className="font-display text-[28px] font-bold tracking-[-0.01em]">Iniciar sesión</h1>
            <p className="mt-1 text-[13.5px] text-muted">Ingresa con tu correo y contraseña.</p>
          </div>

          <ErrorList messages={mutation.isError ? errorMessages(mutation.error) : []} />

          <Field label="Correo">
            {(a) => <Input {...a} type="email" autoComplete="username" autoFocus {...form.register('email')} />}
          </Field>
          <Field label="Contraseña">
            {(a) => <Input {...a} type="password" autoComplete="current-password" {...form.register('password')} />}
          </Field>

          <Button type="submit" variant="primary" loading={mutation.isPending} className="mt-1 h-10">
            Entrar
          </Button>
        </form>
      </main>
    </div>
  )
}

/** Trama sutil de líneas de un manifiesto de carga, dibujada en SVG. */
function ManifestPattern() {
  return (
    <svg className="absolute inset-0 size-full opacity-[0.09]" aria-hidden>
      <defs>
        <pattern id="manifest" width="220" height="44" patternUnits="userSpaceOnUse">
          <line x1="0" y1="43.5" x2="220" y2="43.5" stroke="currentColor" />
          <rect x="12" y="16" width="64" height="8" rx="2" fill="currentColor" />
          <rect x="92" y="16" width="36" height="8" rx="2" fill="currentColor" />
          <rect x="164" y="16" width="44" height="8" rx="2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#manifest)" />
    </svg>
  )
}
