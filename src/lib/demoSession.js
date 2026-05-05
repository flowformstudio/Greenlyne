/**
 * Demo session — values captured in PMPro's Quick Prescreen modal that should
 * carry through the entire demo (Pipeline → Email → Solar Calculator → Application).
 *
 * Backed by localStorage so values persist across route changes / reloads.
 * All consumers should fall back to DEMO_PERSONA when a field is missing.
 */

const KEY = 'greenlyne_demo_session'

export function getDemoSession() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setDemoSession(updates = {}) {
  if (typeof window === 'undefined') return
  try {
    const current = getDemoSession()
    const next    = { ...current, ...updates }
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore quota / privacy errors
  }
}

export function clearDemoSession() {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(KEY) } catch {}
}
