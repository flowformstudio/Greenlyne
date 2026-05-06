import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'

// Fix Leaflet's default-icon URL resolution under bundlers (Vite breaks the
// relative paths Leaflet ships with). We replace the icon URLs with explicit
// CDN URLs so default markers render reliably.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEFAULT_CENTER = [25.7617, -80.1918]   // Miami
const DEFAULT_ZOOM   = 12

/**
 * GeoLeafletMap — drop-in real map for the demo's Geo Lead Search step.
 *
 * Props:
 *   center       [lat, lng]
 *   zoom         number
 *   drawMode     'polygon' | 'circle' | 'rectangle' | null   (set externally; we activate the matching draw handler)
 *   onShape(geo) called when the user finishes a shape — payload:
 *     { kind, latlngs, center, radius, bbox, areaKm2 }
 *   onClearShape() called when shape is removed via the trash control
 *   households   array of { id, lat, lng, address?, qualified? } drawn as markers
 *   onAddressSearch(query) optional — passes back to host so it can geocode
 *   selectedHousehold  optional id to highlight
 *   onSelectHousehold(id) clicked household
 *   children     overlay UI placed on top of the map (e.g. floating tool palette)
 */
export default function GeoLeafletMap({
  center = DEFAULT_CENTER,
  zoom   = DEFAULT_ZOOM,
  drawMode,
  onShape,
  onClearShape,
  households = [],
  selectedHousehold,
  onSelectHousehold,
  flyTo,            // [lat, lng, zoom?] — programmatic recentering (e.g. address search hit)
  children,
}) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const drawnLayer   = useRef(null)
  const drawHandler  = useRef(null)
  const householdLayer = useRef(null)

  const [ready, setReady] = useState(false)

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center, zoom, zoomControl: false, attributionControl: true,
      preferCanvas: true,
    })
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    drawnLayer.current = new L.FeatureGroup().addTo(map)
    householdLayer.current = new L.LayerGroup().addTo(map)

    map.on(L.Draw.Event.CREATED, (e) => {
      // Replace any existing shape — only one selection at a time.
      drawnLayer.current.clearLayers()
      drawnLayer.current.addLayer(e.layer)
      const payload = shapeToPayload(e.layer, e.layerType)
      onShape?.(payload)
    })

    map.on(L.Draw.Event.DELETED, () => {
      drawnLayer.current.clearLayers()
      onClearShape?.()
    })

    mapRef.current = map
    setReady(true)
    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Activate / cancel draw mode externally
  useEffect(() => {
    if (!ready || !mapRef.current) return
    drawHandler.current?.disable?.()
    drawHandler.current = null
    if (!drawMode) return
    let handler
    const opts = { shapeOptions: { color: '#16a34a', weight: 2, fillColor: '#16a34a', fillOpacity: 0.15 } }
    if (drawMode === 'polygon')   handler = new L.Draw.Polygon(mapRef.current, opts)
    if (drawMode === 'circle')    handler = new L.Draw.Circle(mapRef.current, opts)
    if (drawMode === 'rectangle') handler = new L.Draw.Rectangle(mapRef.current, opts)
    if (handler) {
      handler.enable()
      drawHandler.current = handler
    }
  }, [drawMode, ready])

  // Render household markers
  useEffect(() => {
    if (!ready || !householdLayer.current) return
    householdLayer.current.clearLayers()
    households.forEach(h => {
      if (typeof h.lat !== 'number' || typeof h.lng !== 'number') return
      const isSelected = h.id === selectedHousehold
      const color = h.qualified === false ? '#dc2626'
                  : h.qualified === true  ? '#16a34a'
                  : '#254BCE'
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: isSelected ? 9 : 5,
        color,
        weight: isSelected ? 3 : 1.5,
        fillColor: color,
        fillOpacity: isSelected ? 0.9 : 0.55,
      })
      if (h.address) marker.bindTooltip(h.address, { direction: 'top', offset: [0, -6] })
      if (onSelectHousehold) marker.on('click', () => onSelectHousehold(h.id))
      marker.addTo(householdLayer.current)
    })
  }, [households, selectedHousehold, ready, onSelectHousehold])

  // Programmatic recentering (used by the address search)
  useEffect(() => {
    if (!ready || !mapRef.current || !flyTo) return
    const [lat, lng, fz = 14] = flyTo
    mapRef.current.flyTo([lat, lng], fz, { duration: 0.6 })
  }, [flyTo, ready])

  // Public API: clear shape from outside (host calls this via ref)
  const clear = useCallback(() => {
    drawnLayer.current?.clearLayers()
    drawHandler.current?.disable?.()
    drawHandler.current = null
  }, [])

  // Expose `clear` to host — attach as a side-effect onto the container element.
  useEffect(() => {
    if (containerRef.current) containerRef.current.__clearShape__ = clear
  }, [clear])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" style={{ background: '#e9ecef' }} />
      {children}
    </div>
  )
}

