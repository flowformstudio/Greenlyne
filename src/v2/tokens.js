/**
 * V2 design-system tokens — locked to the GreenLyne plan-selection handoff.
 * Source: design_handoff_plan_selection / README.md.
 */

export const T = {
  navy:    '#001660',     // primary surface for dark cards, headlines
  navy2:   '#0A2585',     // hover / elevated navy
  royal:   '#254BCE',     // accent / recommended ribbon / primary CTA
  emerald: '#016163',     // approval / success affirmations
  mint:    '#93DDBA',     // on-navy success accent
  mintLite:'#E9F6EE',     // success surfaces
  amber:   '#C86B00',     // warnings, positive deltas
  off:     '#F5F1EE',     // page background, on-navy text
  warm:    '#221212',     // deep brown, rare
  white:   '#FFFFFF',

  // Ink scale — semantic alphas of navy, on the off background
  ink70:   '#001660c7',
  ink60:   '#001660a6',
  ink40:   '#00166066',
  ink20:   '#00166026',
  ink10:   '#00166014',
  ink06:   '#0016600d',
  ink04:   '#00166008',
}

export const FONT = {
  display: "'Sora', ui-sans-serif, system-ui, sans-serif",
  body:    "'Manrope', ui-sans-serif, system-ui, sans-serif",
  mono:    "'JetBrains Mono', ui-monospace, monospace",
}

// Type ramp from the spec
export const TYPE = {
  heroH1:    { fontFamily: FONT.display, fontSize: 46,   fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.028em' },
  sectionH2: { fontFamily: FONT.display, fontSize: 26,   fontWeight: 700, lineHeight: 1.1,  letterSpacing: '-0.02em'  },
  planPrice: { fontFamily: FONT.display, fontSize: 54,   fontWeight: 700, lineHeight: 1,    letterSpacing: '-0.035em' },
  planTitle: { fontFamily: FONT.display, fontSize: 26,   fontWeight: 700, lineHeight: '34px', letterSpacing: '-0.02em' },
  cardStat:  { fontFamily: FONT.display, fontSize: 18,   fontWeight: 700, lineHeight: 1,    letterSpacing: '-0.01em'  },
  body:      { fontFamily: FONT.body,    fontSize: 15.5, fontWeight: 400, lineHeight: 1.55 },
  bullet:    { fontFamily: FONT.body,    fontSize: 12.5, fontWeight: 500, lineHeight: 1.4  },
  eyebrow:   { fontFamily: FONT.body,    fontSize: 11,   fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' },
  monoCap:   { fontFamily: FONT.mono,    fontSize: 11.5, fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.06em' },
}

export const RADIUS = {
  card:    16,
  cardSm:  14,
  cardLg:  18,
  pill:    999,
}

export const SHADOW = {
  cardSelectedLight: '0 22px 44px -24px #254BCE66',
  cardSelectedDark:  '0 24px 48px -22px #00166099',
  stickyConfirm:     '0 30px 60px -28px #00166044',
  cardRest:          '0 2px 0 0 #00166008',
}

// Sane spacing scale
export const SPACE = { 0:0, 1:4, 2:8, 3:12, 4:16, 5:20, 6:24, 7:32, 8:40, 9:56, 10:72, 11:96 }

// Helper for the "navy/mint" highlight motif (inline span behind dollar amounts)
export const HIGHLIGHT = {
  display: 'inline-block',
  padding: '0 .18em .04em .18em',
  background: T.navy,
  color: T.mint,
  boxDecorationBreak: 'clone',
  WebkitBoxDecorationBreak: 'clone',
  borderRadius: 4,
}
