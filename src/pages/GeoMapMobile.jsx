import { useEffect, useMemo, useRef, useState } from 'react'
import GeoLeafletMap from '../components/GeoLeafletMap'

/* GeoMapMobile — phone-first variant of the Geo Prescreen workflow.
   - Map is the hero, full viewport.
   - Translucent top header (back, title, view-toggle).
   - Floating right-side controls (zoom, locate, layers, draw, radius).
   - Draggable bottom sheet with 3 snap heights.
   - Filter sheet + selection mode dock.
   This is a self-contained shell for the mobile UX; the props let the parent
   wire it to the existing GeoCampaigns data layer when ready. */

const I = (d) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const ICONS = {
  back:    <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  menu:    <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  search:  <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  filter:  <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  layers:  <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  locate:  <><circle cx="12" cy="12" r="3"/><line x1="12" y1="2"  x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2"  y1="12" x2="5"  y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></>,
  plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5"  y1="12" x2="19" y2="12"/></>,
  minus:   <><line x1="5"  y1="12" x2="19" y2="12"/></>,
  close:   <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6"  y1="6" x2="18" y2="18"/></>,
  draw:    <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  radius:  <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2" fill="currentColor"/></>,
  chevDn:  <><polyline points="6 9 12 15 18 9"/></>,
  chevRt:  <><polyline points="9 18 15 12 9 6"/></>,
  check:   <><polyline points="20 6 9 17 4 12"/></>,
  more:    <><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>,
  mail:    <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  card:    <><rect x="2" y="6" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
  download:<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  trash:   <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></>,
}

/* Tiny floating round button. */
function FloatBtn({ icon, label, onClick, primary, accent, badge }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      position: 'relative',
      width: 40, height: 40, borderRadius: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: primary ? '#001660' : 'rgba(255,255,255,0.96)',
      color: primary ? '#fff' : (accent || '#001660'),
      border: primary ? 'none' : '1px solid rgba(0,22,96,0.08)',
      boxShadow: '0 6px 16px rgba(0,22,96,0.14), 0 1px 3px rgba(0,22,96,0.08)',
      backdropFilter: 'blur(8px)',
      cursor: 'pointer', padding: 0,
    }}>
      {I(icon)}
      {badge > 0 && (
        <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: '#254BCE', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #fff' }}>{badge}</span>
      )}
    </button>
  )
}

/* Draggable bottom sheet — supports three snap heights. */
function BottomSheet({ snap = 'collapsed', onSnap, children, snapHeights = { collapsed: 220, mid: 400, expanded: '85vh' } }) {
  const height = snapHeights[snap]
  const startY = useRef(null)
  const lastDelta = useRef(0)
  const onTouchStart = (e) => { startY.current = e.touches[0].clientY; lastDelta.current = 0 }
  const onTouchMove = (e) => {
    if (startY.current == null) return
    lastDelta.current = e.touches[0].clientY - startY.current
  }
  const onTouchEnd = () => {
    const d = lastDelta.current
    startY.current = null
    if (Math.abs(d) < 30) return
    const order = ['collapsed', 'mid', 'expanded']
    const cur = order.indexOf(snap)
    let next = cur
    if (d < 0) next = Math.min(order.length - 1, cur + 1) // dragged up
    else next = Math.max(0, cur - 1)                       // dragged down
    if (next !== cur) onSnap?.(order[next])
  }
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      zIndex: 25,
      background: '#fff',
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -8px 28px rgba(0,22,96,0.16), 0 -1px 3px rgba(0,22,96,0.08)',
      height: typeof height === 'number' ? `${height}px` : height,
      maxHeight: '90vh',
      transition: 'height 280ms cubic-bezier(.4,0,.2,1)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ flexShrink: 0, paddingTop: 8, paddingBottom: 6, display: 'flex', justifyContent: 'center', cursor: 'grab' }}
        onClick={() => onSnap?.(snap === 'expanded' ? 'collapsed' : (snap === 'collapsed' ? 'mid' : 'expanded'))}>
        <span style={{ width: 42, height: 5, borderRadius: 999, background: 'rgba(0,22,96,0.18)' }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children({ snap })}
      </div>
    </div>
  )
}