/** Convert a Leaflet draw layer into a plain payload the host can use. */
function shapeToPayload(layer, kind) {
  if (kind === 'circle') {
    const c = layer.getLatLng()
    const r = layer.getRadius()
    const bounds = layer.getBounds()
    return {
      kind: 'circle',
      center: [c.lat, c.lng],
      radius: r,
      bbox: bboxFromBounds(bounds),
      areaKm2: Math.PI * (r / 1000) ** 2,
      latlngs: null,
    }
  }
  if (kind === 'rectangle') {
    const bounds = layer.getBounds()
    const ll = [
      [bounds.getNorthWest().lat, bounds.getNorthWest().lng],
      [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
      [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
      [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
    ]
    return { kind: 'rectangle', latlngs: ll, bbox: bboxFromBounds(bounds), areaKm2: areaFromLatLngs(ll), center: layer.getBounds().getCenter ? [layer.getBounds().getCenter().lat, layer.getBounds().getCenter().lng] : null, radius: null }
  }
  // polygon
  const ll = layer.getLatLngs()[0].map(p => [p.lat, p.lng])
  const bounds = layer.getBounds()
  return { kind: 'polygon', latlngs: ll, bbox: bboxFromBounds(bounds), areaKm2: areaFromLatLngs(ll), center: [bounds.getCenter().lat, bounds.getCenter().lng], radius: null }
}

function bboxFromBounds(b) {
  return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]
}

/** Ballpark area for a polygon ring in km² — Shoelace on lat/lng converted to meters via cosine. */
function areaFromLatLngs(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0
  const R = 6378.137 // km
  const rad = d => d * Math.PI / 180
  let sum = 0
  for (let i = 0; i < latlngs.length; i++) {
    const [lat1, lng1] = latlngs[i]
    const [lat2, lng2] = latlngs[(i + 1) % latlngs.length]
    sum += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)))
  }
  return Math.abs(sum * R * R / 2)
}

/* ── Geocoding helper (Nominatim — free, rate-limited, no key) ───────────── */

export async function geocodeAddress(query) {
  if (!query || query.trim().length < 3) return []
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!res.ok) return []
    const data = await res.json()
    return data.map(d => ({
      label: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      type: d.type,
      addr: d.address,
    }))
  } catch (e) {
    console.warn('[geocode]', e)
    return []
  }
}

/* ── Generate plausible household markers inside a drawn shape ───────────── */

export function generateHouseholdsInShape(shape, count = 30) {
  if (!shape) return []
  const items = []
  let tries = 0
  const wantedAddresses = SAMPLE_STREETS.slice(0, count)
  while (items.length < count && tries < count * 8) {
    tries++
    const [lat, lng] = randomPointIn(shape)
    if (lat == null) continue
    items.push({
      id: `gen-${items.length}-${Date.now()}`,
      lat, lng,
      address: wantedAddresses[items.length] || `${100 + items.length} Sample St`,
      qualified: undefined,
    })
  }
  return items
}

function randomPointIn(shape) {
  if (shape.kind === 'circle') {
    const [clat, clng] = shape.center
    const u = Math.random(), v = Math.random()
    const w = (shape.radius / 111000) * Math.sqrt(u)        // ~deg
    const t = 2 * Math.PI * v
    return [clat + w * Math.cos(t), clng + w * Math.sin(t) / Math.cos(clat * Math.PI / 180)]
  }
  // polygon / rectangle: rejection sampling within bbox
  const [s, w, n, e] = shape.bbox
  for (let i = 0; i < 10; i++) {
    const lat = s + Math.random() * (n - s)
    const lng = w + Math.random() * (e - w)
    if (pointInPolygon([lat, lng], shape.latlngs)) return [lat, lng]
  }
  return [null, null]
}

function pointInPolygon(point, vs) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const [xi, yi] = vs[i]
    const [xj, yj] = vs[j]
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

const SAMPLE_STREETS = [
  '1842 Oak Hill Dr', '77 Palm Ave', '12 Oak Street', '998 Canyon Rd', '334 Saguaro Blvd',
  '221 Cactus Dr', '540 Desert Rose Ln', '8821 W Bell Rd', '110 E Camelback Rd', '3305 N 7th Ave',
  '2211 S Rural Rd', '776 W Southern Ave', '4490 E Thomas Rd', '655 N Dobson Rd', '2009 W Chandler Blvd',
  '1456 NW 8th Ave', '2034 SE 17th St', '888 Brickell Ave', '1212 Coral Way', '4500 Biscayne Blvd',
  '610 Lincoln Rd', '2300 Collins Ave', '1801 NE 123rd St', '755 SW 11th Ter', '999 Ocean Dr',
  '147 Sunset Ln', '88 Bayshore Pl', '321 Coconut Grove Rd', '1500 Overtown St', '450 Wynwood Way',
]
