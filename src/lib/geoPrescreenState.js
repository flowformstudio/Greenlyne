/**
 * Tiny sessionStorage bridge so the desktop NewCampaignFlow and the mobile
 * GeoMapMobile can keep the drawn shape + live campaign refs in sync as the
 * user resizes the browser across the responsive breakpoint.
 *
 * Stored shape:
 *   {
 *     latlngs: [[lat,lng], …],
 *     kind:    'polygon' | 'circle' | …,
 *     bbox:    [s,w,n,e] | undefined,
 *     collectionId: number | string | null,
 *     campaignId:   number | string | null,
 *     savedCampaignId: number | string | null,  // backend collection id when loaded from sidebar
 *     name: string | null,
 *     ts:   number,
 *   }
 */
const KEY = 'glyne_geo_prescreen_state_v1'

export function loadGeoState() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveGeoState(patch) {
  if (typeof window === 'undefined') return
  try {
    const prev = loadGeoState() || {}
    const next = { ...prev, ...patch, ts: Date.now() }
    window.sessionStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
}

export function clearGeoState() {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(KEY) } catch {}
}