/* Stats row + CTAs (collapsed state content). */
function CollapsedContent({ stats, onScan, onPrescreen }) {
  return (
    <div style={{ padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <Stat label="Homes in area" value={stats.homes} />
        <Stat label="Qualifying"    value={stats.qual}  accent="#10B981" />
        <Stat label="Med. value"    value={stats.med}   accent="#001660" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onScan} style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#fff', color: '#001660', border: '1px solid rgba(0,22,96,0.12)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          ▶ Scan area
        </button>
        <button onClick={onPrescreen} style={{ flex: 1.4, padding: '12px', borderRadius: 12, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 6px 14px rgba(0,22,96,0.30)' }}>
          ▶ Run Prescreen
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, accent = '#001660' }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.55)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

/* Property card for the expanded list. */
function PropertyCard({ p, selected, onToggle, selectionMode, onOpen }) {
  return (
    <div
      onClick={() => selectionMode ? onToggle(p.id) : onOpen?.(p)}
      style={{
        display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12,
        background: selected ? 'rgba(37,75,206,0.06)' : '#fff',
        border: `1px solid ${selected ? 'rgba(37,75,206,0.45)' : 'rgba(0,22,96,0.06)'}`,
        boxShadow: selected ? '0 4px 14px rgba(37,75,206,0.14)' : '0 1px 2px rgba(0,22,96,0.04)',
        cursor: 'pointer', alignItems: 'center',
      }}>
      {selectionMode && (
        <span style={{
          width: 22, height: 22, borderRadius: 999, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: selected ? '#254BCE' : 'transparent',
          border: `1.5px solid ${selected ? '#254BCE' : 'rgba(0,22,96,0.30)'}`,
        }}>
          {selected && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </span>
      )}
      <div style={{
        width: 56, height: 56, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${p.qualified ? '#10B98122' : 'rgba(0,22,96,0.06)'} 0%, rgba(0,22,96,0.04) 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: p.qualified ? '#10B981' : 'rgba(0,22,96,0.4)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#001660', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address}</span>
          {p.qualified ? (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.10)', padding: '2px 7px', borderRadius: 999 }}>Qualifying</span>
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,22,96,0.55)', background: 'rgba(0,22,96,0.06)', padding: '2px 7px', borderRadius: 999 }}>Review</span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(0,22,96,0.55)', marginTop: 2 }}>{p.city || '—'}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11, color: 'rgba(0,22,96,0.7)' }}>
          <span><span style={{ color: 'rgba(0,22,96,0.45)' }}>Value</span> <b>{p.value}</b></span>
          <span><span style={{ color: 'rgba(0,22,96,0.45)' }}>Equity</span> <b>{p.equity}</b></span>
        </div>
      </div>
    </div>
  )
}

/* Accordion section helper for the filter sheet. */
function FilterSection({ title, value, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#001660' }}>{title}</span>
        {value != null && <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(0,22,96,0.55)' }}>{value}</span>}
        <span style={{ color: 'rgba(0,22,96,0.45)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 160ms ease' }}>
          {I(ICONS.chevDn)}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px' }}>{children}</div>
      )}
    </div>
  )
}

function MiniSlider({ value, min, max, step = 1, onChange, fmt }) {
  return (
    <div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#254BCE' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(0,22,96,0.5)' }}>
        <span>{fmt ? fmt(min) : min}</span>
        <span style={{ fontWeight: 700, color: '#001660' }}>{fmt ? fmt(value) : value}</span>
        <span>{fmt ? fmt(max) : max}</span>
      </div>
    </div>
  )
}

/* Demo property data — used as a stub until backend is wired. */
const DEMO_PROPERTIES = [
  { id: 1, address: '1915 Gardenview Cir',  city: 'Santa Rosa, CA 95403', value: '$620,000', equity: '$210,000', qualified: true,  lat: 38.4716, lng: -122.7468 },
  { id: 2, address: '1928 Gardenview Cir',  city: 'Santa Rosa, CA 95403', value: '$580,000', equity: '$195,000', qualified: true,  lat: 38.4720, lng: -122.7458 },
  { id: 3, address: '1907 Gardenview Cir',  city: 'Santa Rosa, CA 95403', value: '$540,000', equity: '$120,000', qualified: false, lat: 38.4711, lng: -122.7478 },
  { id: 4, address: '1927 Gardenview Cir',  city: 'Santa Rosa, CA 95403', value: '$612,000', equity: '$245,000', qualified: false, lat: 38.4724, lng: -122.7461 },
  { id: 5, address: '1841 Brookwood Dr',    city: 'Santa Rosa, CA 95405', value: '$498,000', equity: '$132,000', qualified: true,  lat: 38.4400, lng: -122.7100 },
  { id: 6, address: '2110 Sonoma Ave',      city: 'Santa Rosa, CA 95405', value: '$575,000', equity: '$201,000', qualified: true,  lat: 38.4385, lng: -122.7080 },
  { id: 7, address: '855 Yulupa Ave',       city: 'Santa Rosa, CA 95405', value: '$522,000', equity: '$185,000', qualified: false, lat: 38.4380, lng: -122.7140 },
  { id: 8, address: '634 Stony Point Rd',   city: 'Santa Rosa, CA 95407', value: '$489,000', equity: '$140,000', qualified: true,  lat: 38.4290, lng: -122.7510 },
]

