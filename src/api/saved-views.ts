import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap, type Schemas } from './client'

export type SavedView = Schemas['ListSavedViewsResponseDto']
export type SavedViewScreen = NonNullable<Schemas['SavedViewScreen']>

export const savedViewKeys = {
  all: ['saved-views'] as const,
  screen: (screen: SavedViewScreen) => [...savedViewKeys.all, screen] as const,
}

/** Vistas del usuario en una pantalla. La API las ordena: la predeterminada primero, luego por nombre. */
export const savedViewsQuery = (screen: SavedViewScreen) =>
  queryOptions({
    queryKey: savedViewKeys.screen(screen),
    queryFn: () => unwrap(api.GET('/api/saved-views', { params: { query: { Screen: screen } } })),
    staleTime: 5 * 60_000,
  })

export interface SavedViewInput {
  name: string
  filters: string
  isDefault: boolean
}

export function useSavedViewMutations(screen: SavedViewScreen) {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey: savedViewKeys.screen(screen) })

  const create = useMutation({
    mutationFn: (input: SavedViewInput) => unwrap(api.POST('/api/saved-views', { body: { screen, ...input } })),
    onSuccess,
  })

  const update = useMutation({
    mutationFn: ({ id, ...input }: SavedViewInput & { id: string }) =>
      unwrap(api.PUT('/api/saved-views/{id}', { params: { path: { id } }, body: input })),
    onSuccess,
  })

  const remove = useMutation({
    mutationFn: (id: string) => unwrap(api.DELETE('/api/saved-views/{id}', { params: { path: { id } } })),
    onSuccess,
  })

  return { create, update, remove }
}
