import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useManageDemo } from '../lib/PartnersContext'

export const DEMO_LINKS = [
  { label: 'Smart POS',    path: '/email',    hint: 'Consumer demo flow' },
  { label: 'Sign-in page', path: '/',         hint: 'Login screen' },
  { label: 'PMPro',      path: '/pipeline', hint: 'Back-office pipeline' },
]

/**
 * "JUMP TO  [ Current Demo ▾ ]" selector used across all demo headers.
 *
 * Props:
 *  - currentLabel: which DEMO_LINKS entry to show as currently selected
 *  - theme: 'dark' (default — for black/colored headers) | 'light'
 */
export default function DemoSwitcher({ currentLabel, theme = 'dark' }) {
  const navigate = useNavigate()
  const { openManage } = useManageDemo()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const isDark = theme === 'dark'
  const labelColor   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,22,96,0.45)'
  const btnBgIdle    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,22,96,0.06)'
  const btnBgHover   = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,22,96,0.09)'
  const btnBgOpen    = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,22,96,0.12)'
  const btnBorder    = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,22,96,0.14)'
  const btnText      = isDark ? '#fff' : '#001660'
  const chevColor    = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,22,96,0.55)'
  const menuBg       = isDark ? '#16161a' : '#fff'
  const menuBorder   = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,22,96,0.1)'
  const itemHoverBg  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,22,96,0.06)'
  const itemTitle    = isDark ? '#fff' : '#001660'
  const itemHint     = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,22,96,0.4)'
  const currentBg    = 'rgba(37,75,206,0.18)'
  const currentTag   = '#7BB6FF'

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? btnBgOpen : btnBgIdle,
          border: btnBorder,
          borderRadius: 7,
          padding: '4px 10px 5px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: btnText,
          fontFamily: "'PostGrotesk', system-ui, sans-serif",
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
          minWidth: 120,
          justifyContent: 'space-between',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = btnBgHover }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = btnBgIdle }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, color: labelColor,
            textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1,
          }}>Jump to</span>
          <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>{currentLabel}</span>
        </span>
        <svg width="9" height="6" viewBox="0 0 9 6" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M1 1L4.5 5L8 1" stroke={chevColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="demo-dropdown-menu" style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,  /* under the button */
          minWidth: 220,
          background: menuBg,
          border: menuBorder,
          borderRadius: 9,
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          zIndex: 1100,
        }}>
          {DEMO_LINKS.map(link => {
            const isCurrent = link.label === currentLabel
            return (
              <button
                key={link.path}
                onClick={() => { setOpen(false); navigate(link.path) }}
                style={{
                  background: isCurrent ? currentBg : 'none',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontFamily: "'PostGrotesk', system-ui, sans-serif",
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = itemHoverBg }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'none' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: itemTitle }}>{link.label}</span>
                  <span style={{ fontSize: 10, color: itemHint }}>{link.hint}</span>
                </span>
                {isCurrent && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: currentTag, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Current
                  </span>
                )}
              </button>
            )
          })}

          {/* Divider */}
          <div style={{
            height: 1,
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,22,96,0.08)',
            margin: '4px 6px',
          }} />

          {/* Manage Demo — opens the partner CRUD modal */}
          <button
            onClick={() => { setOpen(false); openManage('merchant') }}
            style={{
              background: 'none', border: 'none', borderRadius: 6,
              padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 10,
              fontFamily: "'PostGrotesk', system-ui, sans-serif",
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = itemHoverBg}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: 6,
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(37,75,206,0.10)',
              color: isDark ? '#fff' : '#254BCE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: itemTitle }}>Manage Demo</span>
              <span style={{ fontSize: 10, color: itemHint }}>Players · logos · default</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
