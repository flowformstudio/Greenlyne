/**
 * Single source of truth for the demo's main CTA + secondary buttons.
 *
 * The look was set on the Welcome screen ("Start my loan application"):
 *   royal pill, off-white text, layered navy/royal shadow, lift-on-hover,
 *   14×26 padding, Manrope 700, right-arrow icon when forward.
 *
 * Use <PrimaryButton> for any forward / confirm action across the end-to-end
 * demo — welcome, application Step 1, Step 2 confirm, etc. — so the button
 * styling is identical everywhere.
 */

const T = {
  royal: '#254BCE',
  navy:  '#001660',
  off:   '#F5F1EE',
  white: '#FFFFFF',
  ink20: 'rgba(0,22,96,0.18)',
  ink40: 'rgba(0,22,96,0.4)',
  ink55: 'rgba(0,22,96,0.55)',
  ink65: 'rgba(0,22,96,0.65)',
}
const FONT = "'Manrope', ui-sans-serif, system-ui, sans-serif"

const SHADOW_REST = '0 14px 30px -12px rgba(37,75,206,0.8), 0 4px 12px -6px rgba(0,22,96,0.25)'
const SHADOW_HOVER = '0 18px 36px -12px rgba(37,75,206,0.85), 0 6px 14px -6px rgba(0,22,96,0.35)'

function ArrowRight({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function ArrowLeft({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

/**
 * Primary CTA — royal pill. `forward` (default true) appends a right arrow.
 * Pass `icon` to override the arrow with a custom icon.
 */
export function PrimaryButton({
  children, onClick, disabled = false,
  size = 'md',          // 'md' | 'lg'
  forward = true, icon = null,
  iconPosition = 'right',
  type = 'button',
  style,
  ...rest
}) {
  const sz = size === 'lg' ? { padding: '16px 28px', fontSize: 16 }
           :                 { padding: '14px 26px', fontSize: 16 }
  const arrow = icon ?? (forward ? <ArrowRight /> : null)
  return (
    <button
      type={type} onClick={onClick} disabled={disabled} {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        ...sz,
        borderRadius: 999, border: 0,
        fontFamily: FONT, fontWeight: 700, letterSpacing: '-0.005em',
        background: disabled ? 'rgba(0,22,96,0.15)' : T.royal,
        color:      disabled ? T.ink40 : T.off,
        cursor:     disabled ? 'not-allowed' : 'pointer',
        boxShadow:  disabled ? 'none' : SHADOW_REST,
        transition: 'transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease, background .18s ease',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseOver={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = SHADOW_HOVER } }}
      onMouseOut={e  => { if (!disabled) { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = SHADOW_REST } }}
    >
      {arrow && iconPosition === 'left'  && arrow}
      {children}
      {arrow && iconPosition === 'right' && arrow}
    </button>
  )
}

/**
 * Secondary pill — same shape, white background, navy outline.
 * Used for Back / Save-for-later actions.
 */
export function SecondaryButton({
  children, onClick, disabled = false,
  size = 'md',
  back = false, icon = null,
  type = 'button',
  style,
  ...rest
}) {
  const sz = size === 'lg' ? { padding: '14px 24px', fontSize: 15 }
           :                 { padding: '14px 22px', fontSize: 15 }
  const showIcon = icon ?? (back ? <ArrowLeft /> : null)
  return (
    <button
      type={type} onClick={onClick} disabled={disabled} {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        ...sz,
        borderRadius: 999,
        border: `1.5px solid ${T.ink20}`,
        fontFamily: FONT, fontWeight: 600,
        background: T.white, color: T.navy,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background .18s ease, border-color .18s ease',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseOver={e => { if (!disabled) { e.currentTarget.style.background = T.off; e.currentTarget.style.borderColor = 'rgba(0,22,96,0.32)' } }}
      onMouseOut={e  => { if (!disabled) { e.currentTarget.style.background = T.white; e.currentTarget.style.borderColor = T.ink20 } }}
    >
      {showIcon}
      {children}
    </button>
  )
}

export default PrimaryButton
