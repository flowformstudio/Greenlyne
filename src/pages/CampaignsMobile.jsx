import { useMemo, useState } from 'react'

/* CampaignsMobile — responsive Campaigns feed for phone viewports.
   Reads the already-fetched `campaigns` array + cover helpers from the parent
   so behavior (search / filter / sort / loading) stays consistent across breakpoints. */

const STATUS_TINT = {
  active:     { bg: 'rgba(16,185,129,0.12)', color: '#016163', dot: '#10B981', label: 'Active' },
  paused:     { bg: 'rgba(245,158,11,0.14)', color: '#92400E', dot: '#F59E0B', label: 'Paused' },
  draft:      { bg: 'rgba(99,102,241,0.10)', color: '#4338CA', dot: '#6366F1', label: 'Draft' },
  processing: { bg: 'rgba(37,75,206,0.10)',  color: '#254BCE', dot: '#254BCE', label: 'Processing' },
}

const SORTS = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'qualified', label: 'Qualified — most first' },
  { value: 'targeted',  label: 'Targeted — most first' },
  { value: 'name',      label: 'Name (A → Z)' },
]

const STATUS_FILTERS = ['all', 'active', 'paused', 'draft']

function Icon({ d, w = 18, h = 18, stroke = 2 }) {
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  )
}

const I = {
  search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  filter: <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  sort:   <><line x1="3" y1="6" x2="13" y2="6"/><line x1="3" y1="12" x2="11" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/><polyline points="17 14 21 10 17 6"/><line x1="21" y1="10" x2="14" y2="10"/></>,
  plus:   <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  close:  <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  back:   <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  map:    <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
  edit:   <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  crm:    <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  more:   <><circle cx="5"  cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>,
  list:   <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  grid:   <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
}

function StatusBadge({ status }) {
  const m = STATUS_TINT[status] || STATUS_TINT.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 8px', borderRadius: 999,
      background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)',
      color: m.color, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      border: `1px solid ${m.dot}33`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.dot }} />
      {m.label}
    </span>
  )
}

function IconBtn({ icon, label, onClick, badge = 0, primary = false }) {
  const baseStyle = {
    position: 'relative',
    flex: '0 0 auto', width: 38, height: 38, borderRadius: 999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
  }
  return (
    <button onClick={onClick} aria-label={label} style={{
      ...baseStyle,
      background: primary ? '#001660' : '#fff',
      color: primary ? '#fff' : 'rgba(0,22,96,0.7)',
      border: primary ? 'none' : '1px solid rgba(0,22,96,0.10)',
      boxShadow: primary ? '0 6px 14px rgba(0,22,96,0.25)' : 'none',
    }}>
      <Icon d={icon} w={15} h={15} stroke={2} />
      {badge > 0 && (
        <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: '#254BCE', color: '#fff', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 2px #F8F9FB' }}>
            {badge}
          </span>
      )}
    </button>
  )
}

function Pill({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      flex: '0 0 auto', padding: '8px 14px', borderRadius: 999,
      background: active ? (color ? `${color}1A` : '#001660') : '#fff',
      border: `1px solid ${active ? (color ? `${color}55` : '#001660') : 'rgba(0,22,96,0.10)'}`,
      color: active ? (color || '#fff') : 'rgba(0,22,96,0.75)',
      fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{label}</button>
  )
}

