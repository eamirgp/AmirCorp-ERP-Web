import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from './client'

export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: () => unwrap(api.GET('/api/me')),
  staleTime: 5 * 60_000,
})

export const login = (email: string, password: string) =>
  unwrap(api.POST('/api/auth/login', { body: { email, password } }))
