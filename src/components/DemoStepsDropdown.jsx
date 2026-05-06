import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * "DEMO STEPS  [ Current Step ▾ ]" — mirrors the Jump-to dropdown styling.
 * Shows all consumer-flow steps in a popover with the current one tagged "Current".
 *
 * Steps are passed in via `steps` so callers control labels, order, paths.
 */
export default function DemoStepsDropdown({ steps, theme = 'dark' }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const activeIndex = Math.max(0, steps.findIndex(s => s.path === pathname))
  const current     = steps[activeIndex] ?? steps[0]

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
  const doneTag      = '#3fc9b1'

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
          minWidth: 140,
          justifyContent: 'space-between',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = btnBgHover }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = btnBgIdle }}
      >
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, color: labelColor,
            textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1,
          }}>Demo Steps</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, lineHeight: 1.1 }}>
            <span style={{
              width: 16, height: 16, borderRadius: '50%',
              background: '#254BCE',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>{activeIndex + 1}</span>
            {current?.label ?? 'Steps'}
          </span>
        </span>
        <svg width="9" height="6" viewBox="0 0 9 6" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M1 1L4.5 5L8 1" stroke={chevColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="demo-dropdown-menu" style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: 240,
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
          {steps.map((step, i) => {
            const isCurrent = i === activeIndex
            const isDone    = i < activeIndex
            return (
              <button
                key={step.path}
                onClick={() => { setOpen(false); navigate(step.path) }}
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
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{
                    flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                    background: isCurrent ? '#254BCE' : isDone ? '#016163' : 'rgba(255,255,255,0.12)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff',
                  }}>
                    {isDone
                      ? <svg width="10" height="7" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : i + 1}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 600, color: itemTitle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.label}</span>
                    {step.subtitle && (
                      <span style={{ fontSize: 10, color: itemHint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.subtitle}</span>
                    )}
                  </span>
                </span>
                {(isCurrent || isDone) && (
                  <span style={{
                    fontSize: 9, fontWeight: 700,
                    color: isCurrent ? currentTag : doneTag,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    flexShrink: 0,
                  }}>
                    {isCurrent ? 'Current' : 'Done'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
