import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeLeads } from '../lib/firebase'

/* ── Status palette — mirrors desktop STATUSES, abbreviated for the mobile UI. */
const STATUSES = [
  { key: 'qualified', label: 'Qualified',  color: '#60A5FA' },
  { key: 'contacted', label: 'Contacted',  color: '#38BDF8' },
  { key: 'engaged',   label: 'Engaged',    color: '#FBBF24' },
  { key: 'hot',       label: 'Hot',        color: '#FB923C' },
  { key: 'applying',  label: 'Applying',   color: '#C084FC' },
  { key: 'approved',  label: 'Approved',   color: '#34D399' },
  { key: 'funded',    label: 'Funded',     color: '#A3E635' },
]

const STATUS_META = Object.fromEntries(STATUSES.map(s => [s.key, s]))

/* Small demo seed so the mobile screen renders even before Firestore returns.
   Mirrors the shape of LEADS_BASE in Pipeline.jsx but trimmed for mobile. */
const SEED = [
  { id: 1, status: 'qualified', name: 'Sarah Johnson',  location: 'Austin, TX',      amount: '$85,000',  product: 'HELOC',  monthly: '$520/mo',  apr: '8.25%', fico: 724, email: 'sarah.johnson@email.com', phone: '(512) 555-0182', lastActivity: 'Created today' },
  { id: 2, status: 'contacted', name: 'Michael Chen',   location: 'San Diego, CA',   amount: '$120,000', product: 'HELOAN', monthly: '$690/mo',  apr: '7.90%', fico: 748, email: 'mchen@gmail.com',        phone: '(619) 555-0247', lastActivity: 'Email sent · 2d ago' },
  { id: 3, status: 'engaged',   name: 'Diana Patel',    location: 'Miami, FL',       amount: '$72,000',  product: 'HELOC',  monthly: '$440/mo',  apr: '8.10%', fico: 712, email: 'diana.p@yahoo.com',      phone: '(305) 555-0119', lastActivity: 'Viewed offer · 4h ago' },
  { id: 4, status: 'hot',       name: 'Marcus Reed',    location: 'Phoenix, AZ',     amount: '$98,000',  product: 'HELOC',  monthly: '$585/mo',  apr: '8.35%', fico: 731, email: 'mreed@outlook.com',      phone: '(602) 555-0263', lastActivity: 'Clicked Apply · 1h ago' },
  { id: 5, status: 'applying',  name: 'Olivia Stein',   location: 'Denver, CO',      amount: '$140,000', product: 'HELOAN', monthly: '$795/mo',  apr: '7.75%', fico: 762, email: 'olivia.stein@me.com',    phone: '(303) 555-0395', lastActivity: 'Started app · 1d ago' },
  { id: 6, status: 'approved',  name: 'Trevor Ng',      location: 'Seattle, WA',     amount: '$110,000', product: 'HELOC',  monthly: '$640/mo',  apr: '8.00%', fico: 758, email: 'trevor.ng@gmail.com',    phone: '(206) 555-0481', lastActivity: 'Approved · 6h ago' },
  { id: 7, status: 'funded',    name: 'Hannah Ortiz',   location: 'Tampa, FL',       amount: '$92,000',  product: 'HELOC',  monthly: '$540/mo',  apr: '8.20%', fico: 740, email: 'hannah.o@gmail.com',     phone: '(813) 555-0512', lastActivity: 'Funded · Mar 4' },
]

function StatusDot({ status }) {
  const m = STATUS_META[status] || STATUS_META.qualified
  return <span style={{ width: 8, height: 8, borderRadius: 999, background: m.color, display: 'inline-block', flexShrink: 0 }} />
}

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.qualified
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px 3px 8px', borderRadius: 999,
      background: `${m.color}1F`, color: m.color,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: m.color }} />
      {m.label}
    </span>
  )
}

function Icon({ d, w = 18, h = 18, stroke = 2 }) {
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  )
}

const ICONS = {
  bell:    <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  search:  <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  filter:  <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
  sort:    <><line x1="3" y1="6" x2="13" y2="6"/><line x1="3" y1="12" x2="11" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/><polyline points="17 14 21 10 17 6"/><line x1="21" y1="10" x2="14" y2="10"/></>,
  phone:   <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>,
  mail:    <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  eye:     <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  more:    <><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="5"  cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></>,
  plus:    <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  back:    <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
  close:   <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  home:    <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  pipe:    <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
  task:    <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  msg:     <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  dots:    <><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5"  cy="12" r="1" fill="currentColor"/></>,
}

/* ── Analytics page — full-screen view of all stats. */
function AnalyticsPage({ open, onClose, leads }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 65, background: '#F8F9FB', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100vw', maxWidth: '100vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(0,22,96,0.06)', background: '#fff' }}>
        <button onClick={onClose} aria-label="Back" style={{ width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,22,96,0.06)', color: '#001660', border: 'none', cursor: 'pointer' }}>
          <Icon d={ICONS.back} w={16} h={16} stroke={2.2} />
        </button>
        <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em' }}>Pipeline Analytics</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 16px 32px', boxSizing: 'border-box', width: '100%' }}>
        <AnalyticsCardStack leads={leads} />
      </div>
    </div>
  )
}