function MetricCell({ label, value, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '8px 4px' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: accent || '#001660', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,22,96,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function ActionTile({ icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '10px 8px', borderRadius: 12,
      background: '#F8F9FB', border: '1px solid rgba(0,22,96,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      color: '#001660', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    }}>
      <Icon d={icon} w={14} h={14} stroke={2} />
      {label}
    </button>
  )
}

function CampaignCard({ c, getCover, onOpen, onEdit, onCrm, onMore }) {
  const cover = getCover ? getCover(c) : c.cityImg
  return (
    <div style={{
      width: '100%', maxWidth: '100%', boxSizing: 'border-box',
      borderRadius: 22, background: '#fff', overflow: 'hidden',
      border: '1px solid rgba(0,22,96,0.06)',
      boxShadow: '0 4px 18px rgba(0,22,96,0.06), 0 1px 3px rgba(0,22,96,0.04)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Map preview */}
      <div onClick={onOpen} style={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9',
        background: '#EEF2F7', cursor: 'pointer',
      }}>
        {cover && (
          <img src={cover} alt={c.name || c.cityLabel || 'Campaign area'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                     filter: c.status === 'paused' ? 'grayscale(45%) brightness(0.92)' : 'none' }} />
        )}
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <StatusBadge status={c.status || 'draft'} />
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '14px 16px 14px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(0,22,96,0.5)', marginTop: 3 }}>
          {[c.type, c.period, c.launched && `Launched ${c.launched}`].filter(Boolean).join(' · ')}
        </div>
        {/* Metrics */}
        <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 12, gap: 0,
                       borderTop: '1px solid rgba(0,22,96,0.06)', paddingTop: 8 }}>
          <MetricCell label="Targeted"  value={(c.targeted ?? 0).toLocaleString()}  accent="#001660" />
          <div style={{ width: 1, background: 'rgba(0,22,96,0.06)' }} />
          <MetricCell label="Qualified" value={(c.qualified ?? 0).toLocaleString()} accent="#254BCE" />
          <div style={{ width: 1, background: 'rgba(0,22,96,0.06)' }} />
          <MetricCell label="Engaged"   value={c.engaged > 0 ? c.engaged.toLocaleString() : '—'} accent={c.engaged > 0 ? '#D97706' : '#C0C7D4'} />
          <div style={{ width: 1, background: 'rgba(0,22,96,0.06)' }} />
          <MetricCell label="Hot"       value={c.hot > 0 ? c.hot.toLocaleString() : '—'} accent={c.hot > 0 ? '#F97316' : '#C0C7D4'} />
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <ActionTile icon={I.crm}  label="CRM"    onClick={onCrm} />
          <ActionTile icon={I.map}  label="Map"    onClick={onOpen} />
          <ActionTile icon={I.edit} label="Edit"   onClick={onEdit} />
          <button onClick={onMore} aria-label="More" style={{
            width: 38, padding: 0, borderRadius: 12,
            background: '#F8F9FB', border: '1px solid rgba(0,22,96,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(0,22,96,0.65)', cursor: 'pointer',
          }}><Icon d={I.more} w={14} h={14} stroke={2} /></button>
        </div>
      </div>
    </div>
  )
}

function CardSkeleton() {
  const shimmer = 'linear-gradient(110deg, #EEF2F7 8%, #F7FAFD 18%, #EEF2F7 33%)'
  const block = (style) => <div style={{ background: shimmer, backgroundSize: '200% 100%', animation: 'ff-shimmer 1.6s linear infinite', borderRadius: 8, ...style }} />
  return (
    <div style={{ width: '100%', borderRadius: 22, background: '#fff', overflow: 'hidden',
                  border: '1px solid rgba(0,22,96,0.06)', boxShadow: '0 1px 3px rgba(0,22,96,0.04)' }}>
      {block({ width: '100%', aspectRatio: '16 / 9', borderRadius: 0 })}
      <div style={{ padding: '14px 16px' }}>
        {block({ width: '60%', height: 16, marginBottom: 8 })}
        {block({ width: '40%', height: 11, marginBottom: 12 })}
        <div style={{ display: 'flex', gap: 8 }}>
          {block({ flex: 1, height: 36 })}{block({ flex: 1, height: 36 })}
          {block({ flex: 1, height: 36 })}{block({ flex: 1, height: 36 })}
        </div>
      </div>
    </div>
  )
}

function SearchOverlay({ open, onClose, query, setQuery }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: '#F8F9FB', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100vw', maxWidth: '100vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#001660', cursor: 'pointer', padding: 6, marginLeft: -6, flexShrink: 0 }}>
          <Icon d={I.back} w={20} h={20} stroke={2.2} />
        </button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,22,96,0.05)', borderRadius: 12, padding: '8px 12px' }}>
          <span style={{ color: 'rgba(0,22,96,0.4)', flexShrink: 0 }}><Icon d={I.search} w={16} h={16} /></span>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search campaigns…"
            style={{ flex: 1, minWidth: 0, width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#001660' }} />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 'none', color: 'rgba(0,22,96,0.5)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <Icon d={I.close} w={14} h={14} stroke={2.2} />
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 16, fontSize: 13, color: 'rgba(0,22,96,0.55)', textAlign: 'center', boxSizing: 'border-box', width: '100%' }}>
        {query ? `Showing matches for "${query}" below.` : 'Type to filter the campaigns list.'}
      </div>
    </div>
  )
}

