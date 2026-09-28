import { useQuery } from '@tanstack/react-query'
import { useEffect, type ComponentProps } from 'react'
import { useForm } from 'react-hook-form'
import { assignableRolesQuery } from '@/api/catalogs'
import { errorMessages, type Schemas } from '@/api/client'
import { useChangeUserRole, useCreateUser, useResetUserPassword, useUpdateUserProfile, type UserRow } from '@/api/users'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { ErrorList } from '@/components/ui/misc'
import { toast } from '@/components/ui/toast'

type Mode = 'create' | 'profile' | 'role' | 'password'

/**
 * Diálogos de usuarios: crear, editar perfil, cambiar rol y restablecer contraseña.
 * Qué roles se pueden asignar lo decide la API (GET /api/users/roles).
 */
export function UserDialog({ mode, user, onClose }: { mode: Mode | null; user: UserRow | null; onClose: () => void }) {
  if (mode === 'create') return <CreateUserDialog onClose={onClose} />
  if (!user) return null
  if (mode === 'profile') return <ProfileDialog user={user} onClose={onClose} />
  if (mode === 'role') return <RoleDialog user={user} onClose={onClose} />
  if (mode === 'password') return <PasswordDialog user={user} onClose={onClose} />
  return null
}

function Footer({ formId, label, pending, onClose }: { formId: string; label: string; pending: boolean; onClose: () => void }) {
  return (
    <>
      <Button onClick={onClose}>Cancelar</Button>
      <Button variant="primary" type="submit" form={formId} loading={pending}>
        {label}
      </Button>
    </>
  )
}

function RoleSelect(props: ComponentProps<'select'>) {
  const roles = useQuery(assignableRolesQuery)
  return (
    <Select {...props}>
      <option value="">Elige…</option>
      {roles.data?.map((r) => (
        <option key={r.userRole} value={r.userRole ?? ''}>
          {r.description}
        </option>
      ))}
    </Select>
  )
}

function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateUser()
  const form = useForm({ defaultValues: { name: '', email: '', password: '', role: '' } })

  useEffect(() => {
    create.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = form.handleSubmit((v) =>
    create.mutate({ ...v, role: (v.role || null) as Schemas['UserRole'] }, { onSuccess: () => (toast.ok('Usuario creado'), onClose()) }),
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Nuevo usuario" footer={<Footer formId="user-form" label="Crear usuario" pending={create.isPending} onClose={onClose} />}>
      <form id="user-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={create.isError ? errorMessages(create.error) : []} />
        <Field label="Nombre">{(a) => <Input {...a} autoFocus {...form.register('name')} />}</Field>
        <Field label="Correo">{(a) => <Input {...a} type="email" autoComplete="off" {...form.register('email')} />}</Field>
        <Field label="Contraseña inicial">{(a) => <Input {...a} type="password" autoComplete="new-password" {...form.register('password')} />}</Field>
        <Field label="Rol">{(a) => <RoleSelect {...a} {...form.register('role')} />}</Field>
      </form>
    </Dialog>
  )
}

function ProfileDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const update = useUpdateUserProfile()
  const form = useForm({ defaultValues: { name: user.name, email: user.email } })
  const onSubmit = form.handleSubmit((v) => update.mutate({ id: user.id, input: v }, { onSuccess: () => (toast.ok('Usuario actualizado'), onClose()) }))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Editar usuario" description={user.email} footer={<Footer formId="profile-form" label="Guardar cambios" pending={update.isPending} onClose={onClose} />}>
      <form id="profile-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={update.isError ? errorMessages(update.error) : []} />
        <Field label="Nombre">{(a) => <Input {...a} autoFocus {...form.register('name')} />}</Field>
        <Field label="Correo">{(a) => <Input {...a} type="email" autoComplete="off" {...form.register('email')} />}</Field>
      </form>
    </Dialog>
  )
}

function RoleDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const change = useChangeUserRole()
  const form = useForm({ defaultValues: { role: user.role ?? '' } })
  const onSubmit = form.handleSubmit((v) =>
    change.mutate({ id: user.id, role: (v.role || null) as Schemas['UserRole'] }, { onSuccess: () => (toast.ok('Rol actualizado'), onClose()) }),
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Cambiar rol" description={`${user.name} · ${user.roleDescription}`} footer={<Footer formId="role-form" label="Cambiar rol" pending={change.isPending} onClose={onClose} />}>
      <form id="role-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={change.isError ? errorMessages(change.error) : []} />
        <Field label="Nuevo rol">{(a) => <RoleSelect {...a} autoFocus {...form.register('role')} />}</Field>
      </form>
    </Dialog>
  )
}

function PasswordDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const reset = useResetUserPassword()
  const form = useForm({ defaultValues: { newPassword: '' } })
  const onSubmit = form.handleSubmit((v) => reset.mutate({ id: user.id, newPassword: v.newPassword }, { onSuccess: () => (toast.ok('Contraseña restablecida'), onClose()) }))

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Restablecer contraseña"
      description={`${user.name} deberá usar esta contraseña en su próximo inicio de sesión.`}
      footer={<Footer formId="password-form" label="Restablecer" pending={reset.isPending} onClose={onClose} />}
    >
      <form id="password-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ErrorList messages={reset.isError ? errorMessages(reset.error) : []} />
        <Field label="Nueva contraseña">{(a) => <Input {...a} type="password" autoComplete="new-password" autoFocus {...form.register('newPassword')} />}</Field>
      </form>
    </Dialog>
  )
}
