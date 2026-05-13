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

/* ── KPI strip — horizontally scrollable cards. */
function KpiStrip({ stats, activeKey, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
      {stats.map(s => {
        const active = activeKey === s.key
        return (
          <button key={s.key} onClick={() => onPick?.(s.key)}
            style={{
              flex: '0 0 auto', scrollSnapAlign: 'start',
              minWidth: 134, padding: '12px 14px', borderRadius: 14,
              background: active ? `${s.color}14` : '#fff',
              border: `1px solid ${active ? `${s.color}55` : 'rgba(0,22,96,0.07)'}`,
              boxShadow: '0 1px 2px rgba(0,22,96,0.04)',
              textAlign: 'left', cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: s.color }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {s.label}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#001660', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {s.value}
            </div>
            {s.sub && (
              <div style={{ fontSize: 10.5, color: 'rgba(0,22,96,0.5)', marginTop: 4 }}>{s.sub}</div>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Stage pill row. */
function StagePills({ activeKey, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px 14px', WebkitOverflowScrolling: 'touch' }}>
      <Pill label="All" active={activeKey == null} onClick={() => onPick(null)} />
      {STATUSES.map(s => (
        <Pill key={s.key} label={s.label} color={s.color} active={activeKey === s.key} onClick={() => onPick(s.key)} />
      ))}
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
    <button onClick={() => onOpen(lead)} style={{
      width: '100%', textAlign: 'left',
      padding: '14px 16px', borderRadius: 16,
      background: '#fff',
      border: '1px solid rgba(0,22,96,0.06)',
      boxShadow: '0 1px 3px rgba(0,22,96,0.04)',
      display: 'flex', flexDirection: 'column', gap: 10,
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <StatusDot status={lead.status} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em' }}>{lead.name}</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,22,96,0.55)' }}>{lead.location || '—'}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#001660', letterSpacing: '-0.01em' }}>{lead.amount || '—'}</div>
          <span style={{ display: 'inline-block', marginTop: 4, fontSize: 9.5, fontWeight: 700, color: '#254BCE', background: 'rgba(37,75,206,0.08)', padding: '2px 7px', borderRadius: 999, letterSpacing: '0.04em' }}>
            {lead.product || 'LOAN'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'rgba(0,22,96,0.65)' }}>
          {lead.monthly ? <><b style={{ color: '#001660', fontWeight: 700 }}>{lead.monthly}</b></> : '—'}
          {lead.apr ? <span style={{ color: 'rgba(0,22,96,0.45)' }}> · {lead.apr} APR</span> : null}
        </span>
        <StatusPill status={lead.status} />
      </div>
      {lead.lastActivity && (
        <div style={{ fontSize: 11, color: 'rgba(0,22,96,0.5)', borderTop: '1px solid rgba(0,22,96,0.06)', paddingTop: 8 }}>
          {lead.lastActivity}
        </div>
      )}
    </button>
  )
}

/* ── Detail page (full-screen overlay). */
function LeadDetailMobile({ lead, onClose }) {
  if (!lead) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#F8F9FB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 16px 110px' }}>
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

/* ── Filter sheet. */
function FilterSheet({ open, onClose, stage, setStage }) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,22,96,0.32)', backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        padding: '12px 16px 24px calc(16px)',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 30px rgba(0,22,96,0.18)',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,22,96,0.12)', margin: '4px auto 14px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#001660', marginBottom: 12 }}>Filter pipeline</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(0,22,96,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Stage</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          <Pill label="All" active={stage == null} onClick={() => setStage(null)} />
          {STATUSES.map(s => (
            <Pill key={s.key} label={s.label} color={s.color} active={stage === s.key} onClick={() => setStage(s.key)} />
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: '13px', borderRadius: 12, background: '#001660', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Apply filters
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: '#F8F9FB', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#fff', borderBottom: '1px solid rgba(0,22,96,0.06)' }}>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#001660', cursor: 'pointer', padding: 6, marginLeft: -6 }}>
          <Icon d={ICONS.back} w={20} h={20} stroke={2.2} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,22,96,0.05)', borderRadius: 12, padding: '8px 12px' }}>
          <span style={{ color: 'rgba(0,22,96,0.4)' }}><Icon d={ICONS.search} w={16} h={16} /></span>
          <input
            autoFocus
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search leads, locations…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#001660' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 'none', color: 'rgba(0,22,96,0.5)', cursor: 'pointer', padding: 0 }}>
              <Icon d={ICONS.close} w={14} h={14} stroke={2.2} />
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
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

/* ── FAB. */
function Fab({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'fixed', right: 18, bottom: 'calc(82px + env(safe-area-inset-bottom))',
      width: 56, height: 56, borderRadius: 999,
      background: 'linear-gradient(135deg, #001660 0%, #254BCE 100%)',
      color: '#fff', border: 'none', cursor: 'pointer',
      boxShadow: '0 10px 24px rgba(0,22,96,0.35), 0 2px 6px rgba(0,22,96,0.20)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 40,
    }}>
      <Icon d={ICONS.plus} w={22} h={22} stroke={2.4} />
    </button>
  )
}

/* ── Bottom nav. */
function BottomNav({ active = 'pipeline', onPick }) {
  const tabs = [
    { key: 'home',     label: 'Home',     icon: ICONS.home },
    { key: 'pipeline', label: 'Pipeline', icon: ICONS.pipe },
    { key: 'tasks',    label: 'Tasks',    icon: ICONS.task },
    { key: 'msg',      label: 'Messages', icon: ICONS.msg },
    { key: 'more',     label: 'More',     icon: ICONS.dots },
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
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: a ? '#001660' : 'rgba(0,22,96,0.5)',
          }}>
            <Icon d={t.icon} w={20} h={20} stroke={a ? 2.2 : 1.8} />
            <span style={{ fontSize: 9.5, fontWeight: a ? 700 : 500, letterSpacing: '0.02em' }}>{t.label}</span>
          </button>
        )
      })}
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

  const [stage, setStage] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [activeLead, setActiveLead] = useState(null)
  const [activeKpi, setActiveKpi] = useState(null)

  const filtered = useMemo(() => {
    const target = stage || activeKpi
    return target ? allLeads.filter(l => l.status === target) : allLeads
  }, [allLeads, stage, activeKpi])

  const stats = useMemo(() => STATUSES.map(s => ({
    key: s.key, label: s.label, color: s.color,
    value: allLeads.filter(l => l.status === s.key).length,
  })), [allLeads])

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        padding: '14px 16px 10px calc(16px + env(safe-area-inset-left))',
        background: 'rgba(248,249,251,0.94)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(0,22,96,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg, #001660 0%, #254BCE 100%)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em',
          }}>G</div>
          <div style={{ flex: 1, fontSize: 19, fontWeight: 700, color: '#001660', letterSpacing: '-0.02em' }}>Pipeline</div>
          <button onClick={() => setSearchOpen(true)} aria-label="Search" style={{ width: 38, height: 38, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid rgba(0,22,96,0.06)', color: '#001660', cursor: 'pointer' }}>
            <Icon d={ICONS.search} w={17} h={17} stroke={2} />
          </button>
          <button aria-label="Notifications" style={{ width: 38, height: 38, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid rgba(0,22,96,0.06)', color: '#001660', cursor: 'pointer', position: 'relative' }}>
            <Icon d={ICONS.bell} w={17} h={17} stroke={2} />
            <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: '#FB923C', boxShadow: '0 0 0 2px #F8F9FB' }} />
          </button>
          <div style={{ width: 34, height: 34, borderRadius: 999, background: 'linear-gradient(135deg, #FBBF24 0%, #FB923C 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>IG</div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,22,96,0.55)' }}>
          <b style={{ color: '#016163', fontWeight: 700 }}>{stats.find(s => s.key === 'hot')?.value || 0}</b> hot · {' '}
          <b style={{ color: '#016163', fontWeight: 700 }}>{stats.find(s => s.key === 'qualified')?.value || 0}</b> awaiting contact · {' '}
          <b style={{ color: '#016163', fontWeight: 700 }}>{stats.find(s => s.key === 'funded')?.value || 0}</b> funded
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ padding: '14px 0 0' }}>
        <KpiStrip stats={stats} activeKey={activeKpi} onPick={k => setActiveKpi(prev => prev === k ? null : k)} />
      </div>

      {/* Stage pills + filter button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 0, paddingRight: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StagePills activeKey={stage} onPick={setStage} />
        </div>
        <button onClick={() => setFilterOpen(true)} aria-label="Filters" style={{ width: 38, height: 38, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid rgba(0,22,96,0.06)', color: '#001660', cursor: 'pointer' }}>
          <Icon d={ICONS.filter} w={15} h={15} stroke={2} />
        </button>
      </div>

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

      <Fab onClick={() => navigate('/geo-campaigns?view=map&from=pipeline')} />
      <BottomNav active="pipeline" onPick={tab => {
        if (tab === 'home') navigate('/dashboard')
        if (tab === 'pipeline') {/* already here */}
      }} />

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} stage={stage} setStage={setStage} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} query={searchQ} setQuery={setSearchQ} leads={allLeads} onPick={setActiveLead} />
      <LeadDetailMobile lead={activeLead} onClose={() => setActiveLead(null)} />
    </div>
  )
}
