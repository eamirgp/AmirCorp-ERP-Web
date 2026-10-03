import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { meQuery } from './account'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type UserRow = Schemas['ListUsersResponseDto']
export type UserRole = NonNullable<Schemas['UserRole']>

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,}

export const usersQuery = queryOptions({
  queryKey: userKeys.lists(),
  queryFn: () => unwrap(api.GET('/api/users')),
})

// También se recarga "mi cuenta": si el usuario editado es quien está usando el sistema, el menú muestra su nombre nuevo.
function useUserMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: userKeys.all }), qc.invalidateQueries({ queryKey: meQuery.queryKey })]),
  })
}

export const useCreateUser = () =>
  useUserMutation((input: Schemas['CreateUserRequest']) => unwrap(api.POST('/api/users', { body: input })))

export const useUpdateUserProfile = () =>
  useUserMutation(({ id, input }: { id: string; input: Schemas['UpdateUserProfileRequest'] }) =>
    unwrap(api.PUT('/api/users/{id}', { params: { path: { id } }, body: input })),
  )

// rowVersion: la versión que se abrió en el formulario; si otra persona lo cambió mientras tanto, la API responde 409.
export const useChangeUserRole = () =>
  useUserMutation(({ id, role, rowVersion }: { id: string; role: Schemas['UserRole']; rowVersion: number }) =>
    unwrap(api.PATCH('/api/users/{id}/role', { params: { path: { id } }, body: { role, rowVersion } })),
  )

export const useResetUserPassword = () =>
  useUserMutation(({ id, newPassword }: { id: string; newPassword: string }) =>
    unwrap(api.PATCH('/api/users/{id}/password', { params: { path: { id } }, body: { newPassword } })),
  )

export const useToggleUser = () =>
  useToggleActive<UserRow>(userKeys.lists(), (id, active) =>
    unwrap(
      active
        ? api.PATCH('/api/users/{id}/activate', { params: { path: { id } } })
        : api.PATCH('/api/users/{id}/deactivate', { params: { path: { id } } }),
    ),
  )
