import { useState } from 'react'
import { T, FONT, RADIUS } from './tokens'

const baseInput = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px', fontSize: 15,
  background: T.white, color: T.navy,
  border: `1px solid ${T.ink20}`, borderRadius: RADIUS.cardSm,
  fontFamily: FONT.body, outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
}

function focused(e) { e.target.style.borderColor = T.royal; e.target.style.boxShadow = '0 0 0 3px rgba(37,75,206,0.16)' }
function blurred(e) { e.target.style.borderColor = T.ink20; e.target.style.boxShadow = 'none' }

export function Input({ value, onChange, type = 'text', ...rest }) {
  return (
    <input type={type} value={value ?? ''}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      {...rest}
      style={{ ...baseInput, ...rest.style }}
      onFocus={focused} onBlur={blurred} />
  )
}

export function DollarInput({ value, onChange, placeholder }) {
  const display = value && String(value).length >= 5
    ? Number(String(value).replace(/\D/g, '')).toLocaleString()
    : value
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 17, color: T.ink40, pointerEvents: 'none', fontFamily: FONT.display, fontWeight: 600 }}>$</span>
      <input value={display ?? ''} placeholder={placeholder}
        onChange={onChange ? e => onChange(e.target.value.replace(/\D/g, '')) : undefined}
        style={{ ...baseInput, padding: '12px 14px 12px 28px' }}
        onFocus={focused} onBlur={blurred} />
    </div>
  )
}

export function Select({ value, onChange, options }) {
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  return (
    <div style={{ position: 'relative' }}>
      <select value={value ?? ''}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        style={{
          ...baseInput, paddingRight: 36, cursor: 'pointer',
          appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
          background: `${T.white} url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23001660' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>") no-repeat right 12px center`,
        }}
        onFocus={focused} onBlur={blurred}>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function Field({ label, helper, children, error }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.navy, letterSpacing: '0.01em' }}>
          {label}
          {helper && <span style={{ fontWeight: 500, color: T.ink40, marginLeft: 6 }}>{helper}</span>}
        </span>
      )}
      {children}
      {error && <span style={{ fontSize: 12, color: '#B91C1C' }}>{error}</span>}
    </label>
  )
}

export function Tile({ active, onClick, icon, title, sub, hint }) {
  return (
    <button onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '16px 18px',
        borderRadius: RADIUS.cardSm,
        border: `1.5px solid ${active ? T.royal : T.ink10}`,
        background: active ? 'rgba(37,75,206,0.04)' : T.white,
        cursor: 'pointer', fontFamily: FONT.body,
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all .18s cubic-bezier(.2,.8,.2,1)',
      }}>
      {icon && <span style={{ flexShrink: 0, color: active ? T.royal : T.ink60 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: T.navy, letterSpacing: '-0.005em' }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: T.ink60, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
        {hint && <div style={{ fontSize: 11, color: T.ink40, marginTop: 4, fontFamily: FONT.mono, letterSpacing: '0.04em' }}>{hint}</div>}
      </div>
      {active && (
        <span style={{
          width: 22, height: 22, borderRadius: '50%', background: T.royal,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2L5 8.7L9.7 3.5" stroke={T.white} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  )
}

export function Toggle({ value, onChange, options }) {
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  return (
    <div style={{
      display: 'inline-flex',
      padding: 4,
      background: T.ink04,
      borderRadius: RADIUS.pill,
      border: `1px solid ${T.ink10}`,
    }}>
      {opts.map(o => {
        const active = value === o.value
        return (
          <button key={o.value} onClick={() => onChange?.(o.value)}
            style={{
              padding: '7px 14px', borderRadius: RADIUS.pill, border: 0,
              background: active ? T.white : 'transparent',
              color: active ? T.navy : T.ink60,
              fontSize: 13, fontWeight: 700, fontFamily: FONT.body,
              cursor: 'pointer', boxShadow: active ? '0 1px 2px rgba(0,22,96,0.12)' : 'none',
              transition: 'all .15s',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function HelpText({ children, tone = 'muted' }) {
  const color = tone === 'muted' ? T.ink60 : T.ink70
  return (
    <p style={{ fontSize: 12.5, color, lineHeight: 1.5, margin: '6px 0 0' }}>
      <span style={{ color: T.royal, marginRight: 4 }}>*</span>{children}
    </p>
  )
}

// Simple stateful field-row helper
export function Row({ children, gap = 12, align = 'flex-start' }) {
  return <div style={{ display: 'flex', gap, alignItems: align, flexWrap: 'wrap' }}>{children}</div>
}

export function Col({ children, flex, maxWidth, minWidth = 200 }) {
  return <div style={{ flex: flex || '1 1 0', maxWidth, minWidth }}>{children}</div>
}

// Hook returning a stable setter for object-style state
export function useFormSetter(setObj, obj) {
  return field => value => setObj({ ...obj, [field]: value })
}

// Convenience for a controlled checkbox
export function Checkbox({ checked, onChange, label, hint }) {
  const [hover, setHover] = useState(false)
  return (
    <label
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px',
        background: checked ? 'rgba(37,75,206,0.04)' : (hover ? T.ink04 : 'transparent'),
        borderRadius: RADIUS.cardSm,
        cursor: 'pointer', fontSize: 13.5, color: T.navy,
        border: `1px solid ${checked ? T.royal : 'transparent'}`,
        transition: 'all .15s',
      }}>
      <input type="checkbox" checked={!!checked}
        onChange={e => onChange?.(e.target.checked)}
        style={{ marginTop: 2, accentColor: T.royal }} />
      <span>
        <span style={{ fontWeight: 600 }}>{label}</span>
        {hint && <span style={{ display: 'block', fontSize: 12, color: T.ink60, marginTop: 2 }}>{hint}</span>}
      </span>
    </label>
  )
}