export default function GeoMapMobile({ onBack, onOpenCampaigns }) {
  /* ── Map + draw state ───────────────────────────────────────────────── */
  const [drawMode, setDrawMode] = useState(null)       // 'polygon' | 'rectangle' | 'radius' | null
  const [shapeDrawn, setShapeDrawn] = useState(false)
  const [baseLayer, setBaseLayer] = useState('default') // 'default' | 'satellite'
  const [flyTo, setFlyTo] = useState(null)
  const [households, setHouseholds] = useState([])      // markers on the map
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const [drawBarOpen, setDrawBarOpen] = useState(false)
  const mapRef = useRef(null)

  /* ── Bottom sheet ─────────────────────────────────────────────────── */
  const [snap, setSnap] = useState('collapsed')
  /* ── Modals / sheets ─────────────────────────────────────────────── */
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [campaignsOpen, setCampaignsOpen] = useState(false)
  const [prescreening, setPrescreening] = useState(false)
  const [progress, setProgress] = useState(0)

  /* ── Filters ──────────────────────────────────────────────────────── */
  const [filters, setFilters] = useState({ equityMin: 50, fico: 660, monthsOwned: 24, incomeMin: 50, pool: 'any' })

  /* ── Selection ────────────────────────────────────────────────────── */
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [moreOpen, setMoreOpen] = useState(false)

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const exitSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); setMoreOpen(false) }

  /* Filtered properties — demo stub. */
  const properties = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    return q
      ? DEMO_PROPERTIES.filter(p => p.address.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
      : DEMO_PROPERTIES
  }, [searchQ])

  const stats = useMemo(() => {
    const total = properties.length
    const qual = properties.filter(p => p.qualified).length
    return { homes: total, qual, med: '$114k' }
  }, [properties])

  /* Prescreen demo flow. */
  function startPrescreen() {
    if (!shapeDrawn) { setSnap('mid'); return }
    setPrescreening(true); setProgress(0)
    const start = Date.now()
    const T = 3500
    const tick = () => {
      const p = Math.min(100, Math.round(((Date.now() - start) / T) * 100))
      setProgress(p)
      if (p < 100) requestAnimationFrame(tick)
      else setTimeout(() => { setPrescreening(false); setSnap('expanded') }, 350)
    }
    requestAnimationFrame(tick)
  }

  /* When user draws a shape on the map. */
  function onShape(shape) {
    setShapeDrawn(true)
    setDrawMode(null)
    // Populate demo households as a hint of activity.
    setHouseholds(DEMO_PROPERTIES.map(p => ({ id: p.id, lat: p.lat, lng: p.lng, qualified: p.qualified, address: p.address })))
    setSnap('mid')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F8F9FB', overflow: 'hidden', width: '100vw', maxWidth: '100vw' }}>
      {/* ── Map (full viewport) ──────────────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <GeoLeafletMap
          center={[38.4404, -122.7144]}
          zoom={13}
          drawMode={drawMode}
          onShape={onShape}
          households={households}
          flyTo={flyTo}
          baseLayer={baseLayer}
          onMapReady={(m) => { mapRef.current = m }}
        />
      </div>

      {/* ── Top header (translucent over map) ────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
        padding: 'calc(env(safe-area-inset-top) + 10px) 12px 10px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 14,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)',
          boxShadow: '0 6px 16px rgba(0,22,96,0.10), 0 1px 3px rgba(0,22,96,0.06)',
        }}>
          <button onClick={() => setCampaignsOpen(true)} aria-label="Open campaigns" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#001660', border: 'none', cursor: 'pointer', padding: 0 }}>
            {I(ICONS.menu)}
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em' }}>Geo Prescreen</div>
          <button onClick={onBack} aria-label="Back" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#001660', border: 'none', cursor: 'pointer', padding: 0 }}>
            {I(ICONS.close)}
          </button>
        </div>

        {/* Search pill + filter button row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => setSearchOpen(true)} style={{
            flex: 1, height: 42, borderRadius: 999, padding: '0 14px',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(14px)',
            border: 'none', boxShadow: '0 6px 16px rgba(0,22,96,0.10), 0 1px 3px rgba(0,22,96,0.06)',
            color: 'rgba(0,22,96,0.55)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{ color: 'rgba(0,22,96,0.45)' }}>{I(ICONS.search)}</span>
            {searchQ || 'Search address or ZIP code…'}
          </button>
          <FloatBtn icon={ICONS.filter} label="Filters" onClick={() => setFiltersOpen(true)} />
        </div>
      </div>

      {/* ── Floating right-side controls ─────────────────────────────── */}
      <div style={{
        position: 'absolute', right: 12,
        top: 'calc(env(safe-area-inset-top) + 120px)',
        zIndex: 28,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <FloatBtn icon={ICONS.layers} label="Map layers" onClick={() => setLayerMenuOpen(o => !o)} />
        <FloatBtn icon={ICONS.locate} label="My location" onClick={() => {
          if (!navigator.geolocation) return
          navigator.geolocation.getCurrentPosition((pos) => setFlyTo([pos.coords.latitude, pos.coords.longitude, 14]))
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 999, background: 'rgba(255,255,255,0.96)', boxShadow: '0 6px 16px rgba(0,22,96,0.10), 0 1px 3px rgba(0,22,96,0.06)', backdropFilter: 'blur(14px)' }}>
          <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" style={{ width: 40, height: 40, borderRadius: '999px 999px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#001660', border: 'none', cursor: 'pointer', padding: 0 }}>
            {I(ICONS.plus)}
          </button>
          <span style={{ height: 1, background: 'rgba(0,22,96,0.08)', margin: '0 8px' }} />
          <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" style={{ width: 40, height: 40, borderRadius: '0 0 999px 999px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: '#001660', border: 'none', cursor: 'pointer', padding: 0 }}>
            {I(ICONS.minus)}
          </button>
        </div>
        {layerMenuOpen && (
          <div style={{
            position: 'absolute', right: 48, top: 0,
            background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(12px)',
            borderRadius: 12, boxShadow: '0 12px 24px rgba(0,22,96,0.14)',
            padding: 6, minWidth: 140,
          }}>
            {['default', 'satellite'].map(l => (
              <button key={l} onClick={() => { setBaseLayer(l); setLayerMenuOpen(false) }} style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                background: baseLayer === l ? 'rgba(37,75,206,0.10)' : 'transparent',
                border: 'none', color: baseLayer === l ? '#254BCE' : '#001660',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              }}>{l === 'default' ? 'Map' : 'Satellite'}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Draw/Radius FAB cluster (lifted above the bottom sheet) ───── */}
      <div style={{
        position: 'absolute', right: 12,
        bottom: snap === 'collapsed' ? 232 : (snap === 'mid' ? 412 : 'calc(85vh + 12px)'),
        transition: 'bottom 280ms cubic-bezier(.4,0,.2,1)',
        zIndex: 28,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <FloatBtn
          icon={ICONS.draw}
          label="Draw area"
          primary={drawMode === 'polygon'}
          onClick={() => setDrawMode(drawMode === 'polygon' ? null : 'polygon')}
        />
        <FloatBtn
          icon={ICONS.radius}
          label="Radius mode"
          primary={drawMode === 'radius'}
          onClick={() => setDrawMode(drawMode === 'radius' ? null : 'radius')}
        />
      </div>

      {/* ── Draw instruction toast ──────────────────────────────────── */}
      {drawMode === 'polygon' && (
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 'calc(env(safe-area-inset-top) + 162px)',
          zIndex: 31,
          background: 'rgba(0,22,96,0.92)', color: '#fff',
          padding: '10px 14px', borderRadius: 12,
          fontSize: 12.5, fontWeight: 500, lineHeight: 1.35,
          boxShadow: '0 8px 20px rgba(0,22,96,0.25)',
          maxWidth: 'calc(100% - 24px)', textAlign: 'center',
        }}>
          Tap on the map to add points.<br />
          <span style={{ opacity: 0.7 }}>Tap the first point again to close the area.</span>
        </div>
      )}

      {/* ── Bottom sheet ─────────────────────────────────────────────── */}
      {!prescreening && !selectionMode && (
        <BottomSheet snap={snap} onSnap={setSnap}>
          {({ snap: s }) => (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {s === 'collapsed' && (
                <CollapsedContent stats={stats} onScan={() => onShape({ kind: 'demo' })} onPrescreen={startPrescreen} />
              )}
              {s !== 'collapsed' && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {/* Top stats + search input */}
                  <div style={{ padding: '4px 16px 10px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                      <Stat label="Homes"        value={stats.homes} />
                      <Stat label="Qualifying"   value={stats.qual} accent="#10B981" />
                      <Stat label="Not qualified" value={stats.homes - stats.qual} accent="rgba(0,22,96,0.5)" />
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, background: 'rgba(0,22,96,0.04)' }}>
                      <span style={{ color: 'rgba(0,22,96,0.4)' }}>{I(ICONS.search)}</span>
                      <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search properties…"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: '#001660' }} />
                      <button onClick={() => setSelectionMode(true)} style={{ background: 'transparent', border: 'none', color: '#254BCE', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Select</button>
                    </div>
                  </div>
                  {/* Property list */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 80px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {properties.map(p => (
                      <PropertyCard key={p.id} p={p} selected={selectedIds.has(p.id)} selectionMode={selectionMode} onToggle={toggleSelect} />
                    ))}
                  </div>
                  {/* Sticky run-prescreen button */}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'env(safe-area-inset-bottom)', padding: '10px 16px', background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 30%)' }}>
                    <button onClick={startPrescreen} style={{ width: '100%', padding: '14px', borderRadius: 14, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,22,96,0.30)' }}>
                      ▶ Run Prescreen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </BottomSheet>
      )}

      {/* ── Selection mode header + dock ─────────────────────────────── */}
      {selectionMode && (
        <>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 35,
            padding: 'calc(env(safe-area-inset-top) + 10px) 14px 10px',
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(0,22,96,0.06)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <button onClick={exitSelection} style={{ background: 'transparent', border: 'none', color: '#254BCE', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Cancel</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#001660' }}>{selectedIds.size} Selected</div>
            <button onClick={() => {
              const allOn = properties.length > 0 && properties.every(p => selectedIds.has(p.id))
              setSelectedIds(allOn ? new Set() : new Set(properties.map(p => p.id)))
            }} style={{ background: 'transparent', border: 'none', color: '#254BCE', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>Select All</button>
          </div>
          <BottomSheet snap="expanded" onSnap={() => {}}>
            {() => (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '6px 16px 10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stat label="Selected" value={selectedIds.size} accent="#254BCE" />
                  <Stat label="Of total" value={properties.length} />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 100px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {properties.map(p => (
                    <PropertyCard key={p.id} p={p} selected={selectedIds.has(p.id)} selectionMode onToggle={toggleSelect} />
                  ))}
                </div>
              </div>
            )}
          </BottomSheet>
          {/* Action dock */}
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
            padding: '10px 14px calc(14px + env(safe-area-inset-bottom))',
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(14px)',
            borderTop: '1px solid rgba(0,22,96,0.08)',
            display: 'flex', gap: 8,
          }}>
            <DockBtn icon={ICONS.mail}     label="Email"    primary onClick={() => alert(`Email ${selectedIds.size}`)} />
            <DockBtn icon={ICONS.card}     label="Postcard"          onClick={() => alert(`Postcard ${selectedIds.size}`)} />
            <DockBtn icon={ICONS.download} label="Export"            onClick={() => alert(`Export ${selectedIds.size}`)} />
            <DockBtn icon={ICONS.more}     label="More"              onClick={() => setMoreOpen(true)} />
          </div>
          {moreOpen && (
            <MoreActions count={selectedIds.size} onClose={() => setMoreOpen(false)} onDelete={() => { if (confirm(`Delete ${selectedIds.size}?`)) exitSelection() }} />
          )}
        </>
      )}

      {/* ── Prescreen loading overlay (in-sheet) ─────────────────────── */}
      {prescreening && (
        <BottomSheet snap="mid" onSnap={() => {}}>
          {() => (
            <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#001660' }}>Running prescreen…</div>
              <div style={{ fontSize: 12, color: 'rgba(0,22,96,0.55)' }}>Analyzing homeowners in your area</div>
              <div style={{
                position: 'relative', width: 132, height: 132, borderRadius: 999,
                background: `conic-gradient(#254BCE ${progress * 3.6}deg, rgba(37,75,206,0.10) 0deg)`,
                marginTop: 6,
              }}>
                <div style={{ position: 'absolute', inset: 10, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#001660', letterSpacing: '-0.02em' }}>{progress}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 22, marginTop: 6 }}>
                <Stat label="Total homes" value={stats.homes} />
                <Stat label="Scanned" value={Math.round(stats.homes * progress / 100)} accent="#254BCE" />
                <Stat label="Qualifying" value={Math.round(stats.qual * progress / 100)} accent="#10B981" />
              </div>
              <button onClick={() => setPrescreening(false)} style={{ marginTop: 8, padding: '10px 18px', borderRadius: 999, background: '#fff', border: '1px solid rgba(0,22,96,0.10)', color: '#001660', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          )}
        </BottomSheet>
      )}

      {/* ── Filter bottom sheet ─────────────────────────────────────── */}
      {filtersOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
          <div onClick={() => setFiltersOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.32)', backdropFilter: 'blur(2px)' }} />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: '#fff', borderRadius: '20px 20px 0 0',
            display: 'flex', flexDirection: 'column',
            maxHeight: '88vh',
            boxShadow: '0 -8px 30px rgba(0,22,96,0.18)',
            paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
          }}>
            <div style={{ width: 42, height: 5, borderRadius: 999, background: 'rgba(0,22,96,0.18)', margin: '10px auto 8px' }} />
            <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#001660' }}>Filters</span>
              <button onClick={() => setFilters({ equityMin: 50, fico: 660, monthsOwned: 24, incomeMin: 50, pool: 'any' })} style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Clear all</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <FilterSection title="Home Equity"        value={`$${filters.equityMin}k+`} defaultOpen>
                <MiniSlider value={filters.equityMin} min={0} max={500} step={5} onChange={v => setFilters(f => ({ ...f, equityMin: v }))} fmt={v => v ? `$${v}k` : 'Any'} />
              </FilterSection>
              <FilterSection title="Owner FICO Score"   value={`${filters.fico}+`}>
                <MiniSlider value={filters.fico} min={600} max={850} step={5} onChange={v => setFilters(f => ({ ...f, fico: v }))} />
              </FilterSection>
              <FilterSection title="Months of Ownership" value={`${filters.monthsOwned}+ months`}>
                <MiniSlider value={filters.monthsOwned} min={0} max={360} step={6} onChange={v => setFilters(f => ({ ...f, monthsOwned: v }))} />
              </FilterSection>
              <FilterSection title="Est. Household Income" value={`$${filters.incomeMin}k+`}>
                <MiniSlider value={filters.incomeMin} min={0} max={500} step={5} onChange={v => setFilters(f => ({ ...f, incomeMin: v }))} fmt={v => v ? `$${v}k` : 'Any'} />
              </FilterSection>
              <FilterSection title="Swimming Pool">
                <div style={{ display: 'flex', gap: 8 }}>
                  {['any', 'with', 'without'].map(v => (
                    <button key={v} onClick={() => setFilters(f => ({ ...f, pool: v }))} style={{
                      flex: 1, padding: '10px', borderRadius: 10,
                      background: filters.pool === v ? '#001660' : '#fff',
                      border: `1px solid ${filters.pool === v ? '#001660' : 'rgba(0,22,96,0.10)'}`,
                      color: filters.pool === v ? '#fff' : '#001660',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                      {v === 'any' ? 'Any' : v === 'with' ? 'With pool' : 'Without pool'}
                    </button>
                  ))}
                </div>
              </FilterSection>
              <FilterSection title="Advanced">
                <div style={{ fontSize: 12, color: 'rgba(0,22,96,0.5)' }}>Additional filters (property type, age, project cost…) coming next.</div>
              </FilterSection>
            </div>
            <div style={{ padding: '12px 16px 4px', borderTop: '1px solid rgba(0,22,96,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => setFiltersOpen(false)} style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Apply Filters
              </button>
              <button style={{ background: 'transparent', border: 'none', color: '#254BCE', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px' }}>Save as default</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Search overlay ──────────────────────────────────────────── */}
      {searchOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 75, background: '#F8F9FB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
            <button onClick={() => setSearchOpen(false)} style={{ background: 'transparent', border: 'none', color: '#001660', cursor: 'pointer', padding: 6, marginLeft: -6, flexShrink: 0 }}>{I(ICONS.back)}</button>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,22,96,0.05)', borderRadius: 12, padding: '8px 12px' }}>
              <span style={{ color: 'rgba(0,22,96,0.4)', flexShrink: 0 }}>{I(ICONS.search)}</span>
              <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search address or ZIP code…"
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#001660' }} />
              {searchQ && (
                <button onClick={() => setSearchQ('')} style={{ background: 'transparent', border: 'none', color: 'rgba(0,22,96,0.5)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>{I(ICONS.close)}</button>
              )}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Recent ZIP codes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {['95403', '95405', '94110', '78704', '85008'].map(z => (
                <button key={z} onClick={() => { setSearchQ(z); setSearchOpen(false) }} style={{ padding: '8px 14px', borderRadius: 999, background: '#fff', border: '1px solid rgba(0,22,96,0.10)', fontSize: 13, fontWeight: 600, color: '#001660', cursor: 'pointer' }}>{z}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Saved searches</div>
            <div style={{ fontSize: 13, color: 'rgba(0,22,96,0.55)' }}>None yet.</div>
          </div>
        </div>
      )}

      {/* ── Campaigns slide-over ────────────────────────────────────── */}
      {campaignsOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
          <div onClick={() => setCampaignsOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.40)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 'min(340px, 86vw)', background: '#fff', boxShadow: '8px 0 30px rgba(0,22,96,0.18)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,22,96,0.06)', display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#001660' }}>Campaigns</span>
              <button onClick={() => setCampaignsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#001660', cursor: 'pointer', padding: 0 }}>{I(ICONS.close)}</button>
            </div>
            <div style={{ flex: 1, padding: 16, fontSize: 13, color: 'rgba(0,22,96,0.55)' }}>
              <button onClick={() => { setCampaignsOpen(false); onOpenCampaigns?.() }} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 14 }}>
                + New Campaign
              </button>
              Campaign list loads here. (Backend wiring next pass.)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DockBtn({ icon, label, primary, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '10px 6px', borderRadius: 14,
      background: primary ? '#001660' : '#fff',
      color: primary ? '#fff' : '#001660',
      border: primary ? 'none' : '1px solid rgba(0,22,96,0.10)',
      boxShadow: primary ? '0 6px 14px rgba(0,22,96,0.30)' : 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      cursor: 'pointer',
    }}>
      {I(icon)}
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </button>
  )
}

function MoreActions({ count, onClose, onDelete }) {
  const item = (icon, label, onClick, destructive) => (
    <button onClick={() => { onClick?.(); onClose() }} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 12px', borderRadius: 12,
      background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      color: destructive ? '#DC2626' : '#001660',
      fontSize: 14, fontWeight: destructive ? 700 : 600,
    }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: destructive ? 'rgba(220,38,38,0.10)' : 'rgba(37,75,206,0.08)', color: destructive ? '#DC2626' : '#254BCE', flexShrink: 0 }}>
        {I(icon)}
      </span>
      {label}
    </button>
  )
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.32)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '12px 12px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 30px rgba(0,22,96,0.18)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,22,96,0.12)', margin: '4px auto 8px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#001660', padding: '4px 8px 6px' }}>More actions <span style={{ color: 'rgba(0,22,96,0.45)', fontWeight: 500, marginLeft: 4 }}>· {count}</span></div>
        {item(ICONS.download, 'Export as CSV', () => alert('Export CSV'))}
        {item(ICONS.mail,     'Add to CFC',    () => alert('Add to CFC'))}
        {item(ICONS.draw,     'Assign to Rep', () => alert('Assign rep'))}
        {item(ICONS.chevRt,   'Move Stage',    () => alert('Move stage'))}
        <div style={{ height: 1, background: 'rgba(0,22,96,0.08)', margin: '6px 12px 4px' }} />
        {item(ICONS.trash, 'Delete Leads', onDelete, true)}
      </div>
    </div>
  )
}
