import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { ApiError } from './api'

interface State<T> {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: string | null
}

/**
 * Fetches `fetcher()` on focus and exposes pull-to-refresh state. Re-runs
 * whenever `deps` changes (e.g. a filter or the active persona).
 */
export function useApiQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, refreshing: false, error: null })

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      setState((s) => ({ ...s, loading: mode === 'initial', refreshing: mode === 'refresh', error: null }))
      try {
        const data = await fetcher()
        setState({ data, loading: false, refreshing: false, error: null })
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'নেটওয়ার্ক সমস্যা হয়েছে'
        setState((s) => ({ ...s, loading: false, refreshing: false, error: message }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  )

  useFocusEffect(
    useCallback(() => {
      load('initial')
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
  )

  return {
    ...state,
    refresh: () => load('refresh'),
    reload: () => load('initial'),
  }
}

export interface ApiPage<T> {
  items: T[]
  /** Total row count when the endpoint reports one — used for the "মোট" line. */
  total?: number
  hasMore: boolean
}

interface InfiniteState<T> {
  items: T[]
  total: number | null
  page: number
  hasMore: boolean
  loading: boolean
  refreshing: boolean
  loadingMore: boolean
  error: string | null
}

const initialInfinite = <T,>(): InfiniteState<T> => ({
  items: [],
  total: null,
  page: 0,
  hasMore: true,
  loading: true,
  refreshing: false,
  loadingMore: false,
  error: null,
})

/**
 * Offset pagination for the endless lists (catalog, orders, users…). The
 * backend is uniformly `?page=&perPage=` with a total — there is no cursor
 * anywhere — so a page number plus "did the last page come back full" is all
 * the state we need.
 *
 * Every load carries a generation number: a slow page 1 landing after the
 * user has already typed a new search term must not append itself to the new
 * list. `deps` resets the list from scratch (a filter or persona change).
 */
export function useApiInfinite<T>(fetchPage: (page: number) => Promise<ApiPage<T>>, deps: unknown[] = []) {
  const [state, setState] = useState<InfiniteState<T>>(initialInfinite<T>)
  const generation = useRef(0)
  // Kept in a ref as well as state so loadMore can be called from
  // onEndReached without being re-created (and re-firing) on every render.
  const cursor = useRef({ page: 0, inFlight: false, hasMore: true })

  const load = useCallback(
    async (mode: 'initial' | 'refresh' | 'more') => {
      if (cursor.current.inFlight) return
      if (mode === 'more' && !cursor.current.hasMore) return

      const nextPage = mode === 'more' ? cursor.current.page + 1 : 1
      const gen = ++generation.current
      cursor.current.inFlight = true

      setState((s) =>
        mode === 'more'
          ? { ...s, loadingMore: true, error: null }
          : { ...s, loading: mode === 'initial', refreshing: mode === 'refresh', error: null }
      )

      try {
        const page = await fetchPage(nextPage)
        if (gen !== generation.current) return
        cursor.current.page = nextPage
        cursor.current.hasMore = page.hasMore
        setState((s) => ({
          items: mode === 'more' ? [...s.items, ...page.items] : page.items,
          total: page.total ?? null,
          page: nextPage,
          hasMore: page.hasMore,
          loading: false,
          refreshing: false,
          loadingMore: false,
          error: null,
        }))
      } catch (err) {
        if (gen !== generation.current) return
        const message = err instanceof ApiError ? err.message : 'নেটওয়ার্ক সমস্যা হয়েছে'
        setState((s) => ({ ...s, loading: false, refreshing: false, loadingMore: false, error: message }))
      } finally {
        if (gen === generation.current) cursor.current.inFlight = false
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  )

  // A dep change (new filter/search) invalidates the page cursor as well as
  // the rows — without this, page 2 of the old query would be requested.
  useEffect(() => {
    cursor.current = { page: 0, inFlight: false, hasMore: true }
    setState(initialInfinite<T>())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useFocusEffect(
    useCallback(() => {
      // Only the first page is re-fetched on focus; a user who has scrolled
      // ten pages deep and pops back from a detail screen keeps their place
      // because we merge rather than truncate.
      if (cursor.current.page === 0) load('initial')
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
  )

  return {
    ...state,
    loadMore: () => load('more'),
    refresh: () => load('refresh'),
    reload: () => load('initial'),
    /** Optimistic in-place row patching after a mutation. */
    patchItem: (match: (item: T) => boolean, update: (item: T) => T) =>
      setState((s) => ({ ...s, items: s.items.map((it) => (match(it) ? update(it) : it)) })),
  }
}
