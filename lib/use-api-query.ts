import { useCallback, useEffect, useState } from 'react'
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
