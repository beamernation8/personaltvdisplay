import { useEffect, useRef } from 'react'

/**
 * Calls the supplied callback whenever the document becomes visible
 * (e.g. TV wakes from sleep, browser tab regains focus, monitor turns on).
 *
 * Used so widgets refresh their data instantly the moment the user looks
 * at the dashboard, instead of waiting for the next polling interval.
 */
export function useVisibilityRefresh(onVisible) {
  const cbRef = useRef(onVisible)
  cbRef.current = onVisible

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') cbRef.current?.()
    }
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('focus', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('focus', handler)
    }
  }, [])
}