function PickerSheet({ open, onClose, title, items, value, onSelect }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 75 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.32)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '12px 0',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 30px rgba(0,22,96,0.18)',
        maxHeight: '70vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,22,96,0.12)', margin: '4px auto 14px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#001660', padding: '0 18px 10px' }}>{title}</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 4px' }}>
          {items.map(it => {
            const selected = it.value === value
            return (
              <button key={String(it.value)} onClick={() => { onSelect(it.value); onClose() }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 12px', borderRadius: 12,
                background: selected ? 'rgba(37,75,206,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ flex: 1, fontSize: 14, color: '#001660', fontWeight: selected ? 700 : 500 }}>{it.label}</span>
                {selected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Fab({ onClick }) {
  return (
    <button onClick={onClick} aria-label="New campaign" style={{
      position: 'fixed', right: 18, bottom: 'calc(24px + env(safe-area-inset-bottom))',
      width: 56, height: 56, borderRadius: 999,
      background: 'linear-gradient(135deg, #001660 0%, #254BCE 100%)',
      color: '#fff', border: 'none', cursor: 'pointer',
      boxShadow: '0 10px 24px rgba(0,22,96,0.35), 0 2px 6px rgba(0,22,96,0.20)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 40,
    }}>
      <Icon d={I.plus} w={22} h={22} stroke={2.4} />
    </button>
  )
}

export default function CampaignsMobile({
  campaigns = [],
  loading = false,
  getCover,
  searchQuery, setSearchQuery,
  statusFilter, setStatusFilter,
  sortBy, setSortBy,
  filteredCampaigns,
  onNewCampaign,
  onOpenCampaign,
  onEditCampaign,
  onBrowseMap,
  onOpenCrm,
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const list = filteredCampaigns || campaigns
  const total = list.length

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      {/* Sticky top header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 25,
        background: 'rgba(248,249,251,0.94)', backdropFilter: 'blur(14px)',
        padding: '14px 16px 8px calc(16px + env(safe-area-inset-left))',
        borderBottom: '1px solid rgba(0,22,96,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, fontSize: 26, fontWeight: 700, color: '#001660', letterSpacing: '-0.02em' }}>Campaigns</div>
          <IconBtn icon={I.search} label="Search" onClick={() => setSearchOpen(true)} />
          <IconBtn icon={I.filter} label="Filters" onClick={() => setFilterOpen(true)} />
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(0,22,96,0.55)', marginTop: 4 }}>
          {loading ? 'Loading…' : `${total} campaign${total === 1 ? '' : 's'}`}
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingInline: 16, paddingTop: 12, paddingBottom: 8, scrollPaddingInline: 16, WebkitOverflowScrolling: 'touch' }}>
        {STATUS_FILTERS.map(s => (
          <Pill key={s} label={s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
        ))}
      </div>

      {/* Action row: Map / Sort / Filter */}
      <div style={{ display: 'flex', gap: 8, paddingInline: 16, paddingBottom: 14 }}>
        <button onClick={onBrowseMap} style={{
          flex: 1, padding: '11px', borderRadius: 12,
          background: '#fff', border: '1px solid rgba(0,22,96,0.10)',
          color: '#001660', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Icon d={I.map} w={14} h={14} stroke={2} /> Browse Map
        </button>
        <button onClick={() => setSortOpen(true)} aria-label="Sort" style={{
          width: 44, padding: 0, borderRadius: 12,
          background: '#fff', border: '1px solid rgba(0,22,96,0.10)',
          color: 'rgba(0,22,96,0.7)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon d={I.sort} w={15} h={15} stroke={2} />
        </button>
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 16px 28px' }}>
        {loading ? (
          <>{[0,1,2].map(i => <CardSkeleton key={i} />)}</>
        ) : list.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'rgba(0,22,96,0.55)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#001660', marginBottom: 6 }}>No campaigns found</div>
            <div style={{ fontSize: 13 }}>Try a different filter or start a new campaign.</div>
          </div>
        ) : (
          list.map(c => (
            <CampaignCard
              key={c.id}
              c={c}
              getCover={getCover}
              onOpen={() => onOpenCampaign?.(c)}
              onEdit={() => onEditCampaign?.(c)}
              onCrm={() => onOpenCrm?.(c)}
              onMore={() => onOpenCampaign?.(c)}
            />
          ))
        )}
      </div>

      <Fab onClick={onNewCampaign} />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} query={searchQuery} setQuery={setSearchQuery} />
      <PickerSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort campaigns" value={sortBy} onSelect={setSortBy} items={SORTS} />
      <PickerSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Status" value={statusFilter} onSelect={setStatusFilter} items={STATUS_FILTERS.map(s => ({ value: s, label: s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1) }))} />
    </div>
  )
}
