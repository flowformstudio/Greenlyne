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

// Inject popup CSS once — Leaflet's default popup is too plain for the demo.
if (typeof document !== 'undefined' && !document.getElementById('glyne-leaflet-popup-css')) {
  const s = document.createElement('style')
  s.id = 'glyne-leaflet-popup-css'
  s.textContent = `
    .glyne-popup .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 8px 28px rgba(0,22,96,0.18);
      padding: 0;
      border: 1px solid rgba(0,22,96,0.06);
    }
    .glyne-popup .leaflet-popup-content { margin: 0; padding: 0; min-width: 240px; font-family: 'Manrope', system-ui, sans-serif; }
    .glyne-popup .leaflet-popup-tip { box-shadow: 0 4px 14px rgba(0,22,96,0.18); }
    .glp-card { padding: 14px 16px 12px; color: #001660; }
    .glp-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 0.10em; text-transform: uppercase; color: rgba(0,22,96,0.55); }
    .glp-name { font-size: 13px; font-weight: 700; color: #001660; line-height: 1.25; margin-top: 4px; }
    .glp-addr { font-size: 11px; color: rgba(0,22,96,0.65); line-height: 1.4; margin-top: 2px; }
    .glp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,22,96,0.08); }
    .glp-cell { min-width: 0; }
    .glp-key { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(0,22,96,0.5); }
    .glp-val { font-size: 13px; font-weight: 700; color: #001660; margin-top: 2px; line-height: 1; font-variant-numeric: tabular-nums; }
    .glp-val small { font-size: 10px; font-weight: 500; color: rgba(0,22,96,0.5); margin-left: 2px; }
    .glp-status { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 8px; }
    .glp-status.qualified   { background: rgba(22,163,74,0.10); color: #166534; }
    .glp-status.unqualified { background: rgba(220,38,38,0.10); color: #991B1B; }
    .leaflet-draw-tooltip { display: none !important; }
    .leaflet-container.glyne-mouse-inside .leaflet-draw-tooltip { display: block !important; }
  `
  document.head.appendChild(s)
}

/** Build a polished HTML popup string from a property record. Safe defaults
 * for missing fields. Caller passes whatever the API returns + a label. */
