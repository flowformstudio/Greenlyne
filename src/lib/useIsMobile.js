import { useEffect, useState } from 'react'

/**
 * Returns true while the viewport is at or below the given breakpoint.
 * Defaults to 768px (standard tablet/mobile cutoff).
 * Uses matchMedia so it doesn't churn on every resize event.
 */
export function useIsMobile(maxWidth = 768) {
  const query = `(max-width: ${maxWidth}px)`
  const get   = () => typeof window !== 'undefined' && window.matchMedia(query).matches
  const [is, setIs] = useState(get)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(query)
    const onChange = e => setIs(e.matches)
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    setIs(mql.matches)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [query])

  return is
}
