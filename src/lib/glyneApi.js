/**
 * Tiny client for the Greenlyne API, going through our Vercel proxy at
 * /api/glyne (which attaches the demo service-account auth server-side).
 *
 * Usage:
 *   const data = await glyneFetch('get-properties-count', { polygon_coordinates: [...] })
 */

const PROXY_BASE = '/api/glyne'

/**
 * Make an authenticated POST/GET to the Greenlyne API via the proxy.
 *   path  — Greenlyne API path *without* leading slash, e.g. 'get-properties-count'
 *   body  — JSON body (POST) or null/undefined for GET
 *   query — extra query params to forward to the upstream
 */
export async function glyneFetch(path, body, query = {}) {
  const params = new URLSearchParams()
  params.set('p', path.replace(/^\/+/, ''))
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null) params.set(k, String(v))
  }
  const url = `${PROXY_BASE}?${params.toString()}`

  const init = {
    method: body == null ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  }
  const res = await fetch(url, init)
  const ct = res.headers.get('content-type') || ''
  const json = ct.includes('application/json') ? await res.json().catch(() => null) : null
  if (!res.ok) {
    const msg = json?.error || json?.detail || `${res.status} ${res.statusText}`
    const err = new Error(`[glyneApi] ${msg}`)
    err.status = res.status
    err.body = json
    throw err
  }
  return json
}

/* ── Convenience wrappers for the geo flow ─────────────────────────────── */

/** Properties count inside a polygon (lat/lng pairs). */
export function getPropertiesCountPolygon(latlngs) {
  // Backend GeoDjango expects a CLOSED LinearRing — repeat the first point
  // at the end if the caller hasn't done it. We pass [lat, lng] order; if
  // the upstream returns wrong totals we'll flip to [lng, lat].
  const ring = (latlngs && latlngs.length)
    ? (sameLatLng(latlngs[0], latlngs[latlngs.length - 1]) ? latlngs : [...latlngs, latlngs[0]])
    : []
  return glyneFetch('get-properties-count', { polygon_coordinates: ring })
}

function sameLatLng(a, b) {
  if (!a || !b) return false
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9
}

/** Properties count inside a circle (center [lat,lng], radius in meters). */
export function getPropertiesCountCircle(center, radiusMeters) {
  return glyneFetch('get-properties-count', {
    shape_type: 'circle',
    shape_config: { center: { lat: center[0], lng: center[1] }, radius: radiusMeters },
  })
}

/** Demographics for a campaign target area. */
export function getCampaignDemographics(payload) {
  return glyneFetch('get-campaign-target-area-demographics', payload)
}
