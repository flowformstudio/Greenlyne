import { useEffect, useMemo, useRef, useState } from 'react'
import GeoLeafletMap from '../components/GeoLeafletMap'
import {
  listSavedCampaigns, getSavedCampaignDetail,
  getPropertiesByCriteria, getPropertiesCountPolygon,
  saveCampaignMail, getCampaignCollectionDetail, getPropertiesForCampaign,
} from '../lib/glyneApi'
import { loadGeoState, saveGeoState } from '../lib/geoPrescreenState'

/* GeoMapMobile — phone-first variant of the Geo Prescreen workflow.
   - Map is the hero, full viewport.
   - Translucent top header (back, title, view-toggle).
   - Floating right-side controls (zoom, locate, layers, draw, radius).
   - Draggable bottom sheet with 3 snap heights.
   - Filter sheet + selection mode dock.
   This is a self-contained shell for the mobile UX; the props let the parent
   wire it to the existing GeoCampaigns data layer when ready. */

const I = (d, size = 18) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
const ICONS = {
  back:    <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  menu:    <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  search:  <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  filter:  <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  layers:  <><polygon points="12 2 22 7 12 12 2 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  locate:  <><circle cx="12" cy="12" r="3.2" fill="currentColor"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/><line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/></>,
  plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5"  y1="12" x2="19" y2="12"/></>,
  minus:   <><line x1="5"  y1="12" x2="19" y2="12"/></>,
  close:   <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6"  y1="6" x2="18" y2="18"/></>,
  draw:    <><path strokeLinecap="round" strokeLinejoin="round" d="M8.17541 16.8263 2.69336 4.65838 14.8789 6.89422l6.428 -5.924982L20.9715 14.552l-9.9477 3.2393"/><path d="M6.172 19.027a2.641 2.023 0 1 0 5.282 0 2.641 2.023 0 1 0 -5.282 0"/><path strokeLinecap="round" strokeLinejoin="round" d="M11.3477 20.1711c1.7154 0.3318 1.918 1.9094 1.7154 2.8596"/></>,
  radius:  <><path d="M22.284 16.706a11.1 11.1 0 0 1 -1.18 2.032"/><path d="M16.938 22.235a7.314 7.314 0 0 1 -1.083 0.459 7.455 7.455 0 0 1 -1.125 0.344"/><path d="M9.292 23.038a7.49 7.49 0 0 1 -1.125 -0.344 7.314 7.314 0 0 1 -1.083 -0.459"/><path d="M2.918 18.739a11.132 11.132 0 0 1 -1.179 -2.033"/><path d="M0.8 11.348a11.1 11.1 0 0 1 0.4 -2.315"/><path d="M3.924 4.323a12.406 12.406 0 0 1 1.8 -1.518"/><path d="m10.835 0.945 1.176 -0.062 1.176 0.062"/><path d="M18.3 2.805a12.452 12.452 0 0 1 1.8 1.518"/><path d="M22.819 9.033a11.039 11.039 0 0 1 0.4 2.315"/><path d="M8.261 12.133a3.75 3.75 0 1 0 7.5 0 3.75 3.75 0 1 0 -7.5 0Z"/></>,
  chevDn:  <><polyline points="6 9 12 15 18 9"/></>,
  chevRt:  <><polyline points="9 18 15 12 9 6"/></>,
  check:   <><polyline points="20 6 9 17 4 12"/></>,
  more:    <><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>,
  expand:  <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>,
  collapse:<><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></>,
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

/* Search overlay — real Mapbox geocoding (US only). */
function SearchOverlay({ open, onClose, query, setQuery, onPick }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const token = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || ''

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = (query || '').trim()
    if (q.length < 3 || !token) { setResults([]); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?country=us&limit=6&types=address,postcode,place,locality,neighborhood&autocomplete=true&access_token=${token}`
        const r = await fetch(url).then(r => r.json()).catch(() => null)
        setResults(Array.isArray(r?.features) ? r.features : [])
      } finally { setLoading(false) }
    }, 250)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [query, open, token])

  if (!open) return null
  const pickResult = (f) => {
    const [lng, lat] = f.center || []
    if (typeof lat === 'number' && typeof lng === 'number') {
      const isAddress = (f.place_type || []).includes('address')
      onPick({ lat, lng, zoom: isAddress ? 17 : 13 })
    }
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1210, background: '#F8F9FB',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      width: '100vw', maxWidth: '100vw', boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 'calc(env(safe-area-inset-top) + 14px) 16px 14px',
        background: '#fff', borderBottom: '1px solid rgba(0,22,96,0.06)',
        boxSizing: 'border-box', width: '100%',
      }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#001660', cursor: 'pointer', padding: 6, marginLeft: -6, flexShrink: 0 }}>{I(ICONS.back)}</button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,22,96,0.05)', borderRadius: 12, padding: '8px 12px' }}>
          <span style={{ color: 'rgba(0,22,96,0.4)', flexShrink: 0 }}>{I(ICONS.search)}</span>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search address or ZIP code…"
            style={{ flex: 1, minWidth: 0, width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#001660' }} />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 'none', color: 'rgba(0,22,96,0.5)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>{I(ICONS.close)}</button>
          )}
        </div>
      </div>
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: 12, paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        boxSizing: 'border-box', width: '100%',
      }}>
        {!token && (
          <div style={{ fontSize: 12.5, color: 'rgba(0,22,96,0.55)', padding: 16, textAlign: 'center' }}>
            Address search requires a Mapbox token (VITE_MAPBOX_TOKEN).
          </div>
        )}
        {token && query.trim().length < 3 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '6px 4px 8px' }}>Recent ZIP codes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18, padding: '0 4px' }}>
              {['95403', '95405', '94110', '78704', '85008'].map(z => (
                <button key={z} onClick={() => setQuery(z)} style={{ padding: '8px 14px', borderRadius: 999, background: '#fff', border: '1px solid rgba(0,22,96,0.10)', fontSize: 13, fontWeight: 600, color: '#001660', cursor: 'pointer' }}>{z}</button>
              ))}
            </div>
          </>
        )}
        {token && loading && query.trim().length >= 3 && (
          <div style={{ fontSize: 12.5, color: 'rgba(0,22,96,0.55)', padding: 16, textAlign: 'center' }}>Searching…</div>
        )}
        {token && !loading && query.trim().length >= 3 && results.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'rgba(0,22,96,0.55)', padding: 16, textAlign: 'center' }}>No matches for "{query.trim()}".</div>
        )}
        {results.map((f, i) => (
          <button key={f.id || i} onClick={() => pickResult(f)} style={{
            width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 12px', borderRadius: 12,
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}>
            <span style={{ width: 32, height: 32, borderRadius: 999, background: 'rgba(37,75,206,0.10)', color: '#254BCE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {I(ICONS.search)}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#001660', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.text}</div>
              <div style={{ fontSize: 11.5, color: 'rgba(0,22,96,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.place_name}</div>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* Draggable bottom sheet — supports three snap heights. */
function BottomSheet({ snap = 'collapsed', onSnap, children, snapHeights = { collapsed: 220, mid: 400, expanded: '85vh' }, fullscreenToggle = false }) {
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
      zIndex: 1090,
      background: '#fff',
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -8px 28px rgba(0,22,96,0.16), 0 -1px 3px rgba(0,22,96,0.08)',
      height: typeof height === 'number' ? `${height}px` : height,
      maxHeight: '90vh',
      transition: 'height 280ms cubic-bezier(.4,0,.2,1)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      <div style={{ flexShrink: 0, position: 'relative', paddingTop: 8, paddingBottom: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={() => onSnap?.(snap === 'expanded' ? 'collapsed' : (snap === 'collapsed' ? 'mid' : 'expanded'))}
          style={{ width: 80, padding: '6px 0', display: 'flex', justifyContent: 'center', cursor: 'grab' }}>
          <span style={{ width: 42, height: 5, borderRadius: 999, background: 'rgba(0,22,96,0.18)' }} />
        </div>
        {fullscreenToggle && (
          <button onClick={() => onSnap?.(snap === 'expanded' ? 'mid' : 'expanded')}
            aria-label={snap === 'expanded' ? 'Exit fullscreen' : 'Fullscreen'}
            style={{
              position: 'absolute', top: 6, right: 10,
              width: 30, height: 30, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              color: 'rgba(0,22,96,0.55)', cursor: 'pointer', padding: 0,
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {snap === 'expanded' ? ICONS.collapse : ICONS.expand}
            </svg>
          </button>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children({ snap })}
      </div>
    </div>
  )
}

/* Stats row + CTAs (collapsed state content). */
function CollapsedContent({ stats, onScan, onPrescreen, shapeDrawn }) {
  if (!shapeDrawn) {
    return (
      <div style={{ padding: '6px 16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'rgba(0,22,96,0.30)' }}>
          {I(ICONS.draw, 24)}
        </span>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(0,22,96,0.55)', textAlign: 'center' }}>
          Define area to see households
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(0,22,96,0.40)', textAlign: 'center', maxWidth: 280, lineHeight: 1.35 }}>
          Use the Draw or Radius tool on the right to outline an area.
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 22 }}>
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
  const [mapShape, setMapShape] = useState(null)       // { kind, latlngs, bbox, areaKm2, center, radius }
  const [baseLayer, setBaseLayer] = useState('default') // 'default' | 'satellite'
  const [flyTo, setFlyTo] = useState(null)
  const [households, setHouseholds] = useState([])      // markers on the map
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const [drawBarOpen, setDrawBarOpen] = useState(false)
  const [overlays, setOverlays] = useState([])         // saved-campaign polygon overlays
  const [realProperties, setRealProperties] = useState([])
  const [realCount, setRealCount] = useState(null)
  const [propsLoading, setPropsLoading] = useState(false)
  const [savedCampaigns, setSavedCampaigns] = useState([])
  const [savedCampaignsLoading, setSavedCampaignsLoading] = useState(false)
  const liveCollectionIdRef = useRef(null)
  const liveCampaignIdRef = useRef(null)
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

  /* Adapt backend property rows to the card shape the UI expects. */
  const adaptedReal = useMemo(() => realProperties.map((p, i) => {
    const street = p.Address || p.address || ''
    const city = [p.City, p.State, p.ZipCode].filter(Boolean).join(', ')
    const qualified = (p.qualifies ?? p.is_qualified) ?? (
      (p.FICO != null && p.AvailableEquity != null)
        ? (p.FICO >= 660 && p.AvailableEquity >= 50_000) : undefined
    )
    const homeValue = Number(p.HomeValue ?? p.home_value ?? 0)
    const equity    = Number(p.AvailableEquity ?? p.available_equity ?? 0)
    return {
      id: p.PropertyId ?? p.id ?? `real-${i}`,
      address: street || '—',
      city,
      value: homeValue ? `$${homeValue.toLocaleString()}` : '—',
      equity: equity ? `$${equity.toLocaleString()}` : '—',
      qualified,
      lat: p.Latitude ?? p.latitude ?? null,
      lng: p.Longitude ?? p.longitude ?? null,
    }
  }), [realProperties])

  /* Pick live data when we have any, demo fallback otherwise. */
  const baseProperties = adaptedReal.length > 0 ? adaptedReal : DEMO_PROPERTIES

  const properties = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    return q
      ? baseProperties.filter(p => (p.address || '').toLowerCase().includes(q) || (p.city || '').toLowerCase().includes(q))
      : baseProperties
  }, [baseProperties, searchQ])

  const stats = useMemo(() => {
    const total = realCount ?? properties.length
    const qual  = adaptedReal.length > 0
      ? adaptedReal.filter(p => p.qualified).length
      : properties.filter(p => p.qualified).length
    const med   = adaptedReal.length > 0
      ? (() => {
          const vals = realProperties.map(p => Number(p.HomeValue ?? p.home_value ?? 0)).filter(Boolean).sort((a, b) => a - b)
          if (!vals.length) return '—'
          const m = vals[Math.floor(vals.length / 2)]
          return m >= 1000 ? `$${Math.round(m / 1000)}k` : `$${m}`
        })()
      : '$114k'
    return { homes: total, qual, med }
  }, [realCount, properties, adaptedReal, realProperties])

  /* On mount: pull the tenant's saved campaigns so the drawer shows real data. */
  useEffect(() => {
    let cancelled = false
    setSavedCampaignsLoading(true)
    listSavedCampaigns()
      .then(d => { if (!cancelled) setSavedCampaigns(Array.isArray(d?.results) ? d.results : (Array.isArray(d) ? d : [])) })
      .catch(e => console.warn('[GeoMapMobile] listSavedCampaigns', e))
      .finally(() => { if (!cancelled) setSavedCampaignsLoading(false) })
    return () => { cancelled = true }
  }, [])

  /* Restore the in-progress shape from sessionStorage so a resize back from
     desktop preserves what the user was working on. Runs once. */
  useEffect(() => {
    const s = loadGeoState()
    if (!s || !Array.isArray(s.latlngs) || s.latlngs.length < 3) return
    const latlngs = s.latlngs
    setMapShape({ kind: s.kind || 'polygon', latlngs })
    setShapeDrawn(true)
    setSnap('mid')
    if (s.collectionId) liveCollectionIdRef.current = s.collectionId
    if (s.campaignId)   liveCampaignIdRef.current   = s.campaignId
    if (s.campaignId) {
      // Pull cached rows for this campaign instead of re-running by-criteria.
      ;(async () => {
        try {
          const propsData = await getPropertiesForCampaign({
            campaignId: s.campaignId,
            ...filterRanges(),
            mode: 'read', pageSize: 100,
          }).catch(() => null)
          const rows = Array.isArray(propsData?.results) ? propsData.results : []
          if (rows.length > 0) {
            setRealProperties(rows)
            setRealCount(rows.length)
            setHouseholds(rows.map((p, i) => ({
              id: p.PropertyId ?? p.id ?? `r-${i}`,
              lat: p.Latitude ?? p.latitude,
              lng: p.Longitude ?? p.longitude,
              qualified: (p.qualifies ?? p.is_qualified) ?? null,
              address: p.Address || p.address || '',
            })).filter(h => typeof h.lat === 'number' && typeof h.lng === 'number'))
          }
        } catch {}
      })()
    } else if (latlngs.length >= 3) {
      // No campaign id yet — just re-fetch by criteria so the cards aren't blank.
      onShape({ kind: s.kind || 'polygon', latlngs })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Persist shape + ids whenever they change so a resize hand-off is seamless. */
  useEffect(() => {
    if (!mapShape?.latlngs || mapShape.latlngs.length < 3) return
    saveGeoState({
      latlngs: mapShape.latlngs,
      kind: mapShape.kind,
      collectionId: liveCollectionIdRef.current ?? null,
      campaignId:   liveCampaignIdRef.current   ?? null,
    })
  }, [mapShape])

  /* Build filter ranges in the shape the backend expects. */
  function filterRanges() {
    const equity = [Math.max(0, Number(filters.equityMin || 0) * 1000), 99_999_000]
    const fico   = [Math.max(600, Number(filters.fico || 660)), 850]
    const months = [Math.max(0, Number(filters.monthsOwned || 0)), 360]
    return { fico, equity, cltv: [0, 100], monthOwnership: months }
  }

  /* Real prescreen: save → trigger → poll → read. Falls back to demo
     progress animation if the API isn't reachable so the UI still feels alive. */
  async function startPrescreen() {
    if (!shapeDrawn || !mapShape?.latlngs) { setSnap('mid'); return }
    setPrescreening(true); setProgress(5)
    try {
      const ranges = filterRanges()
      // 1) Ensure we have a campaign for this shape
      if (!liveCampaignIdRef.current) {
        const name = `mobile_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        await saveCampaignMail({ name, latlngs: mapShape.latlngs, ...ranges })
        let collectionId = null
        for (let i = 0; i < 5 && !collectionId; i++) {
          await new Promise(r => setTimeout(r, 700))
          const list = await listSavedCampaigns().catch(() => null)
          const arr = list?.results || list || []
          const hit = arr.find(c => c.name === name)
          if (hit) collectionId = hit.id
        }
        if (!collectionId) throw new Error('Could not locate saved campaign')
        const detail = await getCampaignCollectionDetail(collectionId)
        const camp = (detail?.results || [])[0]
        if (!camp?.id) throw new Error('No campaign_id from backend')
        liveCollectionIdRef.current = collectionId
        liveCampaignIdRef.current   = camp.id
        saveGeoState({ collectionId, campaignId: camp.id })
      }
      const campaignId = liveCampaignIdRef.current
      setProgress(20)
      // 2) Trigger
      await getPropertiesForCampaign({ campaignId, ...ranges, mode: 'trigger' })
      setProgress(35)
      // 3) Poll (lightweight — every 2s, up to 90s, with opportunistic reads)
      let propsData = null
      for (let i = 0; i < 45 && !propsData; i++) {
        await new Promise(r => setTimeout(r, 2000))
        setProgress(p => Math.min(90, p + 1.4))
        const d = await getCampaignCollectionDetail(liveCollectionIdRef.current).catch(() => null)
        const c = (d?.results || []).find(x => x.id === campaignId)
        const status = c?.status || ''
        if (status === 'Get Household Success' || status === 'Get Household Failed' || i >= 3 && i % 3 === 0) {
          const r = await getPropertiesForCampaign({ campaignId, ...ranges, mode: 'read', pageSize: 100 }).catch(() => null)
          if (Array.isArray(r?.results) && r.results.length > 0) propsData = r
        }
      }
      // 4) Final read if poll exited without rows.
      if (!propsData) {
        propsData = await getPropertiesForCampaign({ campaignId, ...ranges, mode: 'read', pageSize: 100 }).catch(() => null)
      }
      const rows = Array.isArray(propsData?.results) ? propsData.results : []
      setRealProperties(rows)
      setRealCount(rows.length || realCount)
      setHouseholds(rows.map((p, i) => ({
        id: p.PropertyId ?? p.id ?? `r-${i}`,
        lat: p.Latitude ?? p.latitude,
        lng: p.Longitude ?? p.longitude,
        qualified: (p.qualifies ?? p.is_qualified) ?? null,
        address: p.Address || p.address || '',
      })).filter(h => typeof h.lat === 'number' && typeof h.lng === 'number'))
    } catch (err) {
      console.warn('[GeoMapMobile] prescreen failed', err)
    } finally {
      setProgress(100)
      setTimeout(() => { setPrescreening(false); setSnap('expanded') }, 350)
    }
  }

  /* When user draws a shape on the map: persist + fetch real properties. */
  async function onShape(shape) {
    setShapeDrawn(true)
    setDrawMode(null)
    setMapShape(shape)
    setSnap('mid')
    if (!shape?.latlngs || shape.latlngs.length < 3) return
    setPropsLoading(true)
    try {
      const [countData, propsData] = await Promise.all([
        getPropertiesCountPolygon(shape.latlngs).catch(() => null),
        getPropertiesByCriteria(shape.latlngs, { filters: {
          equity: Number(filters.equityMin || 0),
          fico:   Number(filters.fico       || 660),
          monthsOwned: Number(filters.monthsOwned || 0),
        } }).catch(() => null),
      ])
      const cnt = countData?.count_of_properties ?? null
      if (typeof cnt === 'number') setRealCount(cnt)
      const rows = Array.isArray(propsData?.results) ? propsData.results : []
      setRealProperties(rows)
      setHouseholds(rows.map((p, i) => ({
        id: p.PropertyId ?? p.id ?? `r-${i}`,
        lat: p.Latitude ?? p.latitude,
        lng: p.Longitude ?? p.longitude,
        qualified: (p.qualifies ?? p.is_qualified) ?? null,
        address: p.Address || p.address || '',
      })).filter(h => typeof h.lat === 'number' && typeof h.lng === 'number'))
    } finally {
      setPropsLoading(false)
    }
  }

  /* Load a saved campaign from the drawer: pull polygon, overlay it, fetch rows. */
  async function loadSavedCampaign(c) {
    try {
      const detail = await getSavedCampaignDetail(c.id)
      const r = Array.isArray(detail?.results) && detail.results[0] ? detail.results[0] : null
      if (!Array.isArray(r?.polygon_coordinates) || r.polygon_coordinates.length < 3) return
      const latlngs = r.polygon_coordinates.map(([lng, lat]) => [lat, lng])
      liveCollectionIdRef.current = c.id
      liveCampaignIdRef.current = r.id ?? r.campaign_id ?? null
      saveGeoState({ collectionId: c.id, campaignId: r.id ?? r.campaign_id ?? null })
      setOverlays([{ id: `camp-${c.id}`, latlngs: r.polygon_coordinates, color: '#254BCE', name: c.name || `#${c.id}`, popupHtml: '', fitBounds: true }])
      setCampaignsOpen(false)
      await onShape({ kind: 'polygon', latlngs })
    } catch (err) {
      console.warn('[GeoMapMobile] loadSavedCampaign', err)
    }
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
          overlays={overlays}
          flyTo={flyTo}
          baseLayer={baseLayer}
          onMapReady={(m) => { mapRef.current = m }}
        />
      </div>

      {/* ── Top row: back arrow + search pill. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1100,
        padding: 'calc(env(safe-area-inset-top) + 10px) 12px 0',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <FloatBtn icon={ICONS.back} label="Back" onClick={onBack} />
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
      </div>

      {/* ── Left row under search: Campaigns icon + Filters pill. */}
      {(() => {
        const defaultFilters = { equityMin: 50, fico: 660, monthsOwned: 24, incomeMin: 50, pool: 'any' }
        const filtersChanged =
          filters.equityMin   !== defaultFilters.equityMin ||
          filters.fico        !== defaultFilters.fico ||
          filters.monthsOwned !== defaultFilters.monthsOwned ||
          filters.incomeMin   !== defaultFilters.incomeMin ||
          filters.pool        !== defaultFilters.pool
        return (
          <div style={{
            position: 'absolute', left: 12,
            top: 'calc(env(safe-area-inset-top) + 64px)',
            zIndex: 1080,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <FloatBtn icon={ICONS.menu} label="Open campaigns" onClick={() => setCampaignsOpen(true)} />
            <button onClick={() => setFiltersOpen(true)} aria-label="Open filters" style={{
              height: 40, padding: '0 14px 0 12px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: filtersChanged ? 'rgba(37,75,206,0.10)' : 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(14px)',
              color: filtersChanged ? '#254BCE' : '#001660',
              border: `1px solid ${filtersChanged ? 'rgba(37,75,206,0.45)' : 'rgba(0,22,96,0.06)'}`,
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(0,22,96,0.14), 0 1px 3px rgba(0,22,96,0.08)',
              fontSize: 13, fontWeight: 600,
            }}>
              {I(ICONS.filter)}
              Filters
              {filtersChanged && (
                <span style={{
                  width: 8, height: 8, borderRadius: 999, background: '#254BCE',
                  boxShadow: '0 0 0 2px #fff',
                }} />
              )}
            </button>
          </div>
        )
      })()}

      {/* ── Top-right floating controls: Draw · Radius. */}
      <div style={{
        position: 'absolute', right: 12,
        top: 'calc(env(safe-area-inset-top) + 64px)',
        zIndex: 1080,
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

      {/* ── Bottom-right cluster: Layers · Locate · Zoom +/-  (lifted above the sheet). */}
      <div style={{
        position: 'absolute', right: 12,
        bottom: snap === 'collapsed' ? ((shapeDrawn ? 220 : 130) + 12) : (snap === 'mid' ? 412 : 'calc(85vh + 12px)'),
        transition: 'bottom 280ms cubic-bezier(.4,0,.2,1)',
        zIndex: 1080,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      }}>
        <div style={{ position: 'relative' }}>
          <FloatBtn icon={ICONS.layers} label="Map layers" onClick={() => setLayerMenuOpen(o => !o)} />
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
      </div>

      {/* ── Draw / Radius instruction toast (touch-friendly copy). */}
      {(drawMode === 'polygon' || drawMode === 'radius') && (
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 'calc(env(safe-area-inset-top) + 162px)',
          zIndex: 1105,
          background: 'rgba(0,22,96,0.92)', color: '#fff',
          padding: '10px 14px', borderRadius: 12,
          fontSize: 12.5, fontWeight: 500, lineHeight: 1.35,
          boxShadow: '0 8px 20px rgba(0,22,96,0.25)',
          maxWidth: 'calc(100% - 24px)', textAlign: 'center',
        }}>
          {drawMode === 'polygon' ? (
            <>Tap on the map to add points.<br />
            <span style={{ opacity: 0.7 }}>Tap the first point again to close the area.</span></>
          ) : (
            <>Tap on the map to place a center, then drag outward to size your radius.<br />
            <span style={{ opacity: 0.7 }}>Release to set the radius.</span></>
          )}
        </div>
      )}

      {/* ── Persistent radius badge — always visible after placing a circle. */}
      {shapeDrawn && mapShape?.kind === 'circle' && mapShape.radius != null && (
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: 'calc(env(safe-area-inset-top) + 116px)',
          zIndex: 1105,
          background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
          color: '#001660',
          padding: '6px 12px 6px 10px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, fontWeight: 700,
          boxShadow: '0 6px 16px rgba(0,22,96,0.14), 0 1px 3px rgba(0,22,96,0.06)',
          border: '1px solid rgba(37,75,206,0.30)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#254BCE' }} />
          {(() => {
            const miles = (Number(mapShape.radius) || 0) / 1609.344
            return miles >= 1 ? `${miles.toFixed(1)} mi radius` : `${miles.toFixed(2)} mi radius`
          })()}
        </div>
      )}

      {/* ── Bottom sheet ─────────────────────────────────────────────── */}
      {!prescreening && !selectionMode && (
        <BottomSheet
          snap={snap}
          onSnap={setSnap}
          snapHeights={{ collapsed: shapeDrawn ? 220 : 130, mid: 400, expanded: '85vh' }}
          fullscreenToggle={shapeDrawn}
        >
          {({ snap: s }) => (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {s === 'collapsed' && (
                <CollapsedContent stats={stats} shapeDrawn={shapeDrawn} onScan={() => onShape({ kind: 'demo' })} onPrescreen={startPrescreen} />
              )}
              {s !== 'collapsed' && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {/* Top stats + search input */}
                  <div style={{ padding: '4px 16px 10px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 22 }}>
                      <Stat label="Homes"         value={stats.homes} />
                      <Stat label="Qualifying"    value={stats.qual} accent="#10B981" />
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
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1110,
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
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1120,
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }}>
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
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        query={searchQ}
        setQuery={setSearchQ}
        onPick={(loc) => {
          setFlyTo([loc.lat, loc.lng, loc.zoom || 14])
          setSearchOpen(false)
        }}
      />

      {/* ── Campaigns slide-over ────────────────────────────────────── */}
      {campaignsOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1220 }}>
          <div onClick={() => setCampaignsOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.40)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 'min(340px, 86vw)', background: '#fff', boxShadow: '8px 0 30px rgba(0,22,96,0.18)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,22,96,0.06)', display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#001660' }}>Campaigns</span>
              <button onClick={() => setCampaignsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#001660', cursor: 'pointer', padding: 0 }}>{I(ICONS.close)}</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 16px' }}>
              <button onClick={() => { setCampaignsOpen(false); onOpenCampaigns?.() }} style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 14 }}>
                + New Campaign
              </button>
              {savedCampaignsLoading && (
                <div style={{ padding: 18, textAlign: 'center', color: 'rgba(0,22,96,0.55)', fontSize: 12 }}>Loading campaigns…</div>
              )}
              {!savedCampaignsLoading && savedCampaigns.length === 0 && (
                <div style={{ padding: 18, textAlign: 'center', color: 'rgba(0,22,96,0.55)', fontSize: 12 }}>No saved campaigns yet.</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {savedCampaigns.map(c => (
                  <button key={c.id} onClick={() => loadSavedCampaign(c)} style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 12px', borderRadius: 10,
                    background: 'transparent', border: '1px solid rgba(0,22,96,0.06)',
                    cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#001660', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || `Campaign #${c.id}`}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: 'rgba(0,22,96,0.5)' }}>{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#001660' }}>{(c.total_property_count ?? c.selected_households ?? 0).toLocaleString()}</span>
                    </div>
                  </button>
                ))}
              </div>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1230 }}>
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
