import { useCallback, useEffect, useState } from 'react'

export function useDashboardData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    return fetch('/api/dashboard')
      .then((res) => res.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, refresh }
}