export function buildPropertyPopup(p, opts = {}) {
  const fmt$ = n => (n == null || n === '' || isNaN(n)) ? '—' : '$' + Math.round(Number(n)).toLocaleString()
  const fmtPct = n => (n == null || n === '' || isNaN(n)) ? '—' : `${Math.round(Number(n))}%`
  const owner = [p.OwnerFirstName, p.OwnerLastName].filter(Boolean).join(' ') || p.owner_name || 'Homeowner'
  const addr  = [p.Address, p.City, p.State, p.ZipCode].filter(Boolean).join(', ') || p.address || ''
  const cltv  = p.CLTV ?? p.cltv
  const equity = p.AvailableEquity ?? p.available_equity
  const fico  = p.FICO ?? p.fico
  const home  = p.HomeValue ?? p.home_value
  const loan  = p.LoanAmount ?? p.loan_amount
  const apr   = p.APR ?? p.apr
  const months = p.MonthsOwnership ?? p.months_ownership
  const propAge = p.property_age ?? p.PropertyAge
  const qualified = opts.qualified // optional override
  const statusBadge =
    qualified === true  ? `<span class="glp-status qualified">✓ Qualified</span>`
  : qualified === false ? `<span class="glp-status unqualified">Not Qualified</span>`
  : ''
  const cells = [
    home   != null && { k: 'Home Value', v: fmt$(home) },
    equity != null && { k: 'Equity',     v: fmt$(equity) },
    cltv   != null && { k: 'CLTV',       v: fmtPct(cltv) },
    fico   != null && { k: 'FICO',       v: fico },
    loan   != null && { k: 'Loan Est.',  v: fmt$(loan) },
    apr    != null && { k: 'APR',        v: apr ? `${Number(apr).toFixed(2)}%` : '—' },
    months != null && { k: 'Owned',      v: months ? `${Math.round(months / 12)} yr` : '—' },
    propAge!= null && { k: 'Built',      v: propAge ? `${propAge} yr ago` : '—' },
  ].filter(Boolean)
  return `
    <div class="glp-card">
      <div class="glp-eyebrow">Property</div>
      <div class="glp-name">${escapeHtml(owner)}</div>
      ${addr ? `<div class="glp-addr">${escapeHtml(addr)}</div>` : ''}
      ${statusBadge}
      <div class="glp-grid">
        ${cells.map(c => `
          <div class="glp-cell">
            <div class="glp-key">${escapeHtml(c.k)}</div>
            <div class="glp-val">${c.v}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))
}

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
  overlays = [],    // [{ id, latlngs ([lng,lat] from API), color, name, popupHtml, fitBounds }]
  onOverlayClick,   // (id) => void — fires before the polygon's popup opens
  clearShapeSignal, // bump this number from host to imperatively clear the drawn shape
  selectedHouseholdIds, // Set<id> — households checked for prescreen (multi-select)
  onHoverHousehold,     // (id|null) => void — fires on marker mouseover/mouseout
  radarPing,            // { center: [lat,lng], radius: meters, polygon?: [[lat,lng],…] } | null — radar sweep
  onMapReady,           // (map) => void — fires once after the map is initialized
  baseLayer = 'default', // 'default' (OSM) | 'satellite' (Google hybrid)
  children,
}) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const drawnLayer   = useRef(null)
  const drawHandler  = useRef(null)
  const householdLayer = useRef(null)
  const overlayLayer  = useRef(null)
  const radarLayer    = useRef(null)
  const baseLayerRef  = useRef(null)

  const [ready, setReady] = useState(false)

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center, zoom, zoomControl: false, attributionControl: true,
      preferCanvas: true,
    })
    // Zoom controls are rendered in React (inside the tools toolbar column)
    // — see GeoCampaigns. Leaflet's built-in zoom control is suppressed via
    // zoomControl: false in L.map options above.
    // Match production Greenlyne — plain OSM default tiles. OSM's public
    // tile server caps at z19 (z20 returns 400), so we set maxZoom: 19.
    // At zoom 17+ OSM renders building footprints + house-number labels
    // (the "3637 / 3631 / 3625" street-level detail seen in PMPro).
    baseLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    drawnLayer.current     = new L.FeatureGroup().addTo(map)
    householdLayer.current = new L.LayerGroup().addTo(map)
    overlayLayer.current   = new L.LayerGroup().addTo(map)

    map.on(L.Draw.Event.CREATED, (e) => {
      // Replace any existing shape — only one selection at a time.
      drawnLayer.current.clearLayers()
      drawnLayer.current.addLayer(e.layer)
      // Hover label — show the radius (for circles) or area (otherwise).
      const layer = e.layer
      let label = ''
      if (e.layerType === 'circle' && typeof layer.getRadius === 'function') {
        const meters = layer.getRadius()
        const miles  = meters / 1609.34
        label = miles < 0.1 ? `${Math.round(meters)} m` : `${miles.toFixed(miles < 1 ? 2 : 1)} mi`
      } else {
        const km2 = areaFromLatLngs(layer.getLatLngs?.()[0]?.map(p => [p.lat, p.lng]) || [])
        if (km2 > 0) {
          const sqMi = km2 * 0.386102
          label = sqMi < 0.1 ? `${(sqMi * 27_878_400 / 1_000_000).toFixed(2)} m²` : `${sqMi.toFixed(2)} sq mi`
        }
      }
      if (label) {
        // Anchored to the shape's center (not the cursor) — appears on hover,
        // disappears on mouseout, and stays put while hovering.
        layer.bindTooltip(label, { sticky: false, direction: 'center', permanent: false, opacity: 1, className: 'glyne-shape-label' })
      }
      const payload = shapeToPayload(e.layer, e.layerType)
      onShape?.(payload)
    })

    map.on(L.Draw.Event.DELETED, () => {
      drawnLayer.current.clearLayers()
      onClearShape?.()
    })

    mapRef.current = map
    setReady(true)
    onMapReady?.(map)
    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap the base tile layer when `baseLayer` changes.
  useEffect(() => {
    if (!ready || !mapRef.current) return
    const map = mapRef.current
    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current)
    const newLayer = baseLayer === 'satellite'
      ? L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          attribution: '© Google',
          subdomains: ['0','1','2','3'],
          maxZoom: 20,
        })
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        })
    newLayer.addTo(map)
    newLayer.bringToBack()
    baseLayerRef.current = newLayer
  }, [baseLayer, ready])

  // Activate / cancel draw mode externally
  useEffect(() => {
    if (!ready || !mapRef.current) return
    drawHandler.current?.disable?.()
    drawHandler.current = null
    if (!drawMode) return
    let handler
    const sat = baseLayer === 'satellite'
    const opts = { shapeOptions: sat
      ? { color: '#FDE047', weight: 3,   fillColor: '#FACC15', fillOpacity: 0.30 }
      : { color: '#2563EB', weight: 2.8, fillColor: '#3B82F6', fillOpacity: 0.22 }
    }
    if (drawMode === 'polygon')   handler = new L.Draw.Polygon(mapRef.current, opts)
    if (drawMode === 'circle')    handler = new L.Draw.Circle(mapRef.current, opts)
    if (drawMode === 'rectangle') handler = new L.Draw.Rectangle(mapRef.current, opts)
    if (handler) {
      handler.enable()
      drawHandler.current = handler
    }
    const map = mapRef.current
    const onOver = () => containerRef.current?.classList.add('glyne-mouse-inside')
    const onOut  = () => containerRef.current?.classList.remove('glyne-mouse-inside')
    map.on('mouseover', onOver)
    map.on('mouseout',  onOut)
    return () => {
      map.off('mouseover', onOver)
      map.off('mouseout',  onOut)
      containerRef.current?.classList.remove('glyne-mouse-inside')
    }
  }, [drawMode, ready, baseLayer])

  // Render household markers (with optional rich popup via popupHtml/raw)
  useEffect(() => {
    if (!ready || !householdLayer.current) return
    householdLayer.current.clearLayers()
    const checkedSet = selectedHouseholdIds instanceof Set ? selectedHouseholdIds : null
    households.forEach(h => {
      if (typeof h.lat !== 'number' || typeof h.lng !== 'number') return
      const isFocused = h.id === selectedHousehold
      const isChecked = !!checkedSet?.has(h.id)
      const sat = baseLayer === 'satellite'
      const baseColor = h.qualified === false ? (sat ? '#FF3B3B' : '#dc2626')
                      : h.qualified === true  ? (sat ? '#22F58B' : '#16a34a')
                      : (sat ? '#60A5FA' : '#254BCE')
      const color = isChecked ? (sat ? '#22F58B' : '#059669') : baseColor

      // Prescreen-selection halo (emerald) — the only on-map selection cue.
      if (isChecked) {
        const haloOuter = L.circleMarker([h.lat, h.lng], {
          radius: 11, color: '#fff', weight: 2,
          fillColor: '#fff', fillOpacity: 0, interactive: false,
        })
        const halo = L.circleMarker([h.lat, h.lng], {
          radius: 10, color: '#059669', weight: 2.5,
          fillColor: '#10B981', fillOpacity: 0.25, interactive: false,
        })
        haloOuter.addTo(householdLayer.current)
        halo.addTo(householdLayer.current)
      }
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: isChecked ? 6 : (isFocused ? 7 : 5),
        color: '#fff',
        weight: sat ? ((isChecked || isFocused) ? 2.5 : 2) : ((isChecked || isFocused) ? 2 : 1.5),
        fillColor: color,
        fillOpacity: (isChecked || isFocused) ? 1 : (sat ? 0.95 : 0.7),
      })
      if (h.popupHtml) marker.bindPopup(h.popupHtml, { maxWidth: 280, className: 'glyne-popup', autoPan: false, closeButton: true })
      else if (h.address) marker.bindTooltip(h.address, { direction: 'top', offset: [0, -6] })
      if (onSelectHousehold) marker.on('click', () => onSelectHousehold(h.id))
      // Hover: notify host AND open the popup (with a small delay so brief flicks don't pop it).
      // Hide on mouseout, but only if the popup itself isn't being hovered.
      let hoverTimer = null
      marker.on('mouseover', () => {
        onHoverHousehold?.(h.id)
        if (h.popupHtml) {
          if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null }
          marker.openPopup()
        }
      })
      marker.on('mouseout', () => {
        onHoverHousehold?.(null)
        if (h.popupHtml) {
          if (hoverTimer) clearTimeout(hoverTimer)
          hoverTimer = setTimeout(() => {
            const popupEl = marker.getPopup()?.getElement()
            if (popupEl && popupEl.matches(':hover')) return // user is on the popup — keep open
            marker.closePopup()
          }, 180)
        }
      })
      marker.addTo(householdLayer.current)
    })
  }, [households, selectedHousehold, selectedHouseholdIds, ready, onSelectHousehold, onHoverHousehold, baseLayer])

  // Programmatic recentering (used by the address search)
  useEffect(() => {
    if (!ready || !mapRef.current || !flyTo) return
    const [lat, lng, fz = 14] = flyTo
    mapRef.current.flyTo([lat, lng], fz, { duration: 0.6 })
  }, [flyTo, ready])

  // Render external overlay polygons (e.g., loaded saved campaigns).
  // Each overlay: { id, latlngs (lng-lat from API), color, name, popupHtml, fitBounds? }
  useEffect(() => {
    if (!ready || !overlayLayer.current) return
    overlayLayer.current.clearLayers()
    if (!Array.isArray(overlays) || overlays.length === 0) return
    let lastBounds = null
    const sat = baseLayer === 'satellite'
    overlays.forEach(o => {
      if (!o?.latlngs || o.latlngs.length < 3) return
      // Backend stores [lng, lat] — flip for Leaflet's [lat, lng] expectation.
      const ll = o.latlngs.map(([lng, lat]) => [lat, lng])
      const color    = sat ? '#FDE047' : (o.color || '#2563EB')
      const fillCol  = sat ? '#FACC15' : color
      const weight   = sat ? 3 : 2.5
      const fillOp   = sat ? 0.28 : 0.18
      const poly = L.polygon(ll, {
        color, weight, fillColor: fillCol, fillOpacity: fillOp,
      })
      if (o.popupHtml) poly.bindPopup(o.popupHtml, { maxWidth: 300, className: 'glyne-popup' })
      else if (o.name) poly.bindTooltip(o.name, { sticky: true })
      if (onOverlayClick) poly.on('click', () => onOverlayClick(o.id))
      poly.addTo(overlayLayer.current)
      if (o.fitBounds) lastBounds = poly.getBounds()
    })
    if (lastBounds && mapRef.current) {
      mapRef.current.flyToBounds(lastBounds, { padding: [40, 40], duration: 0.55 })
    }
  }, [overlays, ready, baseLayer])

  // Radar sweep — rotating wedge (like a radar dish) over the drawn area while loading.
  useEffect(() => {
    if (!ready || !mapRef.current) return
    if (!radarLayer.current) radarLayer.current = L.layerGroup().addTo(mapRef.current)
    radarLayer.current.clearLayers()
    if (!radarPing || !radarPing.center || !radarPing.radius) return

    const map = radarLayer.current._map || mapRef.current
    const { center, radius } = radarPing

    // Pixel radius depends on zoom — derive by projecting center vs. a point
    // shifted by `radius` meters east on the same latitude.
    const computeSizePx = () => {
      const dLng = radius / (111_320 * Math.cos(center[0] * Math.PI / 180))
      const p0 = map.latLngToContainerPoint(L.latLng(center[0], center[1]))
      const p1 = map.latLngToContainerPoint(L.latLng(center[0], center[1] + dLng))
      return Math.max(40, Math.abs(p1.x - p0.x) * 2)  // diameter
    }

    // Build the radar element via L.divIcon — a square div with a conic-gradient
    // wedge that we rotate by JS each frame for crisp control.
    // Gradient: trail BEHIND the leading edge. The leading edge sits at the
    // END of the cone (just before wrapping back to 0deg), so the bright slice
    // is at the current angle and the fade extends counter-clockwise from it,
    // i.e. visually behind a clockwise-rotating sweep.
    const wedgeBg = 'conic-gradient(from var(--ang, 0deg), transparent 0deg, transparent 280deg, rgba(99,102,241,0.06) 305deg, rgba(99,102,241,0.22) 335deg, rgba(99,102,241,0.55) 358deg, rgba(165,180,252,0.85) 360deg)'
    const isPolygon = Array.isArray(radarPing.polygon) && radarPing.polygon.length >= 3
    const rootStyle = isPolygon
      ? 'position: relative; width:100%; height:100%; overflow: hidden;'
      : 'position: relative; width:100%; height:100%; border-radius:50%; box-shadow: 0 0 0 1px rgba(99,102,241,0.25), 0 0 24px rgba(99,102,241,0.18); overflow: hidden;'
    const sweepStyle = isPolygon
      ? `position:absolute; inset:0; background: ${wedgeBg};`
      : `position:absolute; inset:0; border-radius:50%; background: ${wedgeBg};`
    const html = `
      <div class="glyne-radar-root" style="${rootStyle}">
        <div class="glyne-radar-sweep" style="${sweepStyle}"></div>
        <div style="
          position:absolute; left:50%; top:50%; width:6px; height:6px; margin:-3px 0 0 -3px;
          border-radius:50%; background:#A5B4FC;
          box-shadow: 0 0 8px rgba(165,180,252,0.8), 0 0 0 2px rgba(255,255,255,0.85);
        "></div>
      </div>`

    let diameter = computeSizePx()
    let marker = L.marker(center, {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        html,
        className: 'glyne-radar-icon',
        iconSize: [diameter, diameter],
        iconAnchor: [diameter / 2, diameter / 2],
      }),
    }).addTo(radarLayer.current)

    const sweepEl = () => marker.getElement()?.querySelector('.glyne-radar-sweep')

    // Animate rotation via CSS variable (avoids re-mount).
    let raf = 0
    const start = performance.now()
    const PERIOD = 2800  // ms per full rotation
    const tick = (now) => {
      const t = (now - start) % PERIOD
      const ang = (t / PERIOD) * 360
      const el = sweepEl()
      if (el) el.style.setProperty('--ang', `${ang}deg`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // If the host supplied a polygon, clip the radar to its shape so the
    // round halo never bleeds outside the user's custom area.
    const applyPolygonClip = () => {
      const el = marker.getElement()?.querySelector('.glyne-radar-root')
      if (!el) return
      const poly = Array.isArray(radarPing.polygon) ? radarPing.polygon : null
      if (!poly || poly.length < 3) { el.style.clipPath = ''; return }
      const cPx = map.latLngToContainerPoint(L.latLng(center[0], center[1]))
      const pts = poly.map(([lat, lng]) => {
        const p = map.latLngToContainerPoint(L.latLng(lat, lng))
        // Express relative to the icon's top-left (which is center - diameter/2).
        const x = ((p.x - cPx.x) + diameter / 2) / diameter * 100
        const y = ((p.y - cPx.y) + diameter / 2) / diameter * 100
        return `${x.toFixed(2)}% ${y.toFixed(2)}%`
      })
      el.style.clipPath = `polygon(${pts.join(', ')})`
    }
    // Defer one tick so the marker's DOM is attached before we read it.
    requestAnimationFrame(applyPolygonClip)

    // Recompute icon size + polygon clip on zoom — panning doesn't change pixel radius.
    // Resize via direct DOM mutation rather than setIcon() so we never tear
    // down the rotating element (avoids the stop-start glitch).
    const onZoom = () => {
      const next = computeSizePx()
      if (Math.abs(next - diameter) >= 1) {
        diameter = next
        const el = marker.getElement()
        if (el) {
          el.style.width = `${diameter}px`
          el.style.height = `${diameter}px`
          el.style.marginLeft = `${-diameter / 2}px`
          el.style.marginTop  = `${-diameter / 2}px`
        }
      }
      applyPolygonClip()
    }
    map.on('zoomend', onZoom)

    return () => {
      cancelAnimationFrame(raf)
      map.off('zoomend', onZoom)
      radarLayer.current?.clearLayers()
    }
    // Depend on primitive values, not the radarPing object reference — the
    // parent recomputes a fresh object every render (it's computed inline),
    // so reference-based deps would tear down + rebuild the marker every
    // render and cause a stutter. Pulling out lat/lng/radius means the effect
    // only re-runs when the actual scan target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radarPing?.center?.[0], radarPing?.center?.[1], radarPing?.radius, ready])

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

  // Host-driven clear: when `clearShapeSignal` changes, remove the drawn shape.
  // Skip the first run so mounting with signal=0 doesn't no-op-but-fire.
  const clearSignalFirst = useRef(true)
  useEffect(() => {
    if (!ready) return
    if (clearSignalFirst.current) { clearSignalFirst.current = false; return }
    clear()
  }, [clearShapeSignal, ready, clear])

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
    // Deterministic-ish synthetic data derived from index — real-feeling values
    // so the demo's clickable popups have something useful when no backend
    // results come back.
    const idx = items.length
    const fico = 640 + (idx * 13) % 200
    const home = 240_000 + (idx * 17_300) % 380_000
    const equity = Math.round(home * (0.25 + ((idx * 7) % 40) / 100))
    const cltv = Math.round(((home - equity) / home) * 100)
    const months = 24 + (idx * 11) % 240
    const propAge = 5 + (idx * 3) % 75
    const owner = SAMPLE_OWNERS[idx % SAMPLE_OWNERS.length]
    const address = wantedAddresses[idx] || `${100 + idx} Sample St`
    const qualified = fico >= 660 && equity >= 50_000
    const propRecord = {
      OwnerFirstName: owner[0],
      OwnerLastName:  owner[1],
      Address: address,
      City: 'Kansas City', State: 'MO',
      FICO: fico, HomeValue: home, AvailableEquity: equity, CLTV: cltv,
      MonthsOwnership: months, property_age: propAge,
      LoanAmount: Math.round(equity * 0.85),
      APR: 8 + ((idx * 3) % 20) / 10,
    }
    items.push({
      id: `gen-${idx}-${Date.now()}`,
      lat, lng,
      address,
      qualified,
      popupHtml: buildPropertyPopup(propRecord, { qualified }),
      // Rich fields the host UI's lead/prescreen panels can display when the
      // real backend returned nothing for the drawn shape:
      owner: `${owner[0]} ${owner[1]}`,
      fico,
      equity,
      homeValue: home,
      yearsOwned: Math.round(months / 12),
    })
  }
  return items
}

const SAMPLE_OWNERS = [
  ['Sarah','Johnson'], ['Michael','Chen'], ['David','Martinez'], ['Jennifer','Lee'],
  ['Robert','Brown'], ['Amanda','Wilson'], ['James','Taylor'], ['Maria','Gonzalez'],
  ['Patricia','Williams'], ['Kevin','Moore'], ['Lisa','Anderson'], ['Brian','Harris'],
  ['Nancy','Clark'], ['Jason','Lewis'], ['Marcus','Thompson'], ['Olivia','Chen'],
  ['James','Patel'], ['Sandra','Ortiz'], ['Robert','Kim'], ['Alex','Ray'],
]

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
