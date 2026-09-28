import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'
import { useToggleActive } from './mutations'

export type UserRow = Schemas['ListUsersResponseDto']
export type UserRole = NonNullable<Schemas['UserRole']>

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}

export const usersQuery = queryOptions({
  queryKey: userKeys.lists(),
  queryFn: () => unwrap(api.GET('/api/users')),
})

/** Detalle de un usuario, con quién lo creó y quién lo modificó. */
export const userQuery = (id: string) =>
  queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: () => unwrap(api.GET('/api/users/{id}', { params: { path: { id } } })),
  })

function useUserMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }) })
}

export const useCreateUser = () =>
  useUserMutation((input: Schemas['CreateUserRequest']) => unwrap(api.POST('/api/users', { body: input })))

export const useUpdateUserProfile = () =>
  useUserMutation(({ id, input }: { id: string; input: Schemas['UpdateUserProfileRequest'] }) =>
    unwrap(api.PUT('/api/users/{id}', { params: { path: { id } }, body: input })),
  )

export const useChangeUserRole = () =>
  useUserMutation(({ id, role }: { id: string; role: Schemas['UserRole'] }) =>
    unwrap(api.PATCH('/api/users/{id}/role', { params: { path: { id } }, body: { role } })),
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
