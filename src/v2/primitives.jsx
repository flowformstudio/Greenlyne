import { T, RADIUS, FONT, TYPE } from './tokens'

/**
 * V2 primitives — small, opinionated, mapped to the design handoff tokens.
 * Re-exported by all v2 screens.
 */

export const Wordmark = ({ height = 30 }) => (
  <img src="/greenlyne-wordmark.png" alt="GreenLyne"
    style={{ height, width: 'auto', display: 'block', objectFit: 'contain' }} />
)

export const Eyebrow = ({ children, color = T.ink60, style }) => (
  <div style={{ ...TYPE.eyebrow, color, ...style }}>{children}</div>
)

export const BrandMark = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.4" />
    <line x1="3.5" y1="20.5" x2="20.5" y2="3.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </svg>
)

export function Page({ children, style }) {
  return (
    <div style={{
      minHeight: '100%',
      background: T.off,
      fontFamily: FONT.body,
      color: T.navy,
      ...style,
    }}>{children}</div>
  )
}

export function Button({ children, variant = 'primary', size = 'md', style, ...rest }) {
  const sz = size === 'lg' ? { padding: '13px 22px', fontSize: 14 }
           : size === 'sm' ? { padding: '8px 14px',   fontSize: 12.5 }
           :                 { padding: '10px 18px',  fontSize: 13.5 }
  const variants = {
    primary:   { background: T.royal, color: T.off,  border: 0 },
    secondary: { background: T.white, color: T.navy, border: `1px solid ${T.ink20}` },
    soft:      { background: T.ink04, color: T.navy, border: `1px solid ${T.ink10}` },
    onNavy:    { background: T.mint,  color: T.navy, border: 0 },
  }[variant]
  return (
    <button {...rest} style={{
      ...variants, ...sz,
      fontFamily: FONT.body, fontWeight: 700, letterSpacing: '-0.005em',
      borderRadius: RADIUS.pill, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'all .18s cubic-bezier(.2,.8,.2,1)',
      ...style,
    }}>{children}</button>
  )
}

export function Pill({ children, tone = 'neutral', style }) {
  const tones = {
    neutral: { bg: T.ink04,    fg: T.navy,    bd: T.ink10 },
    royal:   { bg: T.white,    fg: T.royal,   bd: T.ink10 },
    emerald: { bg: T.mintLite, fg: T.emerald, bd: T.mint  },
    onNavy:  { bg: T.mint,     fg: T.emerald, bd: 'transparent' },
  }[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 9px', borderRadius: RADIUS.pill,
      background: tones.bg, color: tones.fg,
      border: `1px solid ${tones.bd}`,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      fontFamily: FONT.body,
      ...style,
    }}>{children}</span>
  )
}
