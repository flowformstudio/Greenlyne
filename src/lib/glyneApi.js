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

/** Properties count inside a polygon. Caller passes Leaflet [lat, lng] pairs;
 * we flip to GeoJSON [lng, lat] and close the ring before sending. */
export function getPropertiesCountPolygon(latlngs) {
  const ring = toClosedLngLatRing(latlngs)
  return glyneFetch('get-properties-count', { polygon_coordinates: ring })
}

function toClosedLngLatRing(latlngs) {
  if (!latlngs || latlngs.length === 0) return []
  const lngLat = latlngs.map(([lat, lng]) => [lng, lat])
  const first = lngLat[0]
  const last  = lngLat[lngLat.length - 1]
  if (Math.abs(first[0] - last[0]) > 1e-9 || Math.abs(first[1] - last[1]) > 1e-9) {
    lngLat.push([first[0], first[1]])
  }
  return lngLat
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

/** List all saved campaign collections (real data from this tenant). */
export function listSavedCampaigns() {
  return glyneFetch('campaign-collections')
}

/** Detail for a single mail campaign — includes polygon_coordinates + analytics. */
export function getSavedCampaignDetail(id) {
  return glyneFetch(`campaign-collections/mail/${id}/`, {})
}

/**
 * Real property records inside a polygon, with per-shape analytics
 * (median home value/equity, qualifying counts, projected originations).
 *
 * Uses fetch_data_only_from_db=true so we get an immediate response
 * instead of waiting on the Altair WebSocket pipeline (which requires
 * campaign infrastructure). Wider GeoDjango polygon → bigger results.
 */
export function getPropertiesByCriteria(latlngs, opts = {}) {
  const polygon = toClosedLngLatRing(latlngs)
  const body = {
    polygon_coordinates: polygon,
    CLTV: [0, 100],
    FICOScore: [600, 850],
    AvailableEquity: [0, 99_999_000],
    MonthOwnership: [0, 360],
    ApplyCensusTractFilter: false,
    ProductType: 'HELOC',
    CampaignIds: [],
    ExcludePoolProperties: false,
    ApplySwimmingPoolFilter: false,
    ...opts.body,
  }
  return glyneFetch('get-properties-by-criteria', body, {
    page: opts.page ?? 1,
    page_size: opts.pageSize ?? 50,
    determine_offer: 'false',
    fetch_data_only_from_db: 'true',
  })
}
