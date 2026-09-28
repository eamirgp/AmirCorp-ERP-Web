import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { login } from '@/api/account'
import { errorMessages } from '@/api/client'
import { brand } from '@/brand'
import { Logo } from '@/brand/logo'
import { WheelMotif } from '@/brand/wheel-motif'
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
      <aside className="relative hidden overflow-hidden bg-side-bg p-12 text-white lg:flex lg:flex-col">
        {/* La tapa de rueda del logo, grande y recortada en la esquina superior derecha. */}
        <WheelMotif className="pointer-events-none absolute -top-[6%] -right-[6%] w-[58%] -scale-x-100 text-accent" />
        <Logo size={30} tone="dark" className="relative" />
        <div className="relative mt-auto max-w-md">
          <p className="label-caps !text-accent">{brand.tagline}</p>
          <h2 className="mt-4 font-display text-[40px] leading-[1.02] font-bold tracking-[-0.02em]">{brand.login.headline}</h2>
          <p className="mt-5 max-w-sm text-[15.5px] leading-relaxed text-white/70">{brand.login.text}</p>
        </div>
      </aside>

      <main className="grid place-items-center px-5 py-12">
        <form className="flex w-full max-w-sm flex-col gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
          <Logo size={24} className="mb-4 lg:hidden" />
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