/* ── Analytics card stack — same data as desktop, stacked vertically. */
function AnalyticsCardStack({ leads }) {
  const cnt = (fn) => leads.filter(fn).length
  const qualified = cnt(l => l.status === 'qualified')
  const contacted = cnt(l => ['contacted','engaged','hot','applying','approved','funded'].includes(l.status))
  const engaged   = cnt(l => ['engaged','hot','applying','approved','funded'].includes(l.status))
  const applied   = cnt(l => ['applying','approved','funded'].includes(l.status))
  const hot       = cnt(l => l.status === 'hot')
  const approved  = cnt(l => l.status === 'approved')
  const funded    = cnt(l => l.status === 'funded')
  const emailSent = cnt(l => !!l.emailSent)
  const postcardSent = cnt(l => !!l.postcardSent)
  const qualNoContact = cnt(l => l.status === 'qualified' && !l.emailSent && !l.postcardSent)
  const contactToEng  = contacted ? Math.round((engaged / contacted) * 100) : 0
  const engToApply    = engaged ? Math.round((applied / engaged) * 100) : 0
  // Funded $ — sum the `amount` string ($85,000) by parsing.
  const fundedSum = leads
    .filter(l => l.status === 'funded')
    .reduce((acc, l) => acc + (Number(String(l.amount || '').replace(/[^\d.]/g, '')) || 0), 0)
  const fundedShort = fundedSum >= 1000 ? `$${Math.round(fundedSum / 1000)}k` : `$${fundedSum.toLocaleString()}`
  const inClosing = approved
  const pipelineVal = leads.reduce((acc, l) => acc + (Number(String(l.amount || '').replace(/[^\d.]/g, '')) || 0), 0)
  const pipelineShort = pipelineVal >= 1000 ? `$${Math.round(pipelineVal / 1000)}k` : `$${pipelineVal.toLocaleString()}`

  const cards = [
    {
      key: 'outreach', accent: '#016163',
      head: 'Outreach Needed',
      big: qualNoContact, bigUnit: '',
      sub: 'leads not yet contacted',
      foot: `${emailSent} emailed · ${postcardSent} postcard sent`,
    },
    {
      key: 'conversion', accent: '#254BCE',
      head: 'Conversion Rates',
      rows: [
        { label: 'Contact → Engaged', value: `${contactToEng}%` },
        { label: 'Engaged → Applied',  value: `${engToApply}%` },
      ],
    },
    {
      key: 'funnel', accent: '#254BCE',
      head: 'Funnel Overview',
      bars: [
        { label: 'Qualified', value: qualified, of: Math.max(qualified, contacted, 1) },
        { label: 'Contacted', value: contacted, of: Math.max(qualified, contacted, 1) },
        { label: 'Engaged',   value: engaged,   of: Math.max(qualified, contacted, 1) },
        { label: 'Hot',       value: hot,       of: Math.max(qualified, contacted, 1) },
      ],
    },
    {
      key: 'funded', accent: '#016163',
      head: 'Funded Value', emerald: true,
      big: fundedShort, bigUnit: '',
      sub: `${funded} funded · ${inClosing} in closing`,
      foot: `Pipeline value: ${pipelineShort}`,
    },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {cards.map(c => (
        <div key={c.key} style={{
          width: '100%', minHeight: 168, borderRadius: 18,
          background: c.emerald ? 'rgba(1,97,99,0.06)' : '#fff',
          border: `1px solid ${c.emerald ? 'rgba(1,97,99,0.18)' : 'rgba(0,22,96,0.07)'}`,
          padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10,
          boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: c.emerald ? c.accent : 'rgba(0,22,96,0.55)' }}>
            {c.head}
          </div>
          {c.big != null && (
            <>
              <div style={{ fontSize: 32, fontWeight: 700, color: c.emerald ? c.accent : '#001660', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {c.big}{c.bigUnit}
              </div>
              <div style={{ fontSize: 11, color: c.emerald ? 'rgba(1,97,99,0.65)' : 'rgba(0,22,96,0.55)' }}>{c.sub}</div>
              <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${c.emerald ? 'rgba(1,97,99,0.10)' : 'rgba(0,22,96,0.06)'}`, fontSize: 10.5, color: c.emerald ? 'rgba(1,97,99,0.55)' : 'rgba(0,22,96,0.40)' }}>{c.foot}</div>
            </>
          )}
          {c.rows && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              {c.rows.map((r, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'rgba(0,22,96,0.65)' }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#016163' }}>{r.value}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(1,97,99,0.10)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: r.value, background: '#016163', borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {c.bars && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
              {c.bars.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'rgba(0,22,96,0.55)', width: 64 }}>{b.label}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(37,75,206,0.10)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (b.value / b.of) * 100)}%`, background: c.accent, borderRadius: 999 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#001660', minWidth: 24, textAlign: 'right' }}>{b.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── KPI strip — cards with sparkline + change indicator. */
const SPARK_PTS = {
  qualified: [[0,32],[14,26],[28,29],[40,22],[52,25],[63,18],[74,21],[84,14],[92,16],[100,10]],
  contacted: [[0,20],[10,24],[22,19],[35,28],[46,22],[56,17],[66,21],[76,14],[86,18],[100,11]],
  engaged:   [[0,8],[12,12],[22,10],[34,18],[46,22],[56,24],[66,28],[76,30],[88,32],[100,35]],
  hot:       [[0,34],[10,28],[20,24],[30,30],[42,20],[52,14],[62,22],[74,14],[86,10],[100,16]],
  applying:  [[0,10],[12,14],[24,12],[36,20],[48,24],[58,28],[68,26],[78,32],[88,34],[100,36]],
  approved:  [[0,32],[12,30],[24,28],[34,32],[46,28],[56,20],[66,14],[76,18],[88,10],[100,5]],
  funded:    [[0,34],[12,32],[22,28],[32,30],[44,26],[54,22],[64,18],[74,20],[86,14],[100,9]],
}
const CHANGE_PCT = { qualified: 20, contacted: 0, engaged: 50, hot: 100, applying: 0, approved: 25, funded: 18 }
const DECLINING = new Set(['engaged', 'applying'])

function smoothPath(pts) {
  if (!pts || pts.length < 2) return ''
  let d = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(i + 2, pts.length - 1)]
    const t = 0.35
    const cp1x = p1[0] + (p2[0] - p0[0]) * t
    const cp1y = p1[1] + (p2[1] - p0[1]) * t
    const cp2x = p2[0] - (p3[0] - p1[0]) * t
    const cp2y = p2[1] - (p3[1] - p1[1]) * t
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0]},${p2[1]}`
  }
  return d
}

function KpiSparkCard({ s, active, onToggle }) {
  const pts = SPARK_PTS[s.key] || SPARK_PTS.qualified
  const pct = CHANGE_PCT[s.key] ?? 0
  const declining = DECLINING.has(s.key)
  const trendColor = pct === 0 ? 'rgba(0,22,96,0.4)' : (declining ? '#DC2626' : '#10B981')
  const path = smoothPath(pts)
  const areaPath = `${path} L 100,40 L 0,40 Z`
  const gid = `g-${s.key}`
  return (
    <button onClick={() => onToggle?.(s.key)} style={{
      flex: '0 0 auto', scrollSnapAlign: 'start',
      width: 156, padding: '12px 14px 10px', borderRadius: 14,
      background: active ? `${s.color}10` : '#fff',
      border: `1px solid ${active ? `${s.color}55` : 'rgba(0,22,96,0.07)'}`,
      boxShadow: '0 1px 2px rgba(0,22,96,0.04)',
      textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: s.color }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,22,96,0.6)' }}>{s.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: '#001660', letterSpacing: '-0.02em', lineHeight: 1.05 }}>{s.value}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: trendColor, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          {pct === 0 ? '—' : (declining ? '↓' : '↑')} {pct}%
        </span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: 30, marginTop: 2 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

function KpiStrip({ stats, activeStages, onToggle }) {
  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingInline: 16, paddingBottom: 4, scrollSnapType: 'x mandatory', scrollPaddingInline: 16, WebkitOverflowScrolling: 'touch' }}>
      {stats.map(s => (
        <KpiSparkCard key={s.key} s={s} active={activeStages.has(s.key)} onToggle={onToggle} />
      ))}
    </div>
  )
}

/* ── Filter toolbar — desktop-equivalent on mobile.
   Row: 🔍 search · ⇅ sort · Stage · Rep · Source · Product · Clear all */
const REPS = [
  { value: 'sarah',  label: 'Sarah Chen' },
  { value: 'marcus', label: 'Marcus Webb' },
  { value: 'priya',  label: 'Priya Nair' },
  { value: 'tom',    label: 'Tom Gallagher' },
]
const SOURCES = [
  { value: 'geo',          label: 'Geo Campaign' },
  { value: 'Bulk Upload',  label: 'Bulk Upload' },
  { value: 'Manual Entry', label: 'Manual Entry' },
]
const PRODUCTS = [
  { value: 'HELOC',  label: 'HELOC' },
  { value: 'HELOAN', label: 'HELOAN' },
]
const SORTS = [
  { value: 'newest',     label: 'Newest first' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'amount-desc',label: 'Loan amount — high to low' },
  { value: 'amount-asc', label: 'Loan amount — low to high' },
  { value: 'name',       label: 'Name (A → Z)' },
]

function FilterToolbar({
  filterStage, filterRep, filterSource, filterProduct,
  onSearch, onOpenSort, onOpenFilters, onClearOne,
}) {
  const active = []
  if (filterStage)   active.push({ key: 'stage',   label: STATUS_META[filterStage]?.label || filterStage, color: STATUS_META[filterStage]?.color })
  if (filterRep)     active.push({ key: 'rep',     label: REPS.find(r => r.value === filterRep)?.label   || filterRep })
  if (filterSource)  active.push({ key: 'source',  label: SOURCES.find(s => s.value === filterSource)?.label || filterSource })
  if (filterProduct) active.push({ key: 'product', label: PRODUCTS.find(p => p.value === filterProduct)?.label || filterProduct })
  const hasAny = active.length > 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingInline: 16, paddingTop: 4, paddingBottom: 14, scrollPaddingInline: 16, WebkitOverflowScrolling: 'touch' }}>
      <IconChip onClick={onSearch}       icon={ICONS.search} label="Search" />
      <IconChip onClick={onOpenSort}     icon={ICONS.sort}   label="Sort" />
      <IconChip onClick={onOpenFilters}  icon={ICONS.filter} label="Filters" badge={hasAny ? active.length : 0} />
      {active.map(a => (
        <button key={a.key} onClick={onOpenFilters} style={{
          flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 6px 6px 12px', borderRadius: 999,
          background: 'rgba(37,75,206,0.10)',
          border: '1px solid rgba(37,75,206,0.30)',
          color: '#254BCE',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          {a.color && <span style={{ width: 7, height: 7, borderRadius: 999, background: a.color }} />}
          {a.label}
          <span
            role="button"
            aria-label={`Remove ${a.label} filter`}
            onClick={e => { e.stopPropagation(); onClearOne(a.key) }}
            style={{
              width: 20, height: 20, borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(37,75,206,0.18)', color: '#254BCE', marginLeft: 2,
            }}>
            <Icon d={ICONS.close} w={10} h={10} stroke={2.4} />
          </span>
        </button>
      ))}
    </div>
  )
}

function IconChip({ icon, label, onClick, badge = 0 }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      position: 'relative',
      flex: '0 0 auto', width: 36, height: 36, borderRadius: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fff', border: '1px solid rgba(0,22,96,0.10)',
      color: 'rgba(0,22,96,0.7)', cursor: 'pointer', padding: 0,
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

/* ── Full-screen filter page. */
function FiltersPage({ open, onClose, draft, setDraft, onApply, onClearAll }) {
  if (!open) return null
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const Section = ({ title, items, value, onChange, withDots }) => (
    <div style={{ padding: '4px 16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</span>
        {value && (
          <button onClick={() => onChange('')} style={{ background: 'transparent', border: 'none', color: '#254BCE', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map(it => {
          const selected = value === it.value
          return (
            <button key={String(it.value)} onClick={() => onChange(selected ? '' : it.value)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 999,
              background: selected ? 'rgba(37,75,206,0.10)' : '#fff',
              border: `1px solid ${selected ? 'rgba(37,75,206,0.45)' : 'rgba(0,22,96,0.10)'}`,
              color: selected ? '#254BCE' : 'rgba(0,22,96,0.75)',
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            }}>
              {withDots && it.color && <span style={{ width: 8, height: 8, borderRadius: 999, background: it.color }} />}
              {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#F8F9FB', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100vw', maxWidth: '100vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(0,22,96,0.06)', background: '#fff' }}>
        <button onClick={onClose} aria-label="Close filters" style={{ width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,22,96,0.06)', color: '#001660', border: 'none', cursor: 'pointer' }}>
          <Icon d={ICONS.close} w={16} h={16} stroke={2.2} />
        </button>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em' }}>Filters</span>
        <button onClick={onClearAll} style={{ background: 'transparent', border: 'none', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Clear all</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 0 120px', boxSizing: 'border-box', width: '100%' }}>
        <Section title="Stage"   items={STATUSES.map(s => ({ value: s.key, label: s.label, color: s.color }))} value={draft.stage}   onChange={v => set('stage', v)}   withDots />
        <Section title="Sales rep" items={REPS}     value={draft.rep}     onChange={v => set('rep', v)} />
        <Section title="Source"  items={SOURCES}  value={draft.source}  onChange={v => set('source', v)} />
        <Section title="Product" items={PRODUCTS} value={draft.product} onChange={v => set('product', v)} />
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '12px 16px calc(14px + env(safe-area-inset-bottom))',
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(0,22,96,0.08)', display: 'flex', gap: 10,
      }}>
        <button onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, background: '#fff', color: '#001660', border: '1px solid rgba(0,22,96,0.10)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={() => { onApply(); onClose() }} style={{ flex: 2, padding: '13px', borderRadius: 12, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Apply filters
        </button>
      </div>
    </div>
  )
}

function ValueChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '8px 12px', borderRadius: 999,
      background: active ? 'rgba(37,75,206,0.10)' : '#fff',
      border: `1px solid ${active ? 'rgba(37,75,206,0.45)' : 'rgba(0,22,96,0.10)'}`,
      color: active ? '#254BCE' : 'rgba(0,22,96,0.75)',
      fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {label}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.55 }}>
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  )
}

/* ── Generic picker bottom sheet. */
function PickerSheet({ open, onClose, title, items, value, onSelect, allowClear = true }) {
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 10px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#001660' }}>{title}</div>
          {allowClear && value && (
            <button onClick={() => { onSelect(''); onClose() }} style={{ background: 'transparent', border: 'none', color: '#254BCE', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>
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
                {it.color && <span style={{ width: 8, height: 8, borderRadius: 999, background: it.color, flexShrink: 0 }} />}
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
function Pill({ label, color, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: '0 0 auto', padding: '7px 14px', borderRadius: 999,
      background: active ? (color ? `${color}1A` : 'rgba(0,22,96,0.08)') : '#fff',
      border: `1px solid ${active ? (color ? `${color}55` : 'rgba(0,22,96,0.15)') : 'rgba(0,22,96,0.08)'}`,
      color: active ? (color || '#001660') : 'rgba(0,22,96,0.65)',
      fontSize: 12, fontWeight: 600, letterSpacing: '-0.005em', cursor: 'pointer',
    }}>
      {label}
    </button>
  )
}

/* ── Lead card. */
function LeadCard({ lead, onOpen }) {
  return (
    <div style={{
      width: '100%', maxWidth: '100%', boxSizing: 'border-box', textAlign: 'left',
      padding: '14px 16px 10px', borderRadius: 16,
      background: '#fff',
      border: '1px solid rgba(0,22,96,0.06)',
      boxShadow: '0 1px 3px rgba(0,22,96,0.04)',
      cursor: 'pointer', overflow: 'hidden',
    }}
    onClick={() => onOpen(lead)}>
      {/* Header: name + amount */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <StatusDot status={lead.status} />
          <span style={{ fontSize: 16, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{lead.name}</span>
        </div>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em', flexShrink: 0 }}>{lead.amount || '—'}</span>
      </div>
      {/* Location + product */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
        <span style={{ fontSize: 12.5, color: 'rgba(0,22,96,0.55)' }}>{lead.location || '—'}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#254BCE', background: 'rgba(37,75,206,0.08)', padding: '3px 9px', borderRadius: 999, letterSpacing: '0.04em', flexShrink: 0 }}>
          {lead.product || 'LOAN'}
        </span>
      </div>
      {/* Payment + status pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
        <span style={{ fontSize: 13, color: 'rgba(0,22,96,0.65)' }}>
          {lead.monthly && <b style={{ color: '#001660', fontWeight: 700 }}>{lead.monthly}</b>}
          {lead.apr && <span style={{ color: 'rgba(0,22,96,0.45)' }}> · {lead.apr} APR</span>}
        </span>
        <StatusPill status={lead.status} />
      </div>
      {/* Bottom: activity + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10, paddingTop: 8 }}>
        <span style={{ fontSize: 12, color: 'rgba(0,22,96,0.5)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.lastActivity || '—'}
        </span>
        <span style={{ width: 1, alignSelf: 'stretch', background: 'rgba(0,22,96,0.08)' }} />
        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
          <ActionPill icon={ICONS.phone} color="#10B981" onClick={() => lead.phone && (window.location.href = `tel:${lead.phone.replace(/\D/g, '')}`)} />
          <ActionPill icon={ICONS.mail} onClick={() => lead.email && (window.location.href = `mailto:${lead.email}`)} />
          <ActionPill icon={ICONS.eye} onClick={() => onOpen(lead)} />
          <ActionPill icon={ICONS.more} onClick={() => onOpen(lead)} />
        </div>
      </div>
    </div>
  )
}

function ActionPill({ icon, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fff', border: '1px solid rgba(0,22,96,0.10)',
      color: color || 'rgba(0,22,96,0.55)', cursor: 'pointer', padding: 0,
    }}>
      <Icon d={icon} w={14} h={14} stroke={2} />
    </button>
  )
}

/* ── Detail page (full-screen overlay). */
function LeadDetailMobile({ lead, onClose }) {
  if (!lead) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#F8F9FB', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100vw', maxWidth: '100vw' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid rgba(0,22,96,0.06)', background: '#fff' }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,22,96,0.06)', color: '#001660', border: 'none', cursor: 'pointer' }}>
          <Icon d={ICONS.back} w={16} h={16} stroke={2.2} />
        </button>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#001660', textAlign: 'center', letterSpacing: '-0.01em' }}>Lead Details</span>
        <button style={{ width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,22,96,0.06)', color: '#001660', border: 'none', cursor: 'pointer' }}>
          <Icon d={ICONS.more} w={16} h={16} stroke={2.2} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: '20px 16px 110px', boxSizing: 'border-box', width: '100%' }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0 18px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: 'linear-gradient(135deg, #001660 0%, #254BCE 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {(lead.name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em' }}>{lead.name}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(0,22,96,0.55)' }}>{lead.location}</div>
          <div style={{ marginTop: 4 }}><StatusPill status={lead.status} /></div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { icon: ICONS.phone, label: 'Call',    href: lead.phone ? `tel:${lead.phone.replace(/\D/g, '')}` : null },
            { icon: ICONS.mail,  label: 'Email',   href: lead.email ? `mailto:${lead.email}` : null },
            { icon: ICONS.eye,   label: 'Offer' },
            { icon: ICONS.more,  label: 'More' },
          ].map((a, i) => (
            <a key={i} href={a.href || '#'} onClick={a.href ? undefined : (e) => e.preventDefault()} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '12px 0', borderRadius: 14,
              background: '#fff', border: '1px solid rgba(0,22,96,0.06)', textDecoration: 'none',
              color: '#254BCE',
            }}>
              <Icon d={a.icon} w={18} h={18} stroke={2} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: '#001660' }}>{a.label}</span>
            </a>
          ))}
        </div>

        {/* Loan summary card */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.06)', borderRadius: 18, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Loan Offer
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#001660', letterSpacing: '-0.03em', lineHeight: 1 }}>{lead.amount || '—'}</div>
              <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.5)', marginTop: 4 }}>{lead.product || 'LOAN'} · {lead.apr || '—'} APR</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#016163' }}>{lead.monthly || '—'}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(0,22,96,0.5)' }}>est. monthly</div>
            </div>
          </div>
          <div style={{ height: 1, background: 'rgba(0,22,96,0.06)', margin: '4px 0 12px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <KV label="Offer status" value={lead.offerStatus || 'Active'} />
            <KV label="Offer date" value={lead.offerDate || 'Today'} />
          </div>
        </div>

        {/* Qualification stats — scrollable chips */}
        <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '6px 4px 8px' }}>
          Qualification
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 4px', WebkitOverflowScrolling: 'touch' }}>
          {[
            { l: 'Home Value', v: lead.propValue || '—' },
            { l: 'Equity',     v: lead.equity    || '—' },
            { l: 'CLTV',       v: lead.cltv      || '—' },
            { l: 'FICO',       v: lead.fico      || '—' },
            { l: 'DTI',        v: lead.dti       || '—' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '0 0 auto', minWidth: 110, padding: '12px 14px', borderRadius: 14, background: '#fff', border: '1px solid rgba(0,22,96,0.06)' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em' }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Activity */}
        {lead.lastActivity && (
          <div style={{ background: '#fff', border: '1px solid rgba(0,22,96,0.06)', borderRadius: 18, padding: 16, marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Last Activity
            </div>
            <div style={{ fontSize: 13, color: '#001660' }}>{lead.lastActivity}</div>
          </div>
        )}
      </div>

      {/* Sticky bottom actions */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(0,22,96,0.08)',
        display: 'flex', gap: 8,
      }}>
        <button style={{ flex: 1, padding: '12px', borderRadius: 12, background: '#fff', color: '#001660', border: '1px solid rgba(0,22,96,0.10)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Add note
        </button>
        <button style={{ flex: 2, padding: '12px', borderRadius: 12, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          Send offer
        </button>
      </div>
    </div>
  )
}
function KV({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#001660' }}>{value}</div>
    </div>
  )
}

/* ── Filter sheet (multi-select). */
function FilterSheet({ open, onClose, stages, toggleStage, clearStages }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.32)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '12px 16px 24px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 30px rgba(0,22,96,0.18)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,22,96,0.12)', margin: '4px auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#001660' }}>Filter pipeline</div>
          {stages.size > 0 && (
            <button onClick={clearStages} style={{ background: 'transparent', border: 'none', color: '#254BCE', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Clear all
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Stage</div>
          <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.45)' }}>{stages.size > 0 ? `${stages.size} selected` : 'Select any'}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {STATUSES.map(s => (
            <Pill key={s.key} label={s.label} color={s.color} active={stages.has(s.key)} onClick={() => toggleStage(s.key)} />
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: '13px', borderRadius: 12, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {stages.size > 0 ? `Show results (${stages.size} stage${stages.size === 1 ? '' : 's'})` : 'Show all leads'}
        </button>
      </div>
    </div>
  )
}

/* ── Search overlay. */
function SearchOverlay({ open, onClose, query, setQuery, leads, onPick }) {
  if (!open) return null
  const trimmed = query.trim().toLowerCase()
  const results = trimmed ? leads.filter(l =>
    (l.name || '').toLowerCase().includes(trimmed)
    || (l.location || '').toLowerCase().includes(trimmed)
    || (l.email || '').toLowerCase().includes(trimmed)
  ) : []
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: '#F8F9FB', display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100vw', maxWidth: '100vw' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', borderBottom: '1px solid rgba(0,22,96,0.06)', boxSizing: 'border-box', width: '100%' }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#001660', cursor: 'pointer', padding: 6, marginLeft: -6, flexShrink: 0 }}>
          <Icon d={ICONS.back} w={20} h={20} stroke={2.2} />
        </button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,22,96,0.05)', borderRadius: 12, padding: '8px 12px' }}>
          <span style={{ color: 'rgba(0,22,96,0.4)', flexShrink: 0 }}><Icon d={ICONS.search} w={16} h={16} /></span>
          <input
            autoFocus
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search leads, locations…"
            style={{ flex: 1, minWidth: 0, width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#001660' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 'none', color: 'rgba(0,22,96,0.5)', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
              <Icon d={ICONS.close} w={14} h={14} stroke={2.2} />
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, boxSizing: 'border-box', width: '100%' }}>
        {!trimmed && (
          <div style={{ fontSize: 12.5, color: 'rgba(0,22,96,0.55)', textAlign: 'center', marginTop: 30 }}>
            Type to search by name, location, or email
          </div>
        )}
        {trimmed && results.length === 0 && (
          <div style={{ fontSize: 13, color: 'rgba(0,22,96,0.55)', textAlign: 'center', marginTop: 30 }}>
            No leads match "{trimmed}"
          </div>
        )}
        {results.map(l => (
          <LeadCard key={l.id} lead={l} onOpen={(ld) => { onPick(ld); onClose() }} />
        ))}
      </div>
    </div>
  )
}

/* ── FAB — opens Add Leads action sheet (single / bulk / geo). */
function Fab({ onClick, open }) {
  return (
    <button onClick={onClick} aria-label="Add leads" style={{
      position: 'fixed', right: 18, bottom: 'calc(82px + env(safe-area-inset-bottom))',
      width: 56, height: 56, borderRadius: 999,
      background: 'linear-gradient(135deg, #001660 0%, #254BCE 100%)',
      color: '#fff', border: 'none', cursor: 'pointer',
      boxShadow: '0 10px 24px rgba(0,22,96,0.35), 0 2px 6px rgba(0,22,96,0.20)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 40,
      transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
      transition: 'transform 200ms cubic-bezier(.4,0,.2,1)',
    }}>
      <Icon d={ICONS.plus} w={22} h={22} stroke={2.4} />
    </button>
  )
}

function AddLeadsSheet({ open, onClose, onSingle, onBulk, onGeo }) {
  if (!open) return null
  const items = [
    {
      key: 'single', label: 'Add Single Lead', desc: 'Enter one lead by hand',
      icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></>,
      action: onSingle,
    },
    {
      key: 'bulk', label: 'Bulk Upload Leads', desc: 'Import from a spreadsheet',
      icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>,
      action: onBulk,
    },
    {
      key: 'geo', label: 'Geo-Search Leads', desc: 'Find leads by area',
      icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
      action: onGeo,
    },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.32)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '12px 14px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 30px rgba(0,22,96,0.18)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,22,96,0.12)', margin: '4px auto 12px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#001660', marginBottom: 6, paddingInline: 4 }}>Add Leads</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map(it => (
            <button key={it.key} onClick={() => { onClose(); it.action?.() }} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 8px', borderRadius: 12,
              background: 'transparent', border: 'none', cursor: 'pointer',
              textAlign: 'left',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(0,22,96,0.04)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 10, background: 'rgba(37,75,206,0.08)', color: '#254BCE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon d={it.icon} w={18} h={18} stroke={2} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#001660' }}>{it.label}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(0,22,96,0.5)', marginTop: 1 }}>{it.desc}</div>
              </span>
              <Icon d={<polyline points="9 18 15 12 9 6"/>} w={14} h={14} stroke={2} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Bottom nav — Pipeline / Geo Campaign / Search / Account.
   The Account tab combines the bell + avatar (notification dot on the avatar). */
function BottomNav({ active, onPick, hasNotification }) {
  const tabs = [
    { key: 'pipeline', label: 'Pipeline',     iconType: 'svg', icon: ICONS.pipe },
    { key: 'geo',      label: 'Geo Campaign', iconType: 'svg', icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></> },
    { key: 'search',   label: 'Search',       iconType: 'svg', icon: ICONS.search },
    { key: 'account',  label: 'Account',      iconType: 'avatar' },
  ]
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      paddingBottom: 'env(safe-area-inset-bottom)',
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)',
      borderTop: '1px solid rgba(0,22,96,0.06)',
      display: 'flex', justifyContent: 'space-around',
      zIndex: 30,
    }}>
      {tabs.map(t => {
        const a = active === t.key
        return (
          <button key={t.key} onClick={() => onPick?.(t.key)} style={{
            flex: 1, padding: '10px 4px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: a ? '#001660' : 'rgba(0,22,96,0.55)',
          }}>
            {t.iconType === 'avatar' ? (
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 999,
                  background: a ? 'linear-gradient(135deg, #001660 0%, #254BCE 100%)' : 'linear-gradient(135deg, #FBBF24 0%, #FB923C 100%)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9.5, fontWeight: 700, letterSpacing: '-0.01em',
                }}>IG</span>
                {hasNotification && (
                  <span style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: 999, background: '#FB923C', boxShadow: '0 0 0 1.5px #fff' }} />
                )}
              </span>
            ) : (
              <Icon d={t.icon} w={20} h={20} stroke={a ? 2.2 : 1.8} />
            )}
            <span style={{ fontSize: 9.5, fontWeight: a ? 700 : 500, letterSpacing: '0.02em' }}>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Account sheet — notifications + sign-out. */
function AccountSheet({ open, onClose }) {
  if (!open) return null
  const notifications = [
    { title: 'New lead from Geo Campaign — Miami Westside', when: '2m ago', dot: '#FB923C' },
    { title: 'Marcus Reed clicked Apply Now',                when: '14m ago', dot: '#FB923C' },
    { title: 'Olivia Stein started her application',         when: '1h ago', dot: '#FBBF24' },
    { title: 'Hannah Ortiz funded · $92,000 HELOC',          when: 'Today',  dot: '#34D399' },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.32)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '12px 0',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 30px rgba(0,22,96,0.18)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,22,96,0.12)', margin: '4px auto 14px' }} />
        <div style={{ padding: '0 18px 12px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 999, background: 'linear-gradient(135deg, #FBBF24 0%, #FB923C 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>IG</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#001660' }}>Igor Ginzburg</div>
            <div style={{ fontSize: 11.5, color: 'rgba(0,22,96,0.5)' }}>igor@flowformstudio.com</div>
          </div>
        </div>
        <div style={{ padding: '14px 18px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Notifications</span>
          <button style={{ background: 'transparent', border: 'none', color: '#254BCE', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 4px' }}>
          {notifications.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 8px', borderRadius: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: n.dot, marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#001660', lineHeight: 1.35 }}>{n.title}</div>
                <div style={{ fontSize: 10.5, color: 'rgba(0,22,96,0.45)', marginTop: 2 }}>{n.when}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(0,22,96,0.06)', padding: '10px 12px 0', display: 'flex', gap: 8 }}>
          <button style={{ flex: 1, padding: '11px', borderRadius: 12, background: '#fff', color: '#001660', border: '1px solid rgba(0,22,96,0.10)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Settings
          </button>
          <button style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.18)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PipelineMobile() {
  const navigate = useNavigate()
  const [extraLeads, setExtraLeads] = useState([])

  useEffect(() => subscribeLeads(list => setExtraLeads(list || [])), [])

  /* Merge Firestore + seed. Firestore wins; seed fills the gaps so demos
     never look empty. */
  const allLeads = useMemo(() => {
    const byId = new Map()
    for (const l of SEED) byId.set(l.id, l)
    for (const l of extraLeads) byId.set(l.id, l)
    return Array.from(byId.values())
  }, [extraLeads])

  const [filterStage,   setFilterStage]   = useState('')
  const [filterRep,     setFilterRep]     = useState('')
  const [filterSource,  setFilterSource]  = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [sortKey,       setSortKey]       = useState('newest')
  const [picker, setPicker] = useState(null) // 'sort'
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filterDraft, setFilterDraft] = useState({ stage: '', rep: '', source: '', product: '' })
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [activeLead, setActiveLead] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const toggleStage = (key) => setFilterStage(prev => prev === key ? '' : key)
  const clearAll = () => { setFilterStage(''); setFilterRep(''); setFilterSource(''); setFilterProduct('') }
  const hasAnyFilter = !!(filterStage || filterRep || filterSource || filterProduct)
  const activeStages = useMemo(() => filterStage ? new Set([filterStage]) : new Set(), [filterStage])

  const parseAmount = (a) => Number(String(a || '').replace(/[^\d.]/g, '')) || 0

  const filtered = useMemo(() => {
    let list = allLeads.slice()
    if (filterStage)   list = list.filter(l => l.status === filterStage)
    if (filterProduct) list = list.filter(l => l.product === filterProduct)
    if (filterSource === 'geo') list = list.filter(l => String(l.source || '').startsWith('Geo Campaign'))
    else if (filterSource)      list = list.filter(l => l.source === filterSource)
    // Rep filter is a UI stub — seed leads don't carry a rep field yet.
    if (sortKey === 'name')        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    else if (sortKey === 'amount-desc') list.sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount))
    else if (sortKey === 'amount-asc')  list.sort((a, b) => parseAmount(a.amount) - parseAmount(b.amount))
    else if (sortKey === 'oldest') list.reverse()
    return list
  }, [allLeads, filterStage, filterRep, filterSource, filterProduct, sortKey])

  const stats = useMemo(() => STATUSES.map(s => ({
    key: s.key, label: s.label, color: s.color,
    value: allLeads.filter(l => l.status === s.key).length,
  })), [allLeads])

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: '14px 16px 10px calc(16px + env(safe-area-inset-left))',
        background: 'rgba(248,249,251,0.94)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(0,22,96,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1, fontSize: 26, fontWeight: 700, color: '#001660', letterSpacing: '-0.02em' }}>Pipeline</div>
        </div>
        <button onClick={() => setAnalyticsOpen(true)} style={{
          background: 'transparent', border: 'none', padding: '6px 0', marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(0,22,96,0.4)' }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span style={{ fontSize: 14, color: 'rgba(0,22,96,0.55)' }}>
            <b style={{ color: '#001660', fontWeight: 700 }}>{stats.find(s => s.key === 'hot')?.value || 0}</b> hot ·{' '}
            <b style={{ color: '#001660', fontWeight: 700 }}>{stats.find(s => s.key === 'qualified')?.value || 0}</b> awaiting contact ·{' '}
            <b style={{ color: '#001660', fontWeight: 700 }}>{stats.find(s => s.key === 'funded')?.value || 0}</b> funded
          </span>
        </button>
      </div>

      {/* KPI strip */}
      <div style={{ padding: '14px 0 0' }}>
        <KpiStrip stats={stats} activeStages={activeStages} onToggle={toggleStage} />
      </div>

      <FilterToolbar
        filterStage={filterStage}
        filterRep={filterRep}
        filterSource={filterSource}
        filterProduct={filterProduct}
        onSearch={() => setSearchOpen(true)}
        onOpenSort={() => setPicker('sort')}
        onOpenFilters={() => {
          setFilterDraft({ stage: filterStage, rep: filterRep, source: filterSource, product: filterProduct })
          setFiltersOpen(true)
        }}
        onClearOne={(k) => {
          if (k === 'stage')   setFilterStage('')
          if (k === 'rep')     setFilterRep('')
          if (k === 'source')  setFilterSource('')
          if (k === 'product') setFilterProduct('')
        }}
      />

      {/* Lead cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '6px 16px 28px' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '36px 0', textAlign: 'center', color: 'rgba(0,22,96,0.55)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No leads in this view</div>
            <div style={{ fontSize: 12 }}>Try a different stage or clear filters.</div>
          </div>
        )}
        {filtered.map(l => <LeadCard key={l.id} lead={l} onOpen={setActiveLead} />)}
      </div>

      <Fab open={addOpen} onClick={() => setAddOpen(o => !o)} />

      <AddLeadsSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSingle={() => alert('Add single lead — coming soon in mobile')}
        onBulk={() => alert('Bulk upload — coming soon in mobile')}
        onGeo={() => navigate('/geo-campaigns?view=map&from=pipeline')}
      />

      <PickerSheet
        open={picker === 'sort'} onClose={() => setPicker(null)}
        title="Sort by" value={sortKey} onSelect={setSortKey}
        items={SORTS} allowClear={false}
      />
      <AnalyticsPage open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} leads={allLeads} />
      <FiltersPage
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        draft={filterDraft}
        setDraft={setFilterDraft}
        onApply={() => {
          setFilterStage(filterDraft.stage)
          setFilterRep(filterDraft.rep)
          setFilterSource(filterDraft.source)
          setFilterProduct(filterDraft.product)
        }}
        onClearAll={() => setFilterDraft({ stage: '', rep: '', source: '', product: '' })}
      />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} query={searchQ} setQuery={setSearchQ} leads={allLeads} onPick={setActiveLead} />
      <LeadDetailMobile lead={activeLead} onClose={() => setActiveLead(null)} />
    </div>
  )
}
