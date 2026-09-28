import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { login } from '@/api/account'
import { errorMessages } from '@/api/client'
import { brand } from '@/brand'
import { Logo } from '@/brand/logo'
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
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <form className="flex w-full max-w-[380px] flex-col gap-5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
        <Logo size={28} className="mb-6 self-center" />

        <div className="text-center">
          <h1 className="font-display text-xl font-semibold">Iniciar sesión</h1>
          <p className="mt-1 text-base text-muted">Ingresa con tu correo y contraseña.</p>
        </div>

        <ErrorList messages={mutation.isError ? errorMessages(mutation.error) : []} />

        <Field label="Correo">
          {(a) => <Input {...a} type="email" autoComplete="username" autoFocus {...form.register('email')} />}
        </Field>
        <Field label="Contraseña">
          {(a) => <Input {...a} type="password" autoComplete="current-password" {...form.register('password')} />}
        </Field>

        <Button type="submit" variant="primary" loading={mutation.isPending} className="mt-1 h-11">
          Entrar
        </Button>
      </form>

      <p className="mt-16 text-xs text-faint">{brand.legalName}</p>
    </div>
  )
}
