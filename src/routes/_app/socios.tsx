import { createFileRoute, redirect } from '@tanstack/react-router'

// "Clientes y proveedores" se dividió en dos listas. La dirección vieja lleva a Proveedores, donde están casi todos.
export const Route = createFileRoute('/_app/socios')({
  beforeLoad: () => {
    throw redirect({ to: '/proveedores', replace: true })
  },
})
