import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { login } from '@/api/account'
import { ApiError, errorMessages } from '@/api/client'
import { brand } from '@/brand'
import { AppIcon } from '@/brand/app-icon'
import { FloatingField } from '@/components/ui/floating-field'
import { InlineError } from '@/components/ui/inline-error'
import { PillButton } from '@/components/ui/pill-button'
import { shake } from '@/lib/motion'
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

/** Retraso de entrada de cada bloque: aparecen en orden, uno tras otro (docs/diseno.md, "Movimiento"). */
const enter = (ms: number) => ({ animationDelay: `${ms}ms` })

/**
 * Inicio de sesión en el estilo Apple aprobado (docs/diseno.md), como Cuenta de Apple: centrado, en una columna, con el
 * ícono de la marca arriba. Blanco siempre, también con el sistema en modo oscuro.
 */
function LoginPage() {
  const router = useRouter()
  const { redirect: target } = Route.useSearch()
  const form = useForm<FormValues>({ defaultValues: { email: '', password: '' } })
  const [showPassword, setShowPassword] = useState(false)
  // Si la API cerró la sesión (cuenta desactivada…), se dice por qué hasta que se intente entrar de nuevo.
  const endReason = session.endReason

  const fields = useRef<HTMLFieldSetElement>(null)

  const mutation = useMutation({
    mutationFn: (v: FormValues) => login(v.email, v.password),
    onSuccess: (response) => {
      session.start(response)
      router.history.push(safeRedirect(target))
    },
    // Como Apple: si la API no deja entrar (401: correo o contraseña incorrectos, cuenta desactivada), los campos se
    // sacuden. Una falla de conexión o "demasiados intentos" no: no es que se haya escrito mal.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) shake(fields.current)
    },
  })

  // Al volver a escribir, el error se va (el rojo de los campos y el mensaje), como en Cuenta de Apple. También el motivo
  // de un cierre de sesión anterior: ya se leyó.
  const [typed, setTyped] = useState(false)
  const clearError = () => {
    setTyped(true)
    if (mutation.isError) mutation.reset()
  }

  const messages = mutation.isError ? errorMessages(mutation.error) : mutation.isIdle && endReason && !typed ? [endReason] : []

  return (
    <main className="always-light flex min-h-dvh flex-col items-center justify-center bg-page px-6 py-14 text-fg">
      <div className="grow-on-large flex flex-col items-center">
        <AppIcon className="mb-6" />
        <div className="animate-enter flex flex-col items-center gap-2.5 text-center" style={enter(150)}>
          {/* Como la ventana de inicio de sesión de Apple: el título es la acción y debajo, dónde se entra. */}
          <h1 className="font-display text-5xl font-bold tracking-[-0.025em]">Inicia sesión</h1>
          <p className="text-lg text-fg-muted">Portal de gestión de {brand.name}.</p>
        </div>
      </div>

      <form className="grow-on-large-subtle mt-10 flex w-full max-w-[360px] flex-col gap-3.5" onSubmit={form.handleSubmit((v) => mutation.mutate(v))} noValidate>
        {/* Mientras se entra, los campos quedan bloqueados. */}
        <fieldset ref={fields} disabled={mutation.isPending} className="m-0 flex flex-col gap-3.5 border-0 p-0">
          <FloatingField
            label="Correo"
            type="email"
            autoComplete="username"
            autoFocus
            aria-invalid={mutation.isError}
            className="animate-enter"
            style={enter(260)}
            {...form.register('email', { onChange: clearError })}
          />
          <FloatingField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={mutation.isError}
            className="animate-enter"
            style={enter(320)}
            {...form.register('password', { onChange: clearError })}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="press h-9 rounded-lg px-2.5 text-sm font-semibold text-link hover:opacity-75"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            }
          />
        </fieldset>

        {/* El error va junto a los campos, no en un recuadro aparte (Apple: avisar cerca de lo que describe). */}
        <InlineError messages={messages} />

        <PillButton type="submit" loading={mutation.isPending} className="animate-enter mt-2.5" style={enter(380)}>
          {mutation.isPending ? 'Entrando…' : 'Continuar'}
        </PillButton>

        <p className="animate-enter mt-3.5 text-center text-sm text-balance text-fg-muted" style={enter(440)}>
          ¿Problemas para entrar? Habla con el administrador del sistema.
        </p>
      </form>

      <p className="animate-enter mt-16 text-center text-xs text-balance text-fg-muted" style={enter(520)}>
        Acceso exclusivo para colaboradores autorizados · {brand.legalName}
      </p>
    </main>
  )
}
