import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { QUOTA } from '../lib/quota'
import { useTheme } from '../lib/theme'
import LoanConfigFlow from '../components/LoanConfigFlow'
import EmailPreview from './EmailPreview'
import { PhasePaymentChart, ChartCaption, OfferTile, computeOffer, computeFiveYearTotal } from '../components/ScreenOfferSelect'
import { calcRate, calcEscrowLoan, formatCurrencyFull, AMORT_TERM_MO, ORIGINATION_FEE } from '../lib/loanCalc'
import { DEMO_PERSONA } from '../lib/persona'
import { setDemoSession } from '../lib/demoSession'
import { subscribeLeads, addLead, deleteLead } from '../lib/firebase'

// ─── Demo borrower profile (mirrors the SmartPOS persona for downstream calcs) ─
const DEMO_PROFILE = {
  fico: 740,
  propValue:   DEMO_PERSONA.propValueN,
  mortgageBal: DEMO_PERSONA.mortgageBalanceN,
  creditLim:   120_000,
  drawAmt:     DEMO_PERSONA.requestedLoanAmountN || 96_000,
}
const DEFAULT_RECOMMENDED_PRESET = { zeroStart: true, ioYrs: 5, s: 0.30, reductionYrs: 5 }
const STANDARD_PRESET = { zeroStart: false, ioYrs: 0, s: 0, reductionYrs: null }
const MERCHANT_PLAN_KEY = 'merchant_recommended_plan'

// Compute payments for a given preset using the same lib as the application flow
function computePresetCalc(preset, profile = DEMO_PROFILE) {
  const cltv = (profile.mortgageBal + profile.creditLim) / profile.propValue
  const rate = calcRate(profile.fico, cltv) ?? 0.0825
  const n1 = preset.zeroStart ? 6 : 0
  const redMo = (preset.reductionYrs ?? preset.ioYrs ?? 0) * 12
  const n2_IO = preset.s > 0 ? Math.max(0, redMo - n1) : 0
  const n2_PI = (preset.ioYrs === 0 && preset.s > 0) ? Math.max(0, 24 - n1) : 0
  const calc = calcEscrowLoan({
    C: profile.drawAmt, rate, f: ORIGINATION_FEE,
    n1, n2_IO, n2_PI, s: preset.s,
    amortMo: AMORT_TERM_MO,
  })
  return calc ? { calc, rate } : null
}

function derivePresetPhases(result, preset) {
  if (!result?.calc) return []
  const { calc } = result
  const phases = []
  if (preset.zeroStart) phases.push({ amount: 0, period: 'First 6 months' })
  if (preset.ioYrs > 0) {
    const start = preset.zeroStart ? 7 : 1
    const end   = preset.ioYrs * 12
    const ioPayment = preset.s > 0 ? calc.Red_IO : calc.IO_custom
    phases.push({ amount: ioPayment, period: `Months ${start}–${end}` })
  }
  let finalPeriod
  if (preset.ioYrs > 0)      finalPeriod = `After year ${preset.ioYrs}`
  else if (preset.zeroStart) finalPeriod = 'After 6 months'
  else                       finalPeriod = 'Every month'
  phases.push({ amount: calc.PI_custom || calc.B, period: finalPeriod })
  return phases
}

function presetPhaseColor(phase, idx, total) {
  if (phase.amount === 0) return '#016163'                          // green
  if (idx === total - 1 && total > 1) return '#5B5FC7'              // purple
  return '#254BCE'                                                   // blue
}

// Compact label / value row used inside the plan cards' term grids
function TermPair({ label, value, small = false }) {
  return (
    <div className="flex flex-col">
      <div className={`uppercase tracking-wide font-semibold text-gray-400 ${small ? 'text-[9.5px]' : 'text-[10px]'}`}>{label}</div>
      <div className={`mt-0.5 tabular-nums text-gray-800 ${small ? 'text-xs font-semibold' : 'text-base font-semibold'}`}>{value}</div>
    </div>
  )
}

const STATUSES = [
  { key: 'qualified', label: 'Qualified', color: 'bg-blue-500',    textColor: '#60A5FA', activeBg: 'bg-blue-50',    info: 'Passed prescreen, offer ready, no outreach.\nAction: Send email or postcard' },
  { key: 'contacted', label: 'Contacted', color: 'bg-sky-400',     textColor: '#38BDF8', activeBg: 'bg-sky-50',     info: 'Offer delivered.\nAction: Wait / follow up if no response' },
  { key: 'engaged',   label: 'Engaged',   color: 'bg-amber-400',   textColor: '#FBBF24', activeBg: 'bg-amber-50',   info: 'They opened and visited their offer.\nAction: Strike while hot' },
  { key: 'hot',       label: 'Hot',       color: 'bg-orange-500',  textColor: '#FB923C', activeBg: 'bg-orange-50',  info: 'Clicked Apply Now.\nAction: Call them, help them complete' },
  { key: 'applying',  label: 'Applying',  color: 'bg-purple-500',  textColor: '#C084FC', activeBg: 'bg-purple-50',  info: 'Filling out application.\nAction: Support / don\'t lose them' },
  { key: 'approved',  label: 'Approved',  color: 'bg-emerald-400', textColor: '#34D399', activeBg: 'bg-emerald-50', info: 'Conditionally approved.\nAction: Close' },
  { key: 'funded',    label: 'Funded',    color: 'bg-lime-400',    textColor: '#A3E635', activeBg: 'bg-lime-50',    info: 'Done ✓' },
]

const LEADS_BASE = [
  {
    id: 1, status: 'qualified', name: 'Sarah Johnson',   location: 'Austin, TX',      amount: '$85,000',  product: 'HELOC',  monthly: '$520/mo', portal: false, apply: false, days: 1,  lastActivity: 'Created today',       actions: ['Send Email', 'Send Postcard'],
    phone: '(512) 555-0182', email: 'sarah.johnson@email.com', address: '2847 Ridgewood Dr, Austin, TX 78704',
    apr: '8.25%', offerDate: 'Mar 8, 2026', offerStatus: 'active',
    propValue: '$412,000', equity: '$127,000', cltv: '69%', fico: 724, dti: '31%',
    portalFirst: null, portalLast: null, pagesViewed: 0, clickedApply: null, daysSince: 1,
    emailSent: null, postcardSent: null, lastContact: null,
    source: 'Geo Campaign — Miami Westside', createdBy: 'Demo User', createdDate: 'Mar 8, 2026',
    prescreenChecks: [
      { check: 'Address Verification', result: 'Pass', reason: null },
      { check: 'Max CLTV', result: 'Pass', reason: null },
      { check: 'Credit check', result: 'Pass', reason: null },
      { check: 'Loan Offer', result: 'Generated', reason: null },
    ],
    timeline: [
      { date: 'Mar 8, 2026', event: 'Lead created via Geo Campaign — Miami Westside' },
      { date: 'Mar 8, 2026', event: 'Prescreen run' },
      { date: 'Mar 8, 2026', event: 'Offer generated — $85,000 HELOC @ 8.25%' },
    ],
  },
  {
    id: 2, status: 'contacted', name: 'Michael Chen',    location: 'San Diego, CA',   amount: '$120,000', product: 'HELOAN', monthly: '$690/mo', portal: false, apply: false, days: 3,  lastActivity: 'Email sent',          actions: ['Send Postcard', 'View'],
    phone: '(619) 555-0247', email: 'mchen@gmail.com', address: '1105 Pacific Ave, San Diego, CA 92101',
    apr: '7.90%', offerDate: 'Mar 5, 2026', offerStatus: 'active',
    propValue: '$680,000', equity: '$240,000', cltv: '65%', fico: 748, dti: '28%',
    portalFirst: null, portalLast: null, pagesViewed: 0, clickedApply: null, daysSince: 3,
    emailSent: 'Mar 6, 2026', postcardSent: null, lastContact: 'Mar 6, 2026',
    source: 'Geo Campaign — Austin North', createdBy: 'Demo User', createdDate: 'Mar 5, 2026',
    prescreenChecks: [
      { check: 'Address Verification', result: 'Pass', reason: null },
      { check: 'Max CLTV', result: 'Pass', reason: null },
      { check: 'Credit check', result: 'Pass', reason: null },
      { check: 'Loan Offer', result: 'Generated', reason: null },
    ],
    timeline: [
      { date: 'Mar 5, 2026', event: 'Lead created via Geo Campaign — Austin North' },
      { date: 'Mar 5, 2026', event: 'Prescreen run' },
      { date: 'Mar 5, 2026', event: 'Offer generated — $120,000 HELOAN @ 7.90%' },
      { date: 'Mar 6, 2026', event: 'Email sent' },
    ],
  },
  {
    id: 3, status: 'engaged',   name: 'David Martinez',  location: 'Phoenix, AZ',     amount: '$95,000',  product: 'HELOC',  monthly: '$560/mo', portal: true,  apply: false, days: 5,  lastActivity: 'Portal visited',      actions: ['Follow Up', 'View'],
    phone: '(602) 555-0391', email: 'david.martinez@icloud.com', address: '4420 N 32nd St, Phoenix, AZ 85018',
    apr: '8.10%', offerDate: 'Mar 3, 2026', offerStatus: 'active',
    propValue: '$390,000', equity: '$145,000', cltv: '63%', fico: 731, dti: '33%',
    portalFirst: 'Mar 5, 2026 9:14am', portalLast: 'Mar 7, 2026 6:42pm', pagesViewed: 4, clickedApply: null, daysSince: 1,
    emailSent: 'Mar 4, 2026', postcardSent: 'Mar 4, 2026', lastContact: 'Mar 4, 2026',
    source: 'Geo Campaign — Phoenix Central', createdBy: 'Demo User', createdDate: 'Mar 3, 2026',
    prescreenChecks: [
      { check: 'Address Verification', result: 'Pass', reason: null },
      { check: 'Max CLTV', result: 'Pass', reason: null },
      { check: 'Credit check', result: 'Pass', reason: null },
      { check: 'Loan Offer', result: 'Generated', reason: null },
    ],
    timeline: [
      { date: 'Mar 3, 2026', event: 'Lead created via Geo Campaign — Phoenix Central' },
      { date: 'Mar 3, 2026', event: 'Prescreen run' },
      { date: 'Mar 3, 2026', event: 'Offer generated — $95,000 HELOC @ 8.10%' },
      { date: 'Mar 4, 2026', event: 'Email sent' },
      { date: 'Mar 4, 2026', event: 'Postcard sent' },
      { date: 'Mar 5, 2026', event: 'Portal first visited — 4 pages viewed' },
      { date: 'Mar 7, 2026', event: 'Portal revisited' },
    ],
  },
  {
    id: 4, status: 'hot',       name: 'Jennifer Lee',    location: 'Denver, CO',      amount: '$150,000', product: 'HELOAN', monthly: '$830/mo', portal: true,  apply: true,  days: 2,  lastActivity: 'Clicked Apply',       actions: ['Open Application'],
    phone: '(720) 555-0158', email: 'jlee@outlook.com', address: '811 Cherry St, Denver, CO 80220',
    apr: '7.75%', offerDate: 'Mar 6, 2026', offerStatus: 'active',
    propValue: '$710,000', equity: '$310,000', cltv: '56%', fico: 762, dti: '25%',
    portalFirst: 'Mar 7, 2026 2:10pm', portalLast: 'Mar 8, 2026 10:05am', pagesViewed: 7, clickedApply: 'Mar 8, 2026', daysSince: 0,
    emailSent: 'Mar 6, 2026', postcardSent: 'Mar 6, 2026', lastContact: 'Mar 6, 2026',
    source: 'Geo Campaign — Denver Highlands', createdBy: 'Demo User', createdDate: 'Mar 6, 2026',
    prescreenChecks: [
      { check: 'Address Verification', result: 'Pass', reason: null },
      { check: 'Max CLTV', result: 'Pass', reason: null },
      { check: 'Credit check', result: 'Pass', reason: null },
      { check: 'Loan Offer', result: 'Generated', reason: null },
    ],
    timeline: [
      { date: 'Mar 6, 2026', event: 'Lead created via Geo Campaign — Denver Highlands' },
      { date: 'Mar 6, 2026', event: 'Prescreen run' },
      { date: 'Mar 6, 2026', event: 'Offer generated — $150,000 HELOAN @ 7.75%' },
      { date: 'Mar 6, 2026', event: 'Email sent' },
      { date: 'Mar 6, 2026', event: 'Postcard sent' },
      { date: 'Mar 7, 2026', event: 'Portal first visited — 7 pages viewed' },
      { date: 'Mar 8, 2026', event: 'Portal revisited' },
      { date: 'Mar 8, 2026', event: 'Clicked Apply' },
    ],
  },
  {
    id: 5, status: 'applying',  name: 'Robert Brown',    location: 'Tampa, FL',       amount: '$110,000', product: 'HELOC',  monthly: '$610/mo', portal: true,  apply: true,  days: 6,  lastActivity: 'Application started', actions: ['Check Status'],
    phone: '(813) 555-0274', email: 'rbrown@yahoo.com', address: '3318 Bayshore Blvd, Tampa, FL 33629',
    apr: '8.05%', offerDate: 'Mar 2, 2026', offerStatus: 'active',
    propValue: '$445,000', equity: '$165,000', cltv: '63%', fico: 719, dti: '34%',
    portalFirst: 'Mar 3, 2026 11:20am', portalLast: 'Mar 7, 2026 3:15pm', pagesViewed: 11, clickedApply: 'Mar 4, 2026', daysSince: 1,
    emailSent: 'Mar 2, 2026', postcardSent: 'Mar 3, 2026', lastContact: 'Mar 3, 2026',
    source: 'Bulk Upload', createdBy: 'Demo User', createdDate: 'Mar 2, 2026',
    prescreenChecks: [
      { check: 'Address Verification', result: 'Pass', reason: null },
      { check: 'Max CLTV', result: 'Pass', reason: null },
      { check: 'Credit check', result: 'Pass', reason: null },
      { check: 'Loan Offer', result: 'Generated', reason: null },
    ],
    timeline: [
      { date: 'Mar 2, 2026', event: 'Lead created via Bulk Upload' },
      { date: 'Mar 2, 2026', event: 'Prescreen run' },
      { date: 'Mar 2, 2026', event: 'Offer generated — $110,000 HELOC @ 8.05%' },
      { date: 'Mar 2, 2026', event: 'Email sent' },
      { date: 'Mar 3, 2026', event: 'Postcard sent' },
      { date: 'Mar 3, 2026', event: 'Portal first visited' },
      { date: 'Mar 4, 2026', event: 'Clicked Apply' },
      { date: 'Mar 7, 2026', event: 'Application started' },
    ],
  },
  {
    id: 6, status: 'approved',  name: 'Amanda Wilson',   location: 'Seattle, WA',     amount: '$130,000', product: 'HELOAN', monthly: '$720/mo', portal: true,  apply: true,  days: 8,  lastActivity: 'Approved',            actions: ['Prepare Closing'],
    phone: '(206) 555-0319', email: 'awilson@gmail.com', address: '920 E Pine St, Seattle, WA 98122',
    apr: '7.85%', offerDate: 'Feb 28, 2026', offerStatus: 'active',
    propValue: '$820,000', equity: '$390,000', cltv: '52%', fico: 778, dti: '22%',
    portalFirst: 'Mar 1, 2026 8:45am', portalLast: 'Mar 5, 2026 1:30pm', pagesViewed: 14, clickedApply: 'Mar 2, 2026', daysSince: 3,
    emailSent: 'Mar 1, 2026', postcardSent: 'Mar 1, 2026', lastContact: 'Mar 5, 2026',
    source: 'Geo Campaign — Miami Westside', createdBy: 'Demo User', createdDate: 'Feb 28, 2026',
    prescreenChecks: [
      { check: 'Address Verification', result: 'Pass', reason: null },
      { check: 'Max CLTV', result: 'Pass', reason: null },
      { check: 'Credit check', result: 'Pass', reason: null },
      { check: 'Loan Offer', result: 'Generated', reason: null },
    ],
    timeline: [
      { date: 'Feb 28, 2026', event: 'Lead created via Geo Campaign — Miami Westside' },
      { date: 'Feb 28, 2026', event: 'Prescreen run' },
      { date: 'Feb 28, 2026', event: 'Offer generated — $130,000 HELOAN @ 7.85%' },
      { date: 'Mar 1, 2026', event: 'Email sent' },
      { date: 'Mar 1, 2026', event: 'Postcard sent' },
      { date: 'Mar 1, 2026', event: 'Portal first visited' },
      { date: 'Mar 2, 2026', event: 'Clicked Apply' },
      { date: 'Mar 3, 2026', event: 'Application started' },
      { date: 'Mar 5, 2026', event: 'Approved' },
    ],
  },
  {
    id: 7, status: 'funded',    name: 'James Taylor',    location: 'Dallas, TX',      amount: '$140,000', product: 'HELOAN', monthly: '$770/mo', portal: true,  apply: true,  days: 14, lastActivity: 'Loan funded',         actions: ['View Details'],
    phone: '(214) 555-0436', email: 'james.taylor@proton.me', address: '5540 Swiss Ave, Dallas, TX 75214',
    apr: '7.70%', offerDate: 'Feb 22, 2026', offerStatus: 'active',
    propValue: '$590,000', equity: '$255,000', cltv: '57%', fico: 791, dti: '20%',
    portalFirst: 'Feb 23, 2026 3:00pm', portalLast: 'Mar 1, 2026 10:00am', pagesViewed: 18, clickedApply: 'Feb 25, 2026', daysSince: 7,
    emailSent: 'Feb 22, 2026', postcardSent: 'Feb 23, 2026', lastContact: 'Mar 4, 2026',
    source: 'Geo Campaign — Austin North', createdBy: 'Demo User', createdDate: 'Feb 22, 2026',
    prescreenChecks: [
      { check: 'Address Verification', result: 'Pass', reason: null },
      { check: 'Max CLTV', result: 'Pass', reason: null },
      { check: 'Credit check', result: 'Pass', reason: null },
      { check: 'Loan Offer', result: 'Generated', reason: null },
    ],
    timeline: [
      { date: 'Feb 22, 2026', event: 'Lead created via Geo Campaign — Austin North' },
      { date: 'Feb 22, 2026', event: 'Prescreen run' },
      { date: 'Feb 22, 2026', event: 'Offer generated — $140,000 HELOAN @ 7.70%' },
      { date: 'Feb 22, 2026', event: 'Email sent' },
      { date: 'Feb 23, 2026', event: 'Postcard sent' },
      { date: 'Feb 23, 2026', event: 'Portal first visited' },
      { date: 'Feb 25, 2026', event: 'Clicked Apply' },
      { date: 'Feb 26, 2026', event: 'Application started' },
      { date: 'Mar 1, 2026',  event: 'Approved' },
      { date: 'Mar 4, 2026',  event: 'Loan funded' },
    ],
  },
]

// Generate 100 additional leads
;(function () {
  const FIRST = ['Emily','Carlos','Patricia','Kevin','Maria','Brian','Lisa','Daniel','Nancy','Jason',
    'Karen','Eric','Sandra','Ryan','Betty','Gary','Donna','Timothy','Carol','Ronald','Dorothy','Kenneth',
    'Ruth','George','Sharon','Edward','Michelle','Jeffrey','Laura','Frank','Sarah','Scott','Angela','Andrew',
    'Melissa','Raymond','Debra','Gregory','Stephanie','Joshua','Rebecca','Jerry','Sharon','Dennis','Cynthia',
    'Walter','Amy','Peter','Anna','Harold','Pamela','Jose','Emma','Henry','Evelyn','Douglas','Emily',
    'Keith','Abigail','Lawrence','Margaret','Roger','Sophia','Steven','Isabella','Terry','Mia','Sean',
    'Ava','Dale','Lily','Jordan','Ella','Joel','Madison','Alan','Layla','Philip','Zoe','Randy',
    'Victoria','Vincent','Nora','Roy','Riley','Ralph','Zoey','Eugene','Penelope','Wayne','Grace',
    'Dylan','Chloe','Arthur','Ellie','Louis','Hannah','Phillip','Lillian']
  const LAST = ['Williams','Garcia','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson',
    'Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris',
    'Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott',
    'Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell',
    'Mitchell','Carter','Roberts','Gomez','Phillips','Evans','Turner','Diaz','Parker','Cruz','Edwards',
    'Collins','Reyes','Stewart','Morris','Morales','Murphy','Cook','Rogers','Gutierrez','Ortiz','Morgan',
    'Cooper','Peterson','Bailey','Reed','Kelly','Howard','Ramos','Kim','Cox','Ward','Richardson',
    'Watson','Brooks','Chavez','Wood','James','Bennett','Gray','Mendoza','Ruiz','Hughes','Price',
    'Alvarez','Castillo','Sanders','Patel','Myers','Long','Ross','Foster','Jimenez','Powell','Jenkins']
  const CITIES = [
    ['Houston, TX','(713)'],['Charlotte, NC','(704)'],['Indianapolis, IN','(317)'],['Columbus, OH','(614)'],
    ['Fort Worth, TX','(817)'],['Memphis, TN','(901)'],['Portland, OR','(503)'],['Las Vegas, NV','(702)'],
    ['Louisville, KY','(502)'],['Baltimore, MD','(410)'],['Milwaukee, WI','(414)'],['Albuquerque, NM','(505)'],
    ['Tucson, AZ','(520)'],['Fresno, CA','(559)'],['Sacramento, CA','(916)'],['Mesa, AZ','(480)'],
    ['Kansas City, MO','(816)'],['Atlanta, GA','(404)'],['Omaha, NE','(402)'],['Colorado Springs, CO','(719)'],
    ['Raleigh, NC','(919)'],['Long Beach, CA','(562)'],['Virginia Beach, VA','(757)'],['Minneapolis, MN','(612)'],
    ['Nashville, TN','(615)'],['New Orleans, LA','(504)'],['Bakersfield, CA','(661)'],['Tampa, FL','(813)'],
    ['Arlington, TX','(817)'],['Anaheim, CA','(714)'],
  ]
  const STATUSES_W = [
    ...Array(30).fill('qualified'),
    ...Array(25).fill('contacted'),
    ...Array(20).fill('engaged'),
    ...Array(10).fill('hot'),
    ...Array(8).fill('applying'),
    ...Array(5).fill('approved'),
    ...Array(2).fill('funded'),
  ]
  const SOURCES = ['Geo Campaign — Miami Westside','Geo Campaign — Austin North','Geo Campaign — Phoenix Central',
    'Geo Campaign — Denver Highlands','Bulk Upload','Manual Entry']
  const STATUS_ACTIVITY = {
    qualified: 'Created today', contacted: 'Email sent', engaged: 'Portal visited',
    hot: 'Clicked Apply', applying: 'Application started', approved: 'Approved', funded: 'Loan funded',
  }
  const STATUS_ACTIONS = {
    qualified: ['Send Email', 'Send Postcard'], contacted: ['Send Postcard', 'View'],
    engaged: ['Follow Up', 'View'], hot: ['Open Application'],
    applying: ['Check Status'], approved: ['Prepare Closing'], funded: ['View Details'],
  }
  const rng = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff } }
  for (let i = 0; i < 100; i++) {
    const r = rng(i * 7 + 31)
    const fi = Math.floor(r() * FIRST.length)
    const li = Math.floor(r() * LAST.length)
    const ci = Math.floor(r() * CITIES.length)
    const st = STATUSES_W[i]
    const [city, areaCode] = CITIES[ci]
    const amtK = 60 + Math.floor(r() * 180)
    const amt = `$${amtK},000`
    const prod = r() > 0.5 ? 'HELOC' : 'HELOAN'
    const mo = Math.round(amtK * (5 + r() * 3))
    const days = 1 + Math.floor(r() * 30)
    const portal = ['hot','applying','approved','funded'].includes(st) || (st === 'engaged')
    const apply = ['hot','applying','approved','funded'].includes(st)
    const fico = 680 + Math.floor(r() * 120)
    const propVal = 300 + Math.floor(r() * 600)
    const equity = Math.floor(propVal * (0.2 + r() * 0.3))
    const cltv = Math.floor(((propVal - equity) / propVal) * 100)
    const apr = (7.5 + r() * 1.2).toFixed(2) + '%'
    const src = SOURCES[Math.floor(r() * SOURCES.length)]
    LEADS_BASE.push({
      id: 8 + i,
      status: st,
      name: `${FIRST[fi]} ${LAST[li]}`,
      location: city,
      amount: amt,
      product: prod,
      monthly: `$${mo}/mo`,
      portal,
      apply,
      days,
      lastActivity: STATUS_ACTIVITY[st],
      actions: STATUS_ACTIONS[st],
      phone: `${areaCode} 555-${String(1000 + Math.floor(r() * 9000)).slice(0,4)}`,
      email: `${FIRST[fi].toLowerCase()}.${LAST[li].toLowerCase()}@email.com`,
      address: `${1000 + Math.floor(r() * 9000)} Main St, ${city}`,
      apr, offerDate: 'Mar 8, 2026', offerStatus: 'active',
      propValue: `$${propVal}k`, equity: `$${equity}k`, cltv: `${cltv}%`,
      fico, dti: `${20 + Math.floor(r() * 20)}%`,
      portalFirst: portal ? 'Mar 5, 2026' : null,
      portalLast: portal ? 'Mar 7, 2026' : null,
      pagesViewed: portal ? 2 + Math.floor(r() * 10) : 0,
      clickedApply: apply ? 'Mar 7, 2026' : null,
      daysSince: Math.floor(r() * 5),
      emailSent: st !== 'qualified' ? 'Mar 6, 2026' : null,
      postcardSent: ['engaged','hot','applying','approved','funded'].includes(st) ? 'Mar 6, 2026' : null,
      lastContact: st !== 'qualified' ? 'Mar 6, 2026' : null,
      source: src, createdBy: 'Demo User', createdDate: 'Mar 8, 2026',
      prescreenChecks: [
        { check: 'Address Verification', result: 'Pass', reason: null },
        { check: 'Max CLTV', result: 'Pass', reason: null },
        { check: 'Credit check', result: 'Pass', reason: null },
        { check: 'Loan Offer', result: 'Generated', reason: null },
      ],
      timeline: [
        { date: 'Mar 8, 2026', event: `Lead created via ${src}` },
        { date: 'Mar 8, 2026', event: 'Prescreen run' },
        { date: 'Mar 8, 2026', event: `Offer generated — ${amt} ${prod} @ ${apr}` },
      ],
    })
  }
})()

const LEADS = LEADS_BASE

const STATUS_DOT = {
  qualified: 'bg-blue-400', contacted: 'bg-sky-400', engaged: 'bg-amber-400',
  hot: 'bg-orange-500', applying: 'bg-purple-400', approved: 'bg-emerald-400', funded: 'bg-lime-400',
}
const STATUS_LABEL = {
  qualified: 'Qualified', contacted: 'Contacted', engaged: 'Engaged',
  hot: 'Hot', applying: 'Applying', approved: 'Approved', funded: 'Funded',
}

function PostcardIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 29 30" fill="none" stroke="currentColor" strokeWidth="2.42" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24.1665 7.5H4.83317C3.49848 7.5 2.4165 8.61929 2.4165 10V20C2.4165 21.3807 3.49848 22.5 4.83317 22.5H24.1665C25.5012 22.5 26.5832 21.3807 26.5832 20V10C26.5832 8.61929 25.5012 7.5 24.1665 7.5Z"/>
      <path d="M14.5 7.5V22.5"/>
      <path d="M2.4165 15H14.4998"/>
    </svg>
  )
}

function ActionBtn({ icon, label, onClick, primary, variant, disabled }) {
  const v = variant || (primary ? 'primary' : 'tertiary')
  const STYLE = {
    primary:   { bg: '#254BCE', border: '#254BCE', fg: '#fff',    iconColor: '#fff',    hoverBg: '#1e3fa8' },
    secondary: { bg: '#fff',    border: '#254BCE', fg: '#254BCE', iconColor: '#254BCE', hoverBg: '#F1F4FF' },
    done:      { bg: '#ECFDF5', border: '#A7F3D0', fg: '#065F46', iconColor: '#016163', hoverBg: '#ECFDF5' },
    tertiary:  { bg: '#fff',    border: 'rgba(0,22,96,0.1)', fg: '#374151', iconColor: '#254BCE', hoverBg: '#F8F9FC' },
  }[v]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-2 transition-all disabled:cursor-default"
      style={{
        height: 75,
        borderRadius: 6,
        border: `0.8px solid ${STYLE.border}`,
        background: STYLE.bg,
        color: STYLE.fg,
        padding: '16.8px 0.8px',
      }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.background = STYLE.hoverBg }}
      onMouseOut={e => { if (!disabled) e.currentTarget.style.background = STYLE.bg }}
    >
      <span style={{color: STYLE.iconColor, display:'flex', alignItems:'center', justifyContent:'center', width:24, height:24}}>{icon}</span>
      <span className="text-[11px] font-semibold text-center whitespace-nowrap" style={{fontFamily:"'PostGrotesk', sans-serif", lineHeight:'13.75px', color: STYLE.fg}}>{label}</span>
    </button>
  )
}

function useMerchantRecommendedPreview() {
  return useMemo(() => {
    let preset = DEFAULT_RECOMMENDED_PRESET
    try {
      const raw = localStorage.getItem(MERCHANT_PLAN_KEY)
      if (raw) preset = { ...DEFAULT_RECOMMENDED_PRESET, ...JSON.parse(raw) }
    } catch {}
    const result = computePresetCalc(preset)
    const phases = derivePresetPhases(result, preset)
    return { preset, phases }
  }, [])
}

function LeadDrawer({ lead, onClose, onEmailSent, emailSentInSession = false, onDelete }) {
  // Hooks must run on every render in the same order — keep them above any early return
  const merchantRecommended = useMerchantRecommendedPreview()
  const [showLoanFlow, setShowLoanFlow] = useState(false)
  const [emailFlow, setEmailFlow] = useState(null)   // null | 'sending' | 'sent'
  const [emailSent, setEmailSent] = useState(false)
  const [emailSentAt, setEmailSentAt] = useState(null)
  const [sendProgress, setSendProgress] = useState(0)
  const navigate = useNavigate()
  // Reflect already-sent state when re-opening a lead
  useEffect(() => {
    setEmailSent(emailSentInSession)
    setEmailFlow(null)
    setSendProgress(0)
    if (!emailSentInSession) setEmailSentAt(null)
  }, [lead?.id, emailSentInSession])
  if (!lead) return null
  const initials = lead.name.split(' ').map(n => n[0]).join('')
  const statusColor = { qualified:'#60A5FA', contacted:'#38BDF8', engaged:'#FBBF24', hot:'#FB923C', applying:'#C084FC', approved:'#34D399', funded:'#A3E635' }

  // Send-email demo flow: idle → sending (animated progress) → sent. Notifies
  // parent so the lead row reflects "Sent · Just now" status across the pipeline.
  function handleSendEmail() {
    if (emailFlow === 'sending' || emailSent) return
    setEmailFlow('sending')
    setSendProgress(0)
    const duration = 1800
    const start    = Date.now()
    const interval = setInterval(() => {
      const pct = Math.min((Date.now() - start) / duration, 1)
      setSendProgress(Math.round(pct * 100))
      if (pct >= 1) {
        clearInterval(interval)
        setEmailSent(true)
        setEmailSentAt(new Date())
        setEmailFlow(null)
        if (onEmailSent && lead?.id) onEmailSent(lead.id)
      }
    }, 50)
  }
  function handleViewEmailDemo() {
    setEmailFlow(null)
    onClose()
    navigate('/email')
  }

  return (
    <>
      {showLoanFlow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            onClick={() => setShowLoanFlow(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
          />
          <div style={{
            position: 'relative',
            width: 'min(720px, calc(100vw - 48px))',
            height: 'min(820px, calc(100vh - 48px))',
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 24px 60px -12px rgba(0,0,0,0.45)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Close button — sits above the email content */}
            <button
              onClick={() => setShowLoanFlow(false)}
              aria-label="Close email preview"
              style={{
                position: 'absolute', top: 12, right: 12, zIndex: 2,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {/* Non-interactive preview — scroll works, clicks/hover don't */}
              <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
                <EmailPreview hideClientChrome />
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 bg-black/25 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Email-send overlay — sits on top of the drawer body */}
        {emailFlow === 'sending' && (
          <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm flex items-center justify-center px-8 py-10">
            <div className="flex flex-col items-center gap-5 max-w-sm w-full text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{background:'rgba(37,75,206,0.08)', border:'2px solid rgba(37,75,206,0.18)'}}>
                <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              </div>
              <div>
                <div className="text-base font-semibold" style={{color:'#001660'}}>Sending email…</div>
                <div className="text-sm text-gray-500 mt-1">Delivering the Standard plan offer to <span className="font-medium text-gray-700">{lead.email}</span></div>
              </div>
              <div className="w-full">
                <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(0,22,96,0.08)'}}>
                  <div className="h-full transition-all duration-150" style={{background:'#254BCE', width:`${sendProgress}%`}} />
                </div>
                <div className="mt-2 text-[12px] tabular-nums" style={{color:'#6B7280'}}>{sendProgress}% delivered</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 shrink-0" style={{background:'#001660'}}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3.5">
              <div>
                <div className="text-lg font-bold text-white leading-tight">{lead.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{background: statusColor[lead.status]}} />
                  <span className="text-xs font-medium" style={{color:'rgba(255,255,255,0.65)'}}>{STATUS_LABEL[lead.status]}</span>
                  <span className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>·</span>
                  <span className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>{lead.location}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onDelete && (
                <button
                  onClick={() => {
                    if (window.confirm(`Remove ${lead.name} from your pipeline?`)) onDelete(lead)
                  }}
                  title="Delete lead"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors"
                  style={{ color: '#FCA5A5', background: 'rgba(255,99,99,0.12)', border: '1px solid rgba(255,99,99,0.28)' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,99,99,0.22)'; e.currentTarget.style.color = '#fff' }}
                  onMouseOut={e  => { e.currentTarget.style.background = 'rgba(255,99,99,0.12)'; e.currentTarget.style.color = '#FCA5A5' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  Delete
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{color:'rgba(255,255,255,0.5)'}}
                onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div className="flex gap-2 text-xs" style={{color:'rgba(255,255,255,0.45)'}}>
            <span>{lead.phone}</span>
            <span>·</span>
            <span>{lead.email}</span>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0" style={{background:'#F8F9FC'}}>
          {/* Email-sent success banner */}
          {emailSent && (
            <div className="rounded-md px-3 py-2.5 mb-3 flex items-center gap-3" style={{background:'#ECFDF5', border:'1px solid #A7F3D0'}}>
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{background:'#016163'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate" style={{color:'#065F46'}}>Email sent to {lead.email}</div>
                <div className="text-[10.5px]" style={{color:'#047857'}}>
                  {emailSentAt
                    ? `Delivered ${emailSentAt.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} · Tracking opens & clicks`
                    : 'Tracking opens & clicks'}
                </div>
              </div>
              <button
                onClick={handleViewEmailDemo}
                className="text-[10.5px] font-semibold whitespace-nowrap px-2 py-1 rounded transition-colors"
                style={{color:'#065F46'}}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(1,97,99,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                View email →
              </button>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2.5 mb-3">
            <ActionBtn
              variant={emailSent ? 'done' : 'primary'}
              disabled={emailSent || emailFlow === 'sending'}
              onClick={handleSendEmail}
              icon={emailSent
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              }
              label={emailSent ? 'Email Sent' : 'Send Email'} />
            <ActionBtn variant={emailSent ? 'primary' : 'secondary'} icon={<PostcardIcon size={20} />} label="Send Postcard" />
            <ActionBtn icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.99 5.99l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            } label="Call Lead" />
            <ActionBtn onClick={() => setShowLoanFlow(true)} icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            } label="Preview Offer" />
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* THE OFFER — hero section */}
          <div className="px-6 py-6 border-b border-gray-100">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">The Offer</div>

            {/* Hero loan amount */}
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="text-5xl font-bold tracking-tight" style={{color:'#001660'}}>{lead.amount}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg" style={{background:'rgba(37,75,206,0.1)', color:'#254BCE'}}>{lead.product}</span>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${lead.offerStatus === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {lead.offerStatus === 'active' ? '✓ Active Offer' : lead.offerStatus}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Offered</div>
                <div className="text-sm font-medium text-gray-600">{lead.offerDate}</div>
              </div>
            </div>

            {/* Standard plan card (the offer that goes out to the customer) */}
            <div className="rounded-xl p-4 mb-3" style={{background:'#F8F9FC', border:'1px solid rgba(0,22,96,0.07)'}}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Standard plan</div>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Sent in outreach</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Monthly Payment</div>
                  <div className="text-xl font-bold" style={{color:'#001660'}}>{lead.monthly}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">APR</div>
                  <div className="text-xl font-bold" style={{color:'#001660'}}>{lead.apr}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">5-Yr Total</div>
                  <div className="text-xl font-bold" style={{color:'#001660'}}>
                    {lead.fiveYear || `$${(parseInt(String(lead.monthly).replace(/[^0-9]/g,'')) * 60).toLocaleString()}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended plan card (configured by merchant — what customer sees in the application) */}
            <div className="rounded-xl p-4" style={{background:'rgba(37,75,206,0.04)', border:'1px solid rgba(37,75,206,0.18)'}}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{color:'#254BCE'}}>Recommended plan</div>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Shown in the application</span>
              </div>
              <div className="flex flex-col gap-2">
                {merchantRecommended.phases.map((p, i) => {
                  const c = presetPhaseColor(p, i, merchantRecommended.phases.length)
                  return (
                    <div key={i} className="flex items-baseline justify-between gap-3">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold tabular-nums tracking-tight" style={{color: c}}>
                          {p.amount === 0 ? '$0' : formatCurrencyFull(Math.round(p.amount))}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400">/mo</span>
                      </div>
                      <span className="text-[11px] text-gray-500 whitespace-nowrap">{p.period}</span>
                    </div>
                  )
                })}
              </div>

              {/* Phase chart from the application Step 2 (amounts suppressed — already shown in rows above) */}
              <div className="mt-3 pt-3 border-t border-blue-100/50">
                <PhasePaymentChart phases={merchantRecommended.phases} theme="light" hideAmountLabels />
                <ChartCaption color="#94A3B8" markers={['Now', '6 Mo', 'Yr 5', 'Yr 10']} />
              </div>

              <div className="text-[10px] text-gray-400 mt-3 pt-2.5 border-t border-blue-100/50">
                Configured by merchant in the prescreen flow.
              </div>
            </div>
          </div>

          {/* PROPERTY & QUALIFICATION */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Property & Qualification</div>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { label: 'Prop. Value', value: lead.propValue },
                { label: 'Home Equity', value: lead.equity, highlight: true },
                { label: 'CLTV', value: lead.cltv },
                { label: 'FICO', value: lead.fico, highlight: true },
                { label: 'DTI', value: lead.dti },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="rounded-lg py-3 px-1" style={{background: highlight ? 'rgba(37,75,206,0.06)' : '#F8F9FC', border: highlight ? '1px solid rgba(37,75,206,0.12)' : '1px solid rgba(0,22,96,0.06)'}}>
                  <div className={`text-sm font-bold leading-tight ${highlight ? '' : 'text-gray-800'}`} style={highlight ? {color:'#254BCE'} : {}}>{value}</div>
                  <div className="text-[9px] font-medium uppercase tracking-wide text-gray-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CONTACT INFO */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Contact Info</div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export
                </button>
                <button
                  onClick={() => {
                    if (!onDelete) return
                    if (window.confirm(`Remove ${lead.name} from your pipeline?`)) onDelete(lead)
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border rounded-lg transition-colors"
                  style={{ color: '#B91C1C', borderColor: 'rgba(185,28,28,0.25)', background: 'transparent' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(185,28,28,0.06)'}
                  onMouseOut={e  => e.currentTarget.style.background = 'transparent'}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  Delete
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.99 5.99l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <a href={`tel:${lead.phone}`} className="text-sm font-medium text-blue-600 hover:underline">{lead.phone}</a>
              </div>
              <div className="flex items-center gap-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <a href={`mailto:${lead.email}`} className="text-sm font-medium text-blue-600 hover:underline">{lead.email}</a>
              </div>
              <div className="flex items-start gap-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span className="text-sm text-gray-700">{lead.address}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 flex gap-4">
              <div><span className="text-[10px] text-gray-400 uppercase tracking-wide">Source</span><div className="text-xs font-medium text-gray-700 mt-0.5">{lead.source}</div></div>
              <div><span className="text-[10px] text-gray-400 uppercase tracking-wide">Created</span><div className="text-xs font-medium text-gray-700 mt-0.5">{lead.createdDate}</div></div>
              <div><span className="text-[10px] text-gray-400 uppercase tracking-wide">Rep</span><div className="text-xs font-medium text-gray-700 mt-0.5">{lead.createdBy}</div></div>
            </div>
          </div>

          {/* ENGAGEMENT */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Engagement</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Portal Visits', value: lead.portalFirst ? '✓ Visited' : '—', sub: lead.portalLast || '' },
                { label: 'Pages Viewed', value: lead.pagesViewed > 0 ? lead.pagesViewed : '—' },
                { label: 'Clicked Apply', value: lead.clickedApply ? '✓ Yes' : '—', sub: lead.clickedApply || '' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-lg p-3" style={{background:'#F8F9FC', border:'1px solid rgba(0,22,96,0.06)'}}>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</div>
                  <div className="text-sm font-bold text-gray-800">{value}</div>
                  {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* OUTREACH */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Outreach History</div>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Email sent', value: emailSent ? 'Just now' : lead.emailSent, action: emailSent ? null : 'Resend', justSent: emailSent },
                { label: 'Postcard sent', value: lead.postcardSent, action: 'Resend' },
                { label: 'Last contact', value: emailSent ? 'Just now' : lead.lastContact },
              ].map(({ label, value, action, justSent }) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-500">{label}</span>
                  <div className="flex items-center gap-2">
                    {justSent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background:'rgba(1,97,99,0.12)', color:'#047857' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Sent
                      </span>
                    )}
                    <span className={`text-xs font-medium ${value ? 'text-gray-800' : 'text-gray-300'}`}>{value || '—'}</span>
                    {value && action && <button className="text-[11px] text-blue-500 hover:text-blue-700">{action}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PRESCREEN */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Prescreen Checks</div>
            <div className="flex flex-col gap-2">
              {lead.prescreenChecks.map((row, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-700">{row.check}</span>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {row.result}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TIMELINE */}
          <div className="px-6 py-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Activity Timeline</div>
            <div className="flex flex-col">
              {lead.timeline.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{background:'#254BCE'}} />
                    {i < lead.timeline.length - 1 && <div className="w-px flex-1 mt-1 mb-1" style={{background:'rgba(37,75,206,0.2)'}} />}
                  </div>
                  <div className="pb-4">
                    <div className="text-sm font-medium text-gray-800">{item.event}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

function InfoRow({ label, value, bold }) {
  return (
    <div className="flex items-start justify-between py-1.5 gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-right ${bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

const ADDRESS_SUGGESTIONS = [
  { full: '4820 N 32nd St, Phoenix, AZ 85018',        city: 'Phoenix',   state: 'AZ', zip: '85018' },
  { full: '2847 Ridgewood Dr, Austin, TX 78704',       city: 'Austin',    state: 'TX', zip: '78704' },
  { full: '1105 Pacific Ave, San Diego, CA 92101',     city: 'San Diego', state: 'CA', zip: '92101' },
  { full: '811 Cherry St, Denver, CO 80220',           city: 'Denver',    state: 'CO', zip: '80220' },
  { full: '3318 Bayshore Blvd, Tampa, FL 33629',       city: 'Tampa',     state: 'FL', zip: '33629' },
  { full: '920 E Pine St, Seattle, WA 98122',          city: 'Seattle',   state: 'WA', zip: '98122' },
  { full: '5540 Swiss Ave, Dallas, TX 75214',          city: 'Dallas',    state: 'TX', zip: '75214' },
]

const STAGES       = ['AI Engine / Waiting...', 'Processing Pre-Approval...', 'Finalizing Results...', 'Completed']
const MOCK_RESULT  = { loanAmount: '$95,000', monthly: '$560/mo', apr: '8.10%' }
const VERIFICATIONS = ['Address Verified', 'Equity Check Passed', 'Credit check Passed', 'Offer Generated']

// Approved cap (used for the "no cost input" slider's upper bound)
const APPROVED_LOAN_MAX = 150_000
const LOAN_MIN          = 20_000
const LOAN_MID          = Math.round((APPROVED_LOAN_MAX + LOAN_MIN) / 2)

function QuickPrescreenModal({ onClose, onPrescreenComplete }) {
  const navigate                      = useNavigate()
  const [step, setStep]               = useState('form')
  const [stageIndex, setStageIndex]   = useState(0)
  const [emailFlow, setEmailFlow]     = useState(null)   // null | 'sending' | 'sent'
  const [emailSent, setEmailSent]     = useState(false)
  const [postcardSent, setPostcardSent] = useState(false)
  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [email, setEmail]             = useState('')
  const [address, setAddress]         = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [confirmed, setConfirmed]     = useState(null)
  const [showUnit, setShowUnit]       = useState(false)
  const [unit, setUnit]               = useState('')
  // Project-cost mode: 'fixed' (specific $), 'per_watt' (cost-per-watt × system size kW), 'none' (slider)
  const [costMode, setCostMode]         = useState('none')
  const [cost, setCost]                 = useState('')
  const [costPerWatt, setCostPerWatt]   = useState('')   // $/W typical 2.50–4.50
  const [systemKw, setSystemKw]         = useState('')   // system size in kW
  const [loanSliderAmt, setLoanSliderAmt] = useState(APPROVED_LOAN_MAX) // for 'none' mode
  // Demo: which verification path to show in results — 'pass' | 'partial' | 'decline'
  const [verifyMode, setVerifyMode]     = useState('pass')
  // "More" menu in the result sticky header (Preview email / postcard / Download PDF)
  const [moreOpen, setMoreOpen]         = useState(false)
  // Verification strip — which check is expanded (null = none)
  const [verifyOpenIdx, setVerifyOpenIdx] = useState(null)
  // Loan-amount slider on the result screen (rep can fine-tune post-prescreen)
  const [resultLoanAmt, setResultLoanAmt] = useState(LOAN_MID)
  // Push slider value into the demo session so downstream offer/application pick it up
  useEffect(() => {
    if (resultLoanAmt) setDemoSession({ requestedLoanAmount: String(resultLoanAmt) })
  }, [resultLoanAmt])
  const dropdownRef                     = useRef(null)
  const moreRef                         = useRef(null)

  // Compute the final project cost from mode (used downstream)
  const computedProjectCost = (() => {
    if (costMode === 'fixed') return Number(cost) || 0
    if (costMode === 'per_watt') return Math.round((Number(costPerWatt) || 0) * (Number(systemKw) || 0) * 1000)
    return 0
  })()
  // Final loan amount — equals project cost in fixed/per-watt modes, slider value otherwise
  const computedLoanAmount = costMode === 'none' ? loanSliderAmt : computedProjectCost

  // Standard + Recommended plan calculations — use the live loan amount from
  // whatever the rep entered in the modal so the plan cards (and downstream
  // Offer / Application screens) all stay consistent.
  const liveProfile = useMemo(() => ({
    ...DEMO_PROFILE,
    // On the result step the slider drives the amount; otherwise fall back to
    // whatever the cost-mode produced (fixed / per-watt) or the static default.
    drawAmt: step === 'result'
      ? (resultLoanAmt || computedLoanAmount || DEMO_PROFILE.drawAmt)
      : (computedLoanAmount || DEMO_PROFILE.drawAmt),
  }), [step, resultLoanAmt, computedLoanAmount])
  const planPreset        = DEFAULT_RECOMMENDED_PRESET
  const standardResult    = useMemo(() => computePresetCalc(STANDARD_PRESET, liveProfile), [liveProfile])
  const recommendedResult = useMemo(() => computePresetCalc(planPreset, liveProfile),     [planPreset, liveProfile])
  const recommendedPhases = useMemo(() => derivePresetPhases(recommendedResult, planPreset), [recommendedResult, planPreset])

  // Build full offer objects (matches the application Step 2 OfferTile shape)
  const standardOffer = useMemo(() => standardResult
    ? computeOffer({ C: liveProfile.drawAmt, rate: standardResult.rate, preset: STANDARD_PRESET })
    : null, [liveProfile, standardResult])
  const recommendedOffer = useMemo(() => recommendedResult
    ? computeOffer({ C: liveProfile.drawAmt, rate: recommendedResult.rate, preset: planPreset })
    : null, [liveProfile, recommendedResult, planPreset])
  const standardFive  = standardOffer ? computeFiveYearTotal(standardOffer) : 0
  const offerMaxY = useMemo(() => {
    if (!standardOffer || !recommendedOffer) return 0
    return Math.max(...standardOffer.schedule.slice(0, 120), ...recommendedOffer.schedule.slice(0, 120))
  }, [standardOffer, recommendedOffer])

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const addressValid = !!confirmed || address.trim().length >= 5
  const canSubmit  = firstName.trim() && lastName.trim() && emailValid && addressValid
  const progress   = ((stageIndex + 1) / STAGES.length) * 100

  // Stage cycling during loading — also fires the pipeline insertion callback
  useEffect(() => {
    if (step !== 'loading') return
    setStageIndex(0)
    const timers = STAGES.map((_, i) => {
      if (i === 0) return null
      return setTimeout(() => setStageIndex(i), i * 800)
    }).filter(Boolean)
    timers.push(setTimeout(() => {
      setStep('result')
      // Seed the result slider with whatever cost mode produced (or full cap)
      setResultLoanAmt(computedLoanAmount || LOAN_MID)
      // Notify parent so the new lead lands at the top of the CRM list
      if (onPrescreenComplete) {
        const cityState = confirmed ? `${confirmed.city}, ${confirmed.state}` : (address.split(',').slice(1).join(',').trim() || 'Unknown')
        const monthlyN  = standardResult ? Math.round(standardResult.calc.B) : 520
        onPrescreenComplete({
          name:     `${firstName.trim()} ${lastName.trim()}`,
          email:    email.trim(),
          address:  confirmed?.full || address.trim(),
          location: cityState,
          amount:   `$${(computedLoanAmount || 0).toLocaleString()}`,
          monthly:  `$${monthlyN.toLocaleString()}/mo`,
          fiveYear: `$${Math.round(monthlyN * 60).toLocaleString()}`,
        })
      }
    }, STAGES.length * 800 + 200))
    return () => timers.forEach(clearTimeout)
  }, [step]) // eslint-disable-line

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSuggestions([])
      if (moreRef.current     && !moreRef.current.contains(e.target))     setMoreOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleAddressChange(val) {
    setAddress(val)
    setConfirmed(null)
    if (val.trim().length >= 3) {
      const lower    = val.toLowerCase()
      const filtered = ADDRESS_SUGGESTIONS.filter(s => s.full.toLowerCase().includes(lower))
      setSuggestions(filtered.length > 0 ? filtered : ADDRESS_SUGGESTIONS.slice(0, 4))
    } else {
      setSuggestions([])
    }
  }

  function selectAddress(s) { setAddress(s.full); setConfirmed(s); setSuggestions([]) }
  function handleSubmit() {
    if (!canSubmit) return
    // Persist what the merchant entered so every downstream demo screen
    // (email preview, solar calculator, application) reads the same identity.
    const addrParts = (confirmed?.full || address).split(',').map(s => s.trim())
    const street    = confirmed?.street || addrParts[0] || ''
    const city      = confirmed?.city   || addrParts[1] || ''
    const stateZip  = (confirmed?.stateZip || addrParts[2] || '').split(/\s+/)
    const stateAb   = confirmed?.state || stateZip[0] || ''
    const zip       = confirmed?.zip   || stateZip[1] || ''
    setDemoSession({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim(),
      address:   street,
      city,
      state:     stateAb,
      zip,
      unit:      unit.trim(),
      // Project cost + final loan amount flow into the application Step 1 form
      projectCost:         computedProjectCost ? String(computedProjectCost) : '',
      requestedLoanAmount: String(computedLoanAmount),
    })
    setStep('loading')
  }
  function resetForm() {
    setStep('form'); setStageIndex(0)
    setFirstName(''); setLastName(''); setEmail('')
    setAddress(''); setSuggestions([]); setConfirmed(null)
    setShowUnit(false); setUnit('')
    setCostMode('none'); setCost(''); setCostPerWatt(''); setSystemKw('')
    setLoanSliderAmt(APPROVED_LOAN_MAX); setVerifyMode('pass')
    setEmailFlow(null); setEmailSent(false); setPostcardSent(false)
  }

  // Send-email demo flow: idle → sending (~1.6s) → sent
  function handleSendEmail() {
    if (emailFlow === 'sending') return
    setEmailFlow('sending')
    setTimeout(() => {
      setEmailFlow('sent')
      setEmailSent(true)
    }, 1600)
  }
  function handleViewEmailDemo() {
    setEmailFlow(null)
    onClose()
    navigate('/email')
  }
  function handleSendPostcard() {
    if (postcardSent) return
    setPostcardSent(true)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={step === 'loading' ? undefined : onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`relative bg-white rounded-lg shadow-2xl w-full ${step === 'result' ? 'max-w-4xl' : 'max-w-md'} flex flex-col max-h-[90vh] overflow-hidden`}>

          {/* ─── FORM ─── */}
          {step === 'form' && (<>
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Quick Prescreen</h2>
                <p className="text-sm text-gray-400 mt-0.5">Run an instant prescreen for one homeowner</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4 mt-0.5">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Homeowner</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">First Name <span className="text-red-400">*</span></label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Sarah"
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Last Name <span className="text-red-400">*</span></label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Johnson"
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">Email Address <span className="text-red-400">*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sarah@email.com"
                    className={`border rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/20 transition-colors
                      ${email && !emailValid ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-gray-400'}`} />
                  {email && !emailValid && <p className="text-xs text-red-500">Please enter a valid email address</p>}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Property Address</div>
                <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                  <label className="text-xs font-medium text-gray-600">Home Address <span className="text-red-400">*</span></label>
                  <input value={address} onChange={e => handleAddressChange(e.target.value)}
                    placeholder="Start typing an address…" autoComplete="off"
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400" />
                  <p className="text-xs text-gray-400">City, state, and ZIP will fill automatically when you select an address</p>
                  {suggestions.length > 0 && (
                    <div className="absolute top-[68px] left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                      {suggestions.map((s, i) => (
                        <button key={i} onMouseDown={() => selectAddress(s)}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-2">
                          <span className="text-gray-300 text-xs">📍</span>{s.full}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {confirmed && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-green-500">✅</span>
                    <span className="text-sm font-medium text-gray-700">{confirmed.city} · {confirmed.state} · {confirmed.zip}</span>
                  </div>
                )}
                {!showUnit ? (
                  <button onClick={() => setShowUnit(true)} className="text-xs text-blue-600 hover:text-blue-800 text-left w-fit">
                    + Add unit or apartment number
                  </button>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">Unit / Apt Number</label>
                    <div className="flex items-center gap-2">
                      <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. Apt 4B"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400" />
                      <button onClick={() => { setShowUnit(false); setUnit('') }} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">Remove</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Cost</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'fixed',    label: 'Fixed Amount',  desc: 'Enter total project cost' },
                    { key: 'per_watt', label: 'Solar — $/W',    desc: '$/W × system size (kW)' },
                    { key: 'none',     label: 'No Cost Input', desc: 'Pick loan amount on slider' },
                  ].map(opt => {
                    const active = costMode === opt.key
                    return (
                      <button key={opt.key} onClick={() => setCostMode(opt.key)}
                        className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all"
                        style={{
                          background: active ? 'rgba(37,75,206,0.06)' : '#fff',
                          borderColor: active ? '#254BCE' : '#E5E7EB',
                          boxShadow: active ? '0 0 0 1px #254BCE' : 'none',
                        }}
                      >
                        <span className="text-[12px] font-semibold leading-tight" style={{color: active ? '#254BCE' : '#374151'}}>{opt.label}</span>
                        <span className="text-[10px] leading-tight text-gray-400">{opt.desc}</span>
                      </button>
                    )
                  })}
                </div>
                {costMode === 'fixed' && (
                  <div className="flex flex-col gap-1">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 50,000"
                        className="w-48 border border-gray-200 rounded-md pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                    <p className="text-[11px] text-gray-400">Total turnkey cost the installer quoted (panels, inverter, install, permits).</p>
                  </div>
                )}
                {costMode === 'per_watt' && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input type="number" step="0.01" value={costPerWatt} onChange={e => setCostPerWatt(e.target.value)} placeholder="3.20"
                          className="w-32 border border-gray-200 rounded-md pl-7 pr-12 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">/W</span>
                      </div>
                      <span className="text-xs text-gray-400">×</span>
                      <div className="relative">
                        <input type="number" step="0.1" value={systemKw} onChange={e => setSystemKw(e.target.value)} placeholder="8.5"
                          className="w-28 border border-gray-200 rounded-md pl-3 pr-10 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">kW</span>
                      </div>
                      {computedProjectCost > 0 && (
                        <span className="text-xs text-gray-700 ml-2">
                          = <span className="font-semibold tabular-nums">${computedProjectCost.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">Industry-standard solar pricing: cost per watt (typically $2.50–$4.50) multiplied by system size in kilowatts.</p>
                  </div>
                )}
                {costMode === 'none' && (
                  <p className="text-[11px] text-gray-400">Maximum eligible loan will be calculated from equity and credit profile.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex flex-col gap-3">
              {/* Credit cost notice */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span className="text-xs text-gray-500">This will use <span className="font-semibold text-gray-900">1 credit</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-14 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width:`${Math.round((QUOTA.user.monthlyRemaining/QUOTA.user.monthlyTotal)*100)}%`}} />
                  </div>
                  <span className={`text-xs font-semibold  ${QUOTA.user.monthlyRemaining <= 10 ? 'text-amber-600' : 'text-gray-700'}`}>
                    {QUOTA.user.monthlyRemaining - 1} remaining after
                  </span>
                </div>
              </div>
              {!canSubmit && <p className="text-xs text-gray-400 text-center">Fill in all required fields to continue</p>}
              <button onClick={handleSubmit} disabled={!canSubmit}
                className={`w-full py-3 rounded-md text-sm font-semibold transition-all
                  ${canSubmit ? 'text-white cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                style={canSubmit ? {background:'#001660'} : {}}>
                Run Prescreen →
              </button>
            </div>
          </>)}

          {/* ─── LOADING ─── */}
          {step === 'loading' && (<>
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Quick Prescreen</h2>
              <p className="text-sm text-gray-400 mt-0.5">{firstName} {lastName}</p>
            </div>

            {/* Animated progress bar — full width, flush */}
            <div className="h-1 bg-gray-100 shrink-0">
              <div className="h-full bg-gray-900 transition-all duration-700 ease-in-out" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 gap-5">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
              <p className="text-sm  text-gray-600">{STAGES[stageIndex]}</p>
            </div>
          </>)}

          {/* ─── RESULT ─── */}
          {step === 'result' && (<>
            {/* Email-send overlay (sits on top of the result content) */}
            {emailFlow && (
              <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center px-8 py-10 gap-5 rounded-lg">
                {emailFlow === 'sending' && (
                  <>
                    <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                    <div className="text-center">
                      <div className="text-base font-semibold text-gray-900">Sending email…</div>
                      <div className="text-sm text-gray-500 mt-1">Delivering the Standard plan offer to <span className="font-medium text-gray-700">{email}</span></div>
                    </div>
                  </>
                )}
                {emailFlow === 'sent' && (
                  <>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background:'rgba(1,97,99,0.12)'}}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#016163" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">Email sent</div>
                      <div className="text-sm text-gray-500 mt-1">Offer delivered to <span className="font-medium text-gray-700">{email}</span></div>
                    </div>
                    <div className="flex flex-col items-center gap-2 mt-1">
                      <button onClick={() => setEmailFlow(null)}
                        className="py-2.5 px-6 text-white rounded-md text-sm font-semibold transition-colors"
                        style={{background:'#254BCE'}}
                        onMouseEnter={e => e.currentTarget.style.background = '#1e3fa8'}
                        onMouseLeave={e => e.currentTarget.style.background = '#254BCE'}>
                        Close
                      </button>
                      <button
                        onClick={handleViewEmailDemo}
                        className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors"
                      >
                        Demo: view the email the customer received →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="border-b border-gray-100 shrink-0">
              <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-900">{firstName} {lastName}</h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(1,97,99,0.1)', color: '#016163' }}>Pre-qualified for HELOC</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5 truncate">{address}</p>
                  {/* Verification dots — under the address */}
                  <div className="mt-2.5">
                    <VerificationDots mode={verifyMode} openIdx={verifyOpenIdx} setOpenIdx={setVerifyOpenIdx} />
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">✕</button>
              </div>
              {/* Expanded detail — full-width below the header row */}
              <VerificationDetail mode={verifyMode} openIdx={verifyOpenIdx} onClose={() => setVerifyOpenIdx(null)} />
              <div className="h-2" />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Actions — sticky header. Hidden only while the email-send overlay
                  is open (sending / sent confirmation) so it doesn't show through. */}
              {!emailFlow && <>
              <div className="sticky top-0 z-10 px-6 py-4 flex flex-col gap-2 bg-white border-b border-gray-100">
              <div className="flex items-center gap-3">

                {/* PRIMARY GROUP: View in CRM (main) + Run Another (secondary) */}
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={onClose}
                    className="py-2.5 px-4 text-white rounded-md text-xs font-semibold whitespace-nowrap transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    style={{background:'#254BCE'}}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e3fa8'}
                    onMouseLeave={e => e.currentTarget.style.background = '#254BCE'}>
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="15" height="15" className="shrink-0">
                      <path d="M3 3.75a3 3 0 1 0 6 0 3 3 0 1 0 -6 0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                      <path d="M9.674 9.75A5.25 5.25 0 0 0 0.75 13.5v2.25H3l0.75 7.5h4.5l0.285 -2.85" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                      <path d="M10.5 15.75a5.25 5.25 0 1 0 10.5 0 5.25 5.25 0 1 0 -10.5 0Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                      <path d="m23.25 23.25 -3.788 -3.788" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                    </svg>
                    View in CRM
                  </button>
                  <button onClick={resetForm}
                    className="py-2.5 px-4 bg-white border border-gray-200 text-gray-800 rounded-md text-xs font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-0.75 -1.6731 24 24" width="15" height="15" className="shrink-0">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M17.068846153846156 14.920096153846155c-1.0917692307692308 1.7131153846153846 -2.764817307692308 2.975019230769231 -4.712019230769231 3.553875 -1.9472019230769233 0.5789423076923077 -4.037919230769231 0.4359807692307693 -5.88825 -0.40249038461538467 -1.8503307692307693 -0.8384711538461539 -3.3361096153846153 -2.316288461538462 -4.184567307692308 -4.162067307692308 -0.8484576923076923 -1.845778846153846 -1.0026432692307692 -3.935682692307693 -0.43425 -5.886 0.5683932692307693 -1.9503173076923077 1.8212192307692308 -3.6301500000000004 3.5284586538461538 -4.731118269230769C7.085457692307693 2.191335576923077 9.132576923076924 1.7431442307692309 11.143644230769231 2.030010576923077c2.011067307692308 0.28686634615384615 3.8512211538461543 1.289526923076923 5.182528846153846 2.823914423076923 1.3313942307692308 1.5343788461538463 2.064548076923077 3.497503846153846 2.0649807692307696 5.528959615384616v1.9497115384615387" strokeWidth="2"/>
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="m20.98730769230769 9.733846153846153 -2.5961538461538463 2.5961538461538463 -2.5961538461538463 -2.5961538461538463" strokeWidth="2"/>
                    </svg>
                    Run Another
                  </button>
                </div>

                {/* OUTREACH GROUP: Email + Mail Postcard */}
                <div className="flex gap-1.5 shrink-0">
                    {/* Email Offer */}
                    <button
                      onClick={handleSendEmail}
                      disabled={emailFlow === 'sending'}
                      title="Email the Standard plan offer to the customer"
                      className={`py-2.5 px-4 text-xs font-semibold border rounded-md transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                        emailSent
                          ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {emailSent ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="15" height="15" className="shrink-0">
                          <path d="M2.759 15.629a1.664 1.664 0 0 1 -0.882 -3.075L20.36 1a1.663 1.663 0 0 1 2.516 1.72l-3.6 19.173a1.664 1.664 0 0 1 -2.966 0.691l-5.21 -6.955Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                          <path d="M11.1 15.629H8.6V20.8a1.663 1.663 0 0 0 2.6 1.374l3.178 -2.166Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                          <path d="m11.099 15.629 11.08 -14.59" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                        </svg>
                      )}
                      {emailSent ? 'Email Sent' : 'Email Offer'}
                    </button>

                    {/* Mail Postcard */}
                    <button
                      onClick={handleSendPostcard}
                      title="Mail the Standard plan offer as a postcard"
                      className={`py-2.5 px-4 text-xs font-semibold border rounded-md transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                        postcardSent
                          ? 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                      }`}
                    >
                      {postcardSent ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="15" height="15" className="shrink-0">
                          <path d="M2.25 4.25h19.5s1.5 0 1.5 1.5v12.5s0 1.5 -1.5 1.5H2.25s-1.5 0 -1.5 -1.5V5.75s0 -1.5 1.5 -1.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                          <path d="m4.5 12.25 3.75 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                          <path d="m4.5 15.75 8.25 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                          <path d="M16 7.75h3s0.75 0 0.75 0.75v3s0 0.75 -0.75 0.75h-3s-0.75 0 -0.75 -0.75v-3s0 -0.75 0.75 -0.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
                        </svg>
                      )}
                      {postcardSent ? 'Postcard Mailed' : 'Mail Postcard'}
                    </button>
                  </div>

                  {/* "More" menu — pinned to the far right of the action row */}
                  <div ref={moreRef} className="relative ml-auto">
                    <button
                      onClick={() => setMoreOpen(o => !o)}
                      title="More actions"
                      className="py-2.5 px-3 text-xs font-semibold border rounded-md transition-colors whitespace-nowrap inline-flex items-center gap-1.5 bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                    >
                      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
                        <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                      </svg>
                      More
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {moreOpen && (
                      <div className="absolute right-0 top-full mt-1 z-20 rounded-md overflow-hidden"
                        style={{ minWidth: 200, background:'#fff', border:'1px solid rgba(0,22,96,0.1)', boxShadow:'0 8px 24px rgba(0,22,96,0.14)' }}>
                        {[
                          {
                            label: 'Preview email',
                            onClick: () => { setMoreOpen(false); handleViewEmailDemo() },
                            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
                          },
                          {
                            label: 'Preview postcard',
                            onClick: () => setMoreOpen(false),
                            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>,
                          },
                          {
                            label: 'Download PDF',
                            onClick: () => setMoreOpen(false),
                            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>,
                          },
                        ].map(it => (
                          <button key={it.label} onClick={it.onClick}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] font-medium transition-colors"
                            style={{ color:'#001660', borderBottom:'1px solid rgba(0,22,96,0.05)' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(0,22,96,0.04)'}
                            onMouseOut={e  => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ color:'rgba(0,22,96,0.55)' }}>{it.icon}</span>
                            {it.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
              </>}

              {/* Scrollable body — content under the sticky header */}
              <div className="px-6 py-6 flex flex-col gap-6">

              {/* Pre-qualified loan range — interactive slider, always shown.
                  Initialized to whatever the rep entered (Fixed / Solar $/W) or the
                  midpoint when no cost was specified. The rep can adjust during the call. */}
              {(() => {
                // Compute Standard-plan monthly at a given draw amount so the
                // anchors below the slider show the payment range in real time.
                const stdMonthlyAt = (amt) => {
                  const r = computePresetCalc(STANDARD_PRESET, { ...DEMO_PROFILE, drawAmt: amt })
                  return r ? Math.round(r.calc.B) : 0
                }
                const minMo = stdMonthlyAt(LOAN_MIN)
                const maxMo = stdMonthlyAt(APPROVED_LOAN_MAX)
                const PRESETS = [30000, 75000, 150000]
                return (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
                    {/* Header — section name + live amount */}
                    <div className="flex items-baseline justify-between">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pre-qualified loan amount</div>
                      <span className="text-2xl font-bold tabular-nums" style={{color:'#001660'}}>${resultLoanAmt.toLocaleString()}</span>
                    </div>

                    {/* Quick presets — top row, left aligned */}
                    <div className="flex items-center gap-1.5">
                      {PRESETS.map(p => {
                        const active = resultLoanAmt === p
                        return (
                          <button key={p} onClick={() => setResultLoanAmt(p)}
                            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors tabular-nums"
                            style={{
                              background: active ? 'rgba(37,75,206,0.08)' : '#fff',
                              color:      active ? '#254BCE' : 'rgba(0,22,96,0.6)',
                              border: `1px solid ${active ? 'rgba(37,75,206,0.35)' : 'rgba(0,22,96,0.12)'}`,
                            }}>
                            ${(p/1000)}K
                          </button>
                        )
                      })}
                    </div>

                    {/* Slider — full width, on its own row */}
                    <input type="range" min={LOAN_MIN} max={APPROVED_LOAN_MAX} step={1000}
                      value={resultLoanAmt} onChange={e => setResultLoanAmt(Number(e.target.value))}
                      className="w-full accent-[#254BCE] block" />

                    {/* Min/max payment anchors — /mo is the headline, total loan is the sub-label */}
                    <div className="flex items-start justify-between tabular-nums">
                      <div className="flex flex-col">
                        <span className="text-base font-bold" style={{color:'#001660'}}>~${minMo.toLocaleString()}<span className="text-gray-400 font-semibold text-xs">/mo</span></span>
                        <span className="text-[11px] text-gray-400 mt-0.5">${LOAN_MIN.toLocaleString()}<span className="text-gray-300"> min</span></span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-base font-bold" style={{color:'#001660'}}>~${maxMo.toLocaleString()}<span className="text-gray-400 font-semibold text-xs">/mo</span></span>
                        <span className="text-[11px] text-gray-400 mt-0.5">${APPROVED_LOAN_MAX.toLocaleString()}<span className="text-gray-300"> max approved</span></span>
                      </div>
                    </div>

                  </div>
                )
              })()}

              {/* Section header for the two-plan area */}
              <div className="flex items-baseline justify-between -mb-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loan plans</div>
                <span className="text-[10px] text-gray-400">2 plans generated</span>
              </div>

              {/* Plan tiles — same shape, content & style as the application Step 2 */}
              <div className="grid grid-cols-2 gap-3">
                {standardOffer && (
                  <OfferTile
                    kind="baseline"
                    offer={standardOffer}
                    isSelected={false}
                    onSelect={() => {}}
                    maxY={offerMaxY}
                    standardMonthly={Math.round(standardOffer.monthly)}
                    standardFive={standardFive}
                    hideAction
                  />
                )}
                {recommendedOffer && (
                  <OfferTile
                    kind="recommended"
                    offer={recommendedOffer}
                    isSelected={false}
                    onSelect={() => {}}
                    maxY={offerMaxY}
                    standardMonthly={standardOffer ? Math.round(standardOffer.monthly) : null}
                    standardFive={standardFive}
                    hideAction
                  />
                )}
              </div>

              {/* Inline email offer preview — scrollable iframe-like view of the real email */}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Email offer preview</div>
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                  <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    <EmailPreview hideClientChrome loanAmountOverride={resultLoanAmt} />
                  </div>
                </div>
              </div>

              </div> {/* /scrollable body */}
            </div>
          </>)}

        </div>
      </div>
    </>
  )
}

/* ─── Inline email-offer preview shown beneath the plan cards ─────────── */
function EmailOfferPreview({ firstName, email, loanAmount, monthly, onSendEmail, emailSent, emailFlow }) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,'
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email offer preview</div>
        <span className="text-[10px] text-gray-400">What the homeowner will see</span>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        {/* Email client chrome */}
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3 text-xs">
          <span className="font-semibold text-gray-700 truncate">From: Westhaven Power</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500 truncate">To: {email || 'homeowner@email.com'}</span>
          <span className="ml-auto text-gray-400 hidden sm:inline">Today, 9:14 AM</span>
        </div>
        <div className="px-5 py-2.5 border-b border-gray-100">
          <div className="text-sm font-bold text-gray-900">
            {firstName || 'There'}, you're pre-qualified for a {loanAmount ? `$${loanAmount.toLocaleString()} ` : ''}HELOC
          </div>
        </div>
        {/* Body — compact */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="text-sm text-gray-700 leading-relaxed">
            {greeting} good news — your home qualifies for solar financing through GreenLyne.
            Here's what your monthly payment looks like:
          </div>
          <div className="grid grid-cols-3 gap-3 py-3 px-4 rounded-lg bg-gray-50 border border-gray-100">
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">You can borrow</div>
              <div className="text-base font-bold text-gray-900 tabular-nums mt-0.5">${(loanAmount || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Monthly</div>
              <div className="text-base font-bold text-gray-900 tabular-nums mt-0.5">${(monthly || 0).toLocaleString()}/mo</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">5-yr total</div>
              <div className="text-base font-bold text-gray-900 tabular-nums mt-0.5">${((monthly || 0) * 60).toLocaleString()}</div>
            </div>
          </div>
          <div className="text-[12px] text-gray-500 leading-relaxed">
            Tap below to view your full offer and start your application — soft credit only, no impact on your score.
          </div>
        </div>
        {/* CTA strip */}
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white" style={{background:'#254BCE'}}>
            View my offer →
          </div>
          <button
            onClick={onSendEmail}
            disabled={emailFlow === 'sending'}
            className={`text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
              emailSent ? 'text-emerald-700' : 'text-gray-700 hover:text-blue-700'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {emailSent ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Email sent
              </>
            ) : (
              <>Send this email →</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Verification breakdown — pass / partial / decline ───────────────── */
// Verification rows by demo scenario
const VERIFICATION_DATA = {
  pass: [
    { label: 'Address',     state: 'pass', detail: 'Property record matched on first lookup.' },
    { label: 'Max CLTV',    state: 'pass', detail: 'Combined loan-to-value 69% — well within 85% cap.' },
    { label: 'Credit check', state: 'pass', detail: 'FICO 724 · DTI 31% — meets all thresholds.' },
    { label: 'Loan Offer',  state: 'pass', detail: 'Offer generated successfully.' },
  ],
  partial: [
    { label: 'Address',     state: 'pass', detail: 'Property record matched on first lookup.' },
    { label: 'Max CLTV',    state: 'warn', detail: 'CLTV 81% — at limit. Loan amount capped to keep you in policy.' },
    { label: 'Credit check', state: 'warn', detail: 'DTI 41% — borderline. Manual review recommended before close.' },
    { label: 'Loan Offer',  state: 'pass', detail: 'Conditional offer generated — see notes.' },
  ],
  decline: [
    { label: 'Address',     state: 'pass', detail: 'Property record matched on first lookup.' },
    { label: 'Max CLTV',    state: 'fail', detail: 'CLTV 92% — above 85% maximum. Insufficient equity.' },
    { label: 'Credit check', state: 'warn', detail: 'DTI 44% — above target.' },
    { label: 'Loan Offer',  state: 'fail', detail: 'Could not generate an offer at this time.' },
  ],
}

const TONES = {
  pass: { color:'#016163', bg:'rgba(1,97,99,0.08)',     border:'rgba(1,97,99,0.25)',    label:'Passed'   },
  warn: { color:'#D97706', bg:'rgba(245,158,11,0.08)',  border:'rgba(245,158,11,0.3)',  label:'Partial'  },
  fail: { color:'#DC2626', bg:'rgba(220,38,38,0.06)',   border:'rgba(220,38,38,0.28)',  label:'Failed'   },
}

/** Just the dot+label row — placed in the top-right of the header.
 *  Open-state is lifted to the parent so the detail card can render in its own slot. */
function VerificationDots({ mode, openIdx, setOpenIdx }) {
  const rows = VERIFICATION_DATA[mode] || VERIFICATION_DATA.pass
  return (
    <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
      {rows.map((r, i) => {
        const t = TONES[r.state]
        const isOpen = openIdx === i
        return (
          <button key={r.label}
            onClick={() => setOpenIdx(isOpen ? null : i)}
            className="inline-flex items-center gap-1.5 transition-opacity"
            style={{
              background: 'transparent', border: 0, padding: 0,
              cursor: 'pointer', opacity: isOpen ? 1 : 0.95,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = 1 }}
            onMouseLeave={e => { e.currentTarget.style.opacity = isOpen ? 1 : 0.95 }}>
            {r.state === 'pass' ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0, boxShadow: isOpen ? `0 0 0 3px ${t.bg}` : 'none', transition: 'box-shadow .15s' }} />
            )}
            <span className="text-[11.5px] font-semibold" style={{ color: t.color, textDecoration: isOpen ? 'underline' : 'none', textUnderlineOffset: 3 }}>
              {r.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The expanded detail card — sits below the header, full-width. */
function VerificationDetail({ mode, openIdx, onClose }) {
  const rows = VERIFICATION_DATA[mode] || VERIFICATION_DATA.pass
  const open = openIdx != null ? rows[openIdx] : null
  if (!open) return null
  const t = TONES[open.state]
  return (
    <div className="mx-6 mt-3 flex items-start gap-2 px-3 py-2.5 rounded-md" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <span className="shrink-0 mt-0.5" style={{ color: t.color }}>
        {open.state === 'pass' ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : open.state === 'warn' ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <span className="text-[12.5px] font-bold" style={{ color: t.color }}>{open.label}</span>
            <span className="ml-2 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: t.color, opacity: 0.7 }}>{t.label}</span>
          </div>
          <button onClick={onClose} className="text-[10px]" style={{ color: t.color, opacity: 0.7, background: 'transparent', border: 0, cursor: 'pointer' }}>Close</button>
        </div>
        <div className="text-[12px] mt-1 leading-snug" style={{ color: '#374151' }}>{open.detail}</div>
      </div>
    </div>
  )
}

const IMPORT_HISTORY = [
  { request_uid: 'a1b2c3', file_name: 'homeowners_march.csv',   household_count: 500, homeowner_count_with_offer: 312, status: 'OFFER_GENERATION_DONE',        created_at: 'Mar 8, 2026' },
  { request_uid: 'd4e5f6', file_name: 'miami_westside_feb.csv', household_count: 280, homeowner_count_with_offer: 194, status: 'OFFER_GENERATION_DONE',        created_at: 'Feb 21, 2026' },
  { request_uid: 'g7h8i9', file_name: 'austin_north_q1.csv',   household_count: 740, homeowner_count_with_offer: 0,   status: 'OFFER_GENERATION_IN_PROGRESS', created_at: 'Feb 14, 2026' },
  { request_uid: 'j0k1l2', file_name: 'dallas_suburbs.csv',    household_count: 155, homeowner_count_with_offer: 88,  status: 'OFFER_GENERATION_DONE',        created_at: 'Jan 30, 2026' },
  { request_uid: 'm3n4o5', file_name: 'phoenix_dec_batch.csv', household_count: 620, homeowner_count_with_offer: 401, status: 'OFFER_GENERATION_DONE',        created_at: 'Dec 12, 2025' },
]

function statusBadge(status) {
  if (status === 'OFFER_GENERATION_DONE')        return <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Done</span>
  if (status === 'OFFER_GENERATION_IN_PROGRESS') return <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Processing</span>
  return <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Uploaded</span>
}

// Step 2 mock validation result — uses real column names from csv_service.py
const MOCK_VALIDATION = {
  row_count: 500,
  checks: [
    { ok: true,  warn: false, msg: '500 rows detected' },
    { ok: true,  warn: false, msg: 'All required columns found' },
    { ok: false, warn: true,  msg: '12 rows are missing an email address' },
  ],
  columns: [
    { name: 'First Name',  official: 'first_name', required: true,  status: 'found',   issue_rows: 0 },
    { name: 'Last Name',   official: 'last_name',  required: true,  status: 'found',   issue_rows: 0 },
    { name: 'Address',     official: 'address',    required: true,  status: 'found',   issue_rows: 0 },
    { name: 'City',        official: 'city',       required: true,  status: 'found',   issue_rows: 0 },
    { name: 'State',       official: 'state',      required: true,  status: 'found',   issue_rows: 0 },
    { name: 'ZIP Code',    official: 'zipcode',    required: true,  status: 'found',   issue_rows: 0 },
    { name: 'Email',       official: 'email',      required: false, status: 'warning', issue_rows: 12 },
    { name: 'Phone',       official: 'phone',      required: false, status: 'found',   issue_rows: 0 },
  ],
}

const MOCK_CSV_LEADS = [
  { id:  1, name: 'Marcus Thompson',   address: '1842 Oak Hill Dr',    city: 'Phoenix, AZ 85001',   email: 'marcus.t@gmail.com',      warn: false },
  { id:  2, name: 'Jane Foster',       address: '77 Palm Ave',         city: 'Phoenix, AZ 85004',   email: 'jane.foster@outlook.com', warn: false },
  { id:  3, name: 'Alex Ray',          address: '12 Oak Street',       city: 'Phoenix, AZ 85009',   email: '',                        warn: true  },
  { id:  4, name: 'Olivia Chen',       address: '998 Canyon Rd',       city: 'Phoenix, AZ 85016',   email: 'olivia.c@icloud.com',     warn: false },
  { id:  5, name: 'James Patel',       address: '334 Saguaro Blvd',    city: 'Phoenix, AZ 85021',   email: 'jpatel@email.com',        warn: false },
  { id:  6, name: 'Maria Gonzalez',    address: '221 Cactus Dr',       city: 'Phoenix, AZ 85031',   email: 'mgonzalez@yahoo.com',     warn: false },
  { id:  7, name: 'Robert Kim',        address: '540 Desert Rose Ln',  city: 'Scottsdale, AZ 85251',email: 'rkim@proton.me',          warn: false },
  { id:  8, name: 'Sandra Ortiz',      address: '8821 W Bell Rd',      city: 'Glendale, AZ 85308',  email: '',                        warn: true  },
  { id:  9, name: 'David Nguyen',      address: '110 E Camelback Rd',  city: 'Phoenix, AZ 85012',   email: 'dnguyen@gmail.com',       warn: false },
  { id: 10, name: 'Patricia Williams', address: '3305 N 7th Ave',      city: 'Phoenix, AZ 85013',   email: 'pwilliams@email.com',     warn: false },
  { id: 11, name: 'Kevin Moore',       address: '2211 S Rural Rd',     city: 'Tempe, AZ 85282',     email: 'kmoore@outlook.com',      warn: false },
  { id: 12, name: 'Lisa Anderson',     address: '776 W Southern Ave',  city: 'Mesa, AZ 85210',      email: 'landerson@gmail.com',     warn: false },
  { id: 13, name: 'Brian Harris',      address: '4490 E Thomas Rd',    city: 'Phoenix, AZ 85018',   email: '',                        warn: true  },
  { id: 14, name: 'Nancy Clark',       address: '655 N Dobson Rd',     city: 'Chandler, AZ 85224',  email: 'nclark@icloud.com',       warn: false },
  { id: 15, name: 'Jason Lewis',       address: '2009 W Chandler Blvd',city: 'Chandler, AZ 85224',  email: 'jlewis@yahoo.com',        warn: false },
]

function ImportCSVModal({ onClose, onBatchDone }) {
  const [step, setStep]         = useState('upload')
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile]         = useState(null)
  const [error, setError]       = useState('')
  const [rowCount, setRowCount] = useState(null)
  const inputRef                = useRef(null)

  function processFile(f) {
    if (!f) return
    if (!f.name.endsWith('.csv')) {
      setError('Please upload a .csv file')
      setFile(null); setRowCount(null)
      return
    }
    setError(''); setFile(f)
    setRowCount(Math.floor(f.size / 80) || 500)
  }

  function handleDrop(e) { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }
  function handleBrowse(e) { processFile(e.target.files[0]) }

  function handleDownloadTemplate() {
    const csv = 'first_name,last_name,address,city,state,zipcode,email,phone\nJohn,Doe,123 Main St,Phoenix,AZ,85001,john@example.com,5555550100\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'greenlyne_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleDownloadIssueRows() {
    const csv = 'first_name,last_name,address,city,state,zipcode,email,phone\nJane,Smith,456 Oak Ave,Austin,TX,78701,,5555550199\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'rows_with_issues.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const [batchName, setBatchName]       = useState('')
  const [costMode, setCostMode]         = useState('none')
  const [cost, setCost]                 = useState('')
  const [costPerArea, setCostPerArea]   = useState('')
  const [processed, setProcessed]       = useState(0)
  const [selectedIds, setSelectedIds] = useState(() => new Set(MOCK_CSV_LEADS.map(l => l.id)))

  // Email-send flow state for the Results step
  const [emailFlow, setEmailFlow]         = useState('idle')   // 'idle' | 'sending' | 'sent'
  const [emailSentAt, setEmailSentAt]     = useState(null)
  const [emailSentCount, setEmailSentCount] = useState(0)
  const [sendProgress, setSendProgress]   = useState(0)
  const [pendingTotal, setPendingTotal]   = useState(312)
  const [pendingLabel, setPendingLabel]   = useState('qualified leads')
  const [sendCount, setSendCount]         = useState(0)        // number of times email batch has been sent
  const [resendOpen, setResendOpen]       = useState(false)

  function startSend(total, label) {
    setPendingTotal(total)
    setPendingLabel(label)
    setResendOpen(false)
    setEmailFlow('sending')
  }

  // Pre-fill batch name from filename when file is selected
  useEffect(() => {
    if (file) setBatchName(file.name.replace(/\.csv$/i, '').replace(/[_-]/g, ' '))
  }, [file])

  // Processing animation — auto-advances to results when complete
  useEffect(() => {
    if (step !== 'processing') return
    setProcessed(0)
    const total    = validRows
    const duration = 3500 // ms
    const start    = Date.now()
    const interval = setInterval(() => {
      const pct = Math.min((Date.now() - start) / duration, 1)
      setProcessed(Math.round(pct * total))
      if (pct >= 1) {
        clearInterval(interval)
        setStep('results')
      }
    }, 80)
    return () => clearInterval(interval)
  }, [step])

  // Simulate sending the batch email — animates a progress overlay then lands on a success state.
  useEffect(() => {
    if (emailFlow !== 'sending') return
    setSendProgress(0)
    const total    = pendingTotal
    const duration = 3200
    const start    = Date.now()
    const interval = setInterval(() => {
      const pct = Math.min((Date.now() - start) / duration, 1)
      setSendProgress(Math.round(pct * total))
      if (pct >= 1) {
        clearInterval(interval)
        setEmailSentCount(total)
        setEmailSentAt(new Date())
        setSendCount(c => c + 1)
        setEmailFlow('sent')
      }
    }, 60)
    return () => clearInterval(interval)
  }, [emailFlow, pendingTotal])

  const canContinue  = file && !error
  const hasWarnings  = MOCK_VALIDATION.checks.some(c => c.warn)
  const hasBlocking  = MOCK_VALIDATION.columns.some(c => c.required && c.status === 'missing')

  const validRows   = MOCK_VALIDATION.row_count - MOCK_VALIDATION.columns.reduce((sum, c) => sum + (c.issue_rows || 0), 0)
  const skippedRows = MOCK_VALIDATION.row_count - validRows
  const quotaLeft   = 1247

  // Processing step derived values
  const pct         = validRows > 0 ? processed / validRows : 0
  const barFilled   = Math.round(pct * 20)
  const barEmpty    = 20 - barFilled
  const stageAddr   = pct > 0.25
  const stageEquity = pct > 0.60
  const stageDone   = processed >= validRows
  const quotaNow    = Math.max(quotaLeft - processed, 0)

  const STEP_LABELS = {
    upload:     'Step 1 of 5 — Upload your file',
    validate:   'Step 2 of 5 — Preview & Validate',
    settings:   'Step 3 of 5 — Batch Settings',
    processing: processed < validRows ? 'Running — you can close and keep working' : 'Done — see your results',
    results:    'Step 5 of 5 — Results',
  }

  function StageRow({ label, done, running }) {
    return (
      <div className="grid grid-cols-[10rem_1fr] gap-x-2">
        <span className="text-gray-500">{label}</span>
        {done
          ? <span className="text-green-500">✅</span>
          : running
            ? <span className="text-gray-500 animate-pulse">Running...</span>
            : <span className="text-gray-300">—</span>}
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={step === 'upload' ? onClose : undefined} />
        <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col overflow-y-auto max-h-[92vh]">

          {/* Sending overlay — covers the modal while emails go out */}
          {emailFlow === 'sending' && (
            <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-5 px-8 py-10 max-w-sm w-full text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{background:'rgba(37,75,206,0.08)', border:'2px solid rgba(37,75,206,0.18)'}}>
                  <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#254BCE" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                </div>
                <div>
                  <div className="text-base font-semibold" style={{color:'#001660'}}>Sending emails…</div>
                  <div className="text-sm text-gray-500 mt-1">Delivering personalized offers to your qualified leads.</div>
                </div>
                <div className="w-full">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{background:'rgba(0,22,96,0.08)'}}>
                    <div className="h-full transition-all duration-150" style={{background:'#254BCE', width:`${Math.round((sendProgress/Math.max(pendingTotal,1))*100)}%`}} />
                  </div>
                  <div className="mt-2 text-[12px] tabular-nums" style={{color:'#6B7280'}}>
                    {sendProgress.toLocaleString()} of {pendingTotal.toLocaleString()} sent
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import CSV</h2>
              <p className="text-sm text-gray-400 mt-0.5">{STEP_LABELS[step]}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none mt-0.5">✕</button>
          </div>

          {/* ── STEP 1: UPLOAD ── */}
          {step === 'upload' && (
            <>
              <div className="px-6 py-6 flex flex-col gap-4 overflow-y-auto">

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl px-6 py-10 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors
                    ${dragOver ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'}
                    ${file && !error ? 'border-green-400 bg-green-50' : ''}`}
                >
                  <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleBrowse} />
                  {file && !error ? (
                    <>
                      <span className="text-2xl">✅</span>
                      <p className="text-sm  text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                        {file.name} · {rowCount?.toLocaleString()} rows
                      </p>
                      <p className="text-xs text-gray-400">Click to replace</p>
                    </>
                  ) : (
                    <>
                      <span className="text-xl text-gray-400">↑</span>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">Drop your CSV here</span>{' '}or{' '}
                        <span className="text-blue-600 font-medium">Browse files</span>
                      </p>
                      <p className="text-xs text-gray-400">.csv files only</p>
                    </>
                  )}
                </div>

                {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><span>⚠</span> {error}</p>}

                <button onClick={e => { e.stopPropagation(); handleDownloadTemplate() }}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit">
                  <span>↓</span><span>Download template</span>
                </button>

                {/* Import history */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Import History</p>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    {IMPORT_HISTORY.map(item => (
                      <div key={item.request_uid} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-gray-300 text-base shrink-0">📄</span>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-800 font-medium truncate">{item.file_name}</p>
                            <p className="text-xs text-gray-400">{item.created_at} · {item.household_count.toLocaleString()} rows{item.homeowner_count_with_offer > 0 ? ` · ${item.homeowner_count_with_offer} offers` : ''}</p>
                          </div>
                        </div>
                        <div className="shrink-0 ml-3">{statusBadge(item.status)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 flex items-center justify-between gap-3 shrink-0">
                <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                <button onClick={() => canContinue && setStep('validate')} disabled={!canContinue}
                  className={`px-6 py-2.5 rounded-md text-sm font-semibold transition-colors
                    ${canContinue ? 'text-white hover:opacity-90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                  style={canContinue ? {background:'#001660'} : {}}>
                  Continue →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: VALIDATE ── */}
          {step === 'validate' && (
            <>
              <div className="px-6 py-6 flex flex-col gap-5 overflow-y-auto">

                {/* Summary checks */}
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-col gap-2">
                  {MOCK_VALIDATION.checks.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <span className="text-base leading-none">{c.ok ? '✅' : c.warn ? '⚠️' : '❌'}</span>
                      <span className={`text-sm  ${c.warn ? 'text-amber-700' : 'text-gray-700'}`}>{c.msg}</span>
                    </div>
                  ))}
                </div>

                {/* Column status table */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Column Status</p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Column</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_VALIDATION.columns.map((col, i) => (
                          <tr key={i} className={`border-b border-gray-50 last:border-0 ${col.status === 'warning' ? 'bg-amber-50/40' : ''}`}>
                            <td className="px-4 py-2.5 text-gray-700">
                              {col.name}
                              {!col.required && <span className="ml-1.5 text-xs text-gray-400">(optional)</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              {col.status === 'found' && (
                                <span className="flex items-center gap-1.5 text-emerald-700">
                                  <span>✅</span>
                                  <span>Found{!col.required ? ' (optional)' : ''}</span>
                                </span>
                              )}
                              {col.status === 'warning' && (
                                <span className="flex items-center gap-1.5 text-amber-700">
                                  <span>⚠️</span>
                                  <span>Missing in {col.issue_rows} rows</span>
                                </span>
                              )}
                              {col.status === 'missing' && (
                                <span className="flex items-center gap-1.5 text-red-600">
                                  <span>❌</span>
                                  <span>Column not found</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Download rows with issues */}
                {hasWarnings && (
                  <button onClick={handleDownloadIssueRows}
                    className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-800 transition-colors w-fit">
                    <span>↓</span><span>Download rows with issues</span>
                  </button>
                )}
              </div>

              <div className="px-6 pb-6 flex items-center justify-between gap-3 shrink-0 border-t border-gray-100 pt-4">
                <button onClick={() => setStep('upload')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back</button>
                {hasBlocking ? (
                  <button onClick={onClose} className="px-6 py-2.5 rounded-md text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                    Fix before continuing
                  </button>
                ) : (
                  <button onClick={() => setStep('settings')} className="px-6 py-2.5 rounded-md text-sm font-semibold text-white hover:opacity-90 transition-colors" style={{background:'#001660'}}>
                    Continue anyway →
                  </button>
                )}
              </div>
            </>
          )}

{/* ── STEP 5: PROCESSING ── */}
          {step === 'processing' && (
            <>
              <div className="px-6 py-6 flex flex-col gap-5 overflow-y-auto">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-5  text-[12px] flex flex-col gap-4">

                  {/* Header lines */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-500">Running prescreen...</span>
                    <span className="text-gray-900 font-semibold">{batchName}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">[</span>
                    <div className="flex-1 flex overflow-hidden">
                      <span className="text-gray-900">{'█'.repeat(barFilled)}</span>
                      <span className="text-gray-300">{'░'.repeat(barEmpty)}</span>
                    </div>
                    <span className="text-gray-400">]</span>
                    <span className="text-gray-700 shrink-0 text-right tabular-nums">
                      {processed.toLocaleString()} / {validRows.toLocaleString()}
                    </span>
                  </div>

                  {/* Stage checklist */}
                  <div className="flex flex-col gap-2 text-[11px]">
                    <StageRow label="Address verification" done={stageAddr}   running={!stageAddr} />
                    <StageRow label="Equity checks"        done={stageEquity} running={stageAddr && !stageEquity} />
                    <StageRow label="Credit checks"        done={stageDone}   running={stageEquity && !stageDone} />
                  </div>

                  {/* Quota counter */}
                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Prescreens remaining</span>
                    <span className={`font-semibold tabular-nums ${quotaNow < 200 ? 'text-amber-600' : 'text-gray-700'}`}>
                      {quotaNow.toLocaleString()}
                    </span>
                  </div>

                  {/* Done CTA */}
                  {stageDone && (
                    <div className="border-t border-gray-200 pt-3 flex justify-center">
                      <button onClick={() => setStep('results')} className="px-6 py-2 text-white rounded-md text-sm font-semibold hover:opacity-90 transition-colors" style={{background:'#016163'}}>
                        See Results →
                      </button>
                    </div>
                  )}
                </div>

                {!stageDone && (
                  <p className="text-xs text-gray-400 text-center">
                    Your prescreen is running securely in the cloud.
                  </p>
                )}
              </div>

              {!stageDone && (
                <div className="px-6 pb-6 pt-4 flex items-center justify-between shrink-0 border-t border-gray-100">
                  <span className="text-xs text-gray-400">This may take a minute</span>
                  <button
                    onClick={() => { onBatchDone?.(); onClose() }}
                    className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Run in background ↗
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── STEP 6: RESULTS ── */}
          {step === 'results' && (
            <>
              <div className="px-6 py-6 flex flex-col gap-5 overflow-y-auto">

                {/* Email-sent success banner with smart re-send */}
                {emailFlow === 'sent' && (
                  <div className="rounded-md" style={{background:'#ECFDF5', border:'1px solid #A7F3D0'}}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{background:'#016163'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold" style={{color:'#065F46'}}>
                          Email sent to {emailSentCount.toLocaleString()} {pendingLabel}
                          {sendCount > 1 && <span className="ml-1.5 text-[11px] font-medium" style={{color:'#047857'}}>· Send #{sendCount}</span>}
                        </div>
                        <div className="text-[11px]" style={{color:'#047857'}}>
                          {emailSentAt && `Delivered ${emailSentAt.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} · Tracking opens & clicks`}
                        </div>
                      </div>
                      <button
                        onClick={() => setResendOpen(o => !o)}
                        className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md transition-colors"
                        style={{
                          background: resendOpen ? '#016163' : '#fff',
                          color:      resendOpen ? '#fff'    : '#065F46',
                          border: '1px solid #A7F3D0',
                        }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10"/>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                        </svg>
                        Send again
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{transform: resendOpen ? 'rotate(180deg)' : '', transition:'transform 0.15s'}}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    </div>
                    {resendOpen && (
                      <div className="border-t" style={{borderColor:'#A7F3D0'}}>
                        <div className="px-4 py-3 flex flex-col gap-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'#047857'}}>Pick a smart segment</div>
                          {[
                            { count: 187, label: 'Non-openers',          desc: "Haven't opened the first email yet — try a fresh subject line", segLabel: 'non-openers' },
                            { count: 245, label: 'Opened, didn\'t click', desc: 'Curious but not converted — nudge with a stronger CTA',         segLabel: 'opened-no-click' },
                            { count: 312, label: 'All qualified leads',  desc: 'Resend the original email to everyone',                          segLabel: 'qualified leads' },
                          ].map(({ count, label, desc, segLabel }) => (
                            <button
                              key={label}
                              onClick={() => startSend(count, segLabel)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all hover:bg-white"
                              style={{ border:'1px solid transparent' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#A7F3D0' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent' }}>
                              <div className="flex-shrink-0 w-12 text-right tabular-nums text-[15px] font-bold" style={{color:'#065F46'}}>{count.toLocaleString()}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12.5px] font-semibold" style={{color:'#065F46'}}>{label}</div>
                                <div className="text-[11px] leading-snug" style={{color:'#047857'}}>{desc}</div>
                              </div>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#016163" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                                <polyline points="9 18 15 12 9 6"/>
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Punchy stat row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: '312', label: 'Qualified',        sub: 'Ready for outreach', color: '#016163', bg: '#ECFDF5', border: '#D1FAE5' },
                    { value: '156', label: 'Not Qualified',    sub: 'Equity / credit',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                    { value: '4',   label: 'Errors',           sub: "Couldn't process",   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                  ].map(({ value, label, sub, color, bg, border }) => (
                    <div key={label} className="rounded-md px-4 py-4 flex flex-col gap-1" style={{background: bg, border: `1px solid ${border}`}}>
                      <span className="text-3xl font-bold tabular-nums leading-none" style={{color}}>{value}</span>
                      <span className="text-[13px] font-semibold" style={{color}}>{label}</span>
                      <span className="text-[11px] text-gray-400">{sub}</span>
                    </div>
                  ))}
                </div>


                {/* Action buttons — primary CTA is whichever channel hasn't been sent yet */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Actions</div>
                  <div className="grid grid-cols-4 gap-2">
                    {(() => {
                      const emailDone = emailFlow === 'sent'
                      const items = [
                        {
                          key: 'email',
                          label: emailDone ? 'Email Sent' : 'Send Email',
                          sub: emailDone
                            ? `${emailSentCount.toLocaleString()} delivered`
                            : 'to 312',
                          variant: emailDone ? 'done' : 'primary',
                          disabled: emailDone || emailFlow === 'sending',
                          onClick: () => { if (!emailDone && emailFlow !== 'sending') startSend(312, 'qualified leads') },
                          icon: emailDone
                            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                        },
                        {
                          key: 'postcard',
                          label: 'Send Postcard',
                          sub: 'to 312',
                          variant: emailDone ? 'primary' : 'secondary',
                          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="3,9 12,15 21,9"/></svg>,
                        },
                        {
                          key: 'crm',
                          label: 'View in CRM',
                          sub: 'all leads',
                          variant: 'tertiary',
                          onClick: onClose,
                          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
                        },
                        {
                          key: 'download',
                          label: 'Download',
                          sub: 'unqualified',
                          variant: 'tertiary',
                          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
                        },
                      ]
                      const styleFor = v => {
                        if (v === 'primary')   return { background:'#254BCE', borderColor:'#254BCE', color:'#fff' }
                        if (v === 'secondary') return { background:'#fff',    borderColor:'#254BCE', color:'#254BCE' }
                        if (v === 'done')      return { background:'#ECFDF5', borderColor:'#A7F3D0', color:'#065F46' }
                        return                        { background:'#fff',    borderColor:'#E5E7EB', color:'#374151' }
                      }
                      const subColorFor = v => {
                        if (v === 'primary')   return 'rgba(255,255,255,0.65)'
                        if (v === 'secondary') return 'rgba(37,75,206,0.65)'
                        if (v === 'done')      return '#047857'
                        return '#9CA3AF'
                      }
                      return items.map(({ key, label, sub, variant, icon, onClick, disabled }) => (
                        <button
                          key={key}
                          onClick={onClick}
                          disabled={disabled}
                          className="flex flex-col items-center gap-2 py-3.5 rounded-md border transition-all hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-default"
                          style={styleFor(variant)}
                        >
                          <span>{icon}</span>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[11px] font-semibold leading-tight">{label}</span>
                            <span className="text-[9px] leading-tight" style={{color: subColorFor(variant)}}>{sub}</span>
                          </div>
                        </button>
                      ))
                    })()}
                  </div>
                </div>

                {/* Individual results — scrollable, clickable */}
                {(() => {
                  const RESULT_ROWS = [
                    { name: 'Marcus Thompson', address: '1842 Oak Hill Dr, Phoenix, AZ 85001', result: 'Qualified',   amount: '$92,000', reason: '' },
                    { name: 'Jane Foster',      address: '77 Palm Ave, Phoenix, AZ 85004',      result: 'Unqualified', amount: '',        reason: 'Insufficient equity' },
                    { name: 'Alex Ray',         address: '12 Oak Street, Phoenix, AZ 85009',    result: 'Error',       amount: '',        reason: 'Address not found' },
                    { name: 'Olivia Chen',      address: '998 Canyon Rd, Phoenix, AZ 85016',    result: 'Qualified',   amount: '$68,500', reason: '' },
                    { name: 'James Patel',      address: '334 Saguaro Blvd, Phoenix, AZ 85021', result: 'Qualified',   amount: '$54,000', reason: '' },
                    { name: 'Maria Gonzalez',   address: '221 Cactus Dr, Phoenix, AZ 85031',    result: 'Unqualified', amount: '',        reason: 'Credit check' },
                    { name: 'Robert Kim',       address: '540 Desert Rose Ln, Scottsdale, AZ',  result: 'Qualified',   amount: '$78,000', reason: '' },
                    { name: 'Sandra Ortiz',     address: '8821 W Bell Rd, Glendale, AZ',        result: 'Unqualified', amount: '',        reason: 'Insufficient equity' },
                  ]
                  const badgeStyle = r => r === 'Qualified'
                    ? { background: '#ECFDF5', color: '#016163' }
                    : r === 'Unqualified'
                    ? { background: '#FEF2F2', color: '#DC2626' }
                    : { background: '#FFFBEB', color: '#D97706' }
                  return (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Individual Results</span>
                        <span className="text-[10px] text-gray-400">Click a qualified lead to open in CRM</span>
                      </div>
                      <div className="overflow-y-auto max-h-48">
                        <table className="w-full text-[12px]">
                          <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                            <tr className="text-gray-400 text-left">
                              <th className="px-4 py-2 font-medium">Name</th>
                              <th className="px-4 py-2 font-medium">Result</th>
                              <th className="px-4 py-2 font-medium">Loan Amount</th>
                              <th className="px-4 py-2 font-medium">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {RESULT_ROWS.map((row, i) => {
                              const clickable = row.result === 'Qualified'
                              return (
                                <tr
                                  key={i}
                                  onClick={clickable ? onClose : undefined}
                                  className={`border-b border-gray-50 last:border-0 transition-colors
                                    ${clickable ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-gray-50'}`}
                                >
                                  <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      {row.name}
                                      {clickable && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                        </svg>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold" style={badgeStyle(row.result)}>
                                      {row.result}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{row.amount || <span className="text-gray-300">—</span>}</td>
                                  <td className="px-4 py-2.5 text-gray-400">{row.reason || <span className="text-gray-300">—</span>}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
                        <span>Showing 8 of 472 rows</span>
                        <button className="text-gray-600 hover:text-gray-800 underline underline-offset-2 transition-colors">Download full CSV</button>
                      </div>
                    </div>
                  )
                })()}

              </div>
            </>
          )}

          {/* ── STEP 3: REVIEW & SELECT ── */}
          {step === 'settings' && (() => {
            const allIds       = MOCK_CSV_LEADS.map(l => l.id)
            const allSelected  = allIds.every(id => selectedIds.has(id))
            const noneSelected = selectedIds.size === 0
            const creditCost   = selectedIds.size
            const quotaAfter   = quotaLeft - creditCost
            const toggleAll    = () => setSelectedIds(allSelected ? new Set() : new Set(allIds))
            const toggleOne    = id => setSelectedIds(prev => {
              const next = new Set(prev)
              next.has(id) ? next.delete(id) : next.add(id)
              return next
            })
            const resetSel = () => setSelectedIds(new Set(allIds))

            return (
              <>
                <div className="px-6 py-5 flex flex-col gap-5">

                  {/* Batch name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch Name</label>
                    <input
                      type="text"
                      value={batchName}
                      onChange={e => setBatchName(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                      placeholder="e.g. Miami Homeowners – March 2026"
                    />
                  </div>

                  {/* Project cost picker */}
                  <div className="flex flex-col gap-2.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Cost</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { key: 'fixed',    label: 'Fixed Amount',  desc: 'Enter total cost' },
                        { key: 'per_area', label: 'Cost per m²',   desc: 'By renovation area' },
                        { key: 'none',     label: 'No Cost Input', desc: 'Calculate max loan' },
                      ].map(opt => {
                        const active = costMode === opt.key
                        return (
                          <button key={opt.key} onClick={() => setCostMode(opt.key)}
                            className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-md border text-left transition-all"
                            style={{
                              background: active ? 'rgba(37,75,206,0.06)' : '#fff',
                              borderColor: active ? '#254BCE' : '#E5E7EB',
                              boxShadow: active ? '0 0 0 1px #254BCE' : 'none',
                            }}
                          >
                            <span className="text-[12px] font-semibold leading-tight" style={{color: active ? '#254BCE' : '#374151'}}>{opt.label}</span>
                            <span className="text-[10px] leading-tight text-gray-400">{opt.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                    {costMode === 'fixed' && (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 50,000"
                          className="w-48 border border-gray-200 rounded-md pl-7 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                      </div>
                    )}
                    {costMode === 'per_area' && (
                      <div className="relative">
                        <input type="number" value={costPerArea} onChange={e => setCostPerArea(e.target.value)} placeholder="e.g. 180"
                          className="w-36 border border-gray-200 rounded-md pl-3 pr-12 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">$/m²</span>
                      </div>
                    )}
                    {costMode === 'none' && (
                      <p className="text-[11px] text-gray-400">Maximum eligible loan will be calculated from equity and credit profile for each lead.</p>
                    )}
                  </div>

                  {/* Lead list */}
                  <div className="flex flex-col gap-2">
                    {/* List header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Leads from CSV
                        </label>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {MOCK_CSV_LEADS.length} total
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleAll}
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {allSelected ? 'Deselect all' : 'Select all'}
                        </button>
                        {!allSelected && (
                          <>
                            <span className="text-gray-300">·</span>
                            <button
                              onClick={resetSel}
                              className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Reset
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Table */}
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div>
                        <table className="w-full text-[12px]">
                          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                            <tr>
                              <th className="w-10 px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={allSelected}
                                  ref={el => { if (el) el.indeterminate = !allSelected && !noneSelected }}
                                  onChange={toggleAll}
                                  className="rounded"
                                />
                              </th>
                              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Name</th>
                              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Address</th>
                              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Email</th>
                            </tr>
                          </thead>
                          <tbody>
                            {MOCK_CSV_LEADS.map((lead, i) => {
                              const checked = selectedIds.has(lead.id)
                              return (
                                <tr
                                  key={lead.id}
                                  onClick={() => toggleOne(lead.id)}
                                  className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors
                                    ${checked ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
                                >
                                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                    <input type="checkbox" checked={checked} onChange={() => toggleOne(lead.id)} className="rounded" />
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{lead.name}</td>
                                  <td className="px-3 py-2.5 text-gray-500">
                                    {lead.address}, {lead.city}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {lead.warn
                                      ? <span className="flex items-center gap-1 text-amber-600"><span>⚠</span><span>Missing</span></span>
                                      : <span className="text-gray-500 truncate max-w-[140px] block">{lead.email}</span>
                                    }
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400">
                        {selectedIds.size} of {MOCK_CSV_LEADS.length} selected
                      </div>
                    </div>
                  </div>

                </div>

                <div className="px-6 pb-6 pt-4 flex items-center justify-between gap-3 shrink-0 border-t border-gray-100">
                  <button onClick={() => setStep('validate')} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Back</button>
                  <div className="flex items-center gap-3">
                    {/* Credit cost summary — updates live */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 8,
                      background: quotaAfter < 0 ? 'rgba(239,68,68,0.08)' : 'rgba(37,75,206,0.07)',
                      border: `1px solid ${quotaAfter < 0 ? 'rgba(239,68,68,0.2)' : 'rgba(37,75,206,0.15)'}`,
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill={quotaAfter < 0 ? '#EF4444' : '#254BCE'}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                      <span style={{fontSize:12, fontWeight:600, color: quotaAfter < 0 ? '#DC2626' : '#254BCE', whiteSpace:'nowrap'}}>
                        {creditCost} credit{creditCost !== 1 ? 's' : ''}
                      </span>
                      <span style={{fontSize:11, color: quotaAfter < 0 ? '#EF4444' : '#6B7280', borderLeft:'1px solid rgba(0,0,0,0.1)', paddingLeft:6, whiteSpace:'nowrap'}}>
                        {quotaAfter >= 0 ? `${quotaAfter.toLocaleString()} left after` : `${Math.abs(quotaAfter)} short`}
                      </span>
                    </div>
                    <button
                      disabled={!batchName.trim() || noneSelected || quotaAfter < 0}
                      onClick={() => setStep('processing')}
                      className={`px-6 py-2.5 rounded-md text-sm font-semibold transition-colors
                        ${batchName.trim() && !noneSelected && quotaAfter >= 0
                          ? 'text-white hover:opacity-90'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                      style={batchName.trim() && !noneSelected && quotaAfter >= 0 ? {background:'#254BCE'} : {}}
                    >
                      Run Prescreen →
                    </button>
                  </div>
                </div>
              </>
            )
          })()}

        </div>
      </div>
    </>
  )
}

function SortTh({ col, label, sortKey, sortDir, onSort, className = '', align = '', width, onResizeStart }) {
  const active = sortKey === col
  const { dark } = useTheme()
  const activeColor  = dark ? '#E8EEF8'                  : '#001660'
  const inactiveColor = dark ? 'rgba(232,238,248,0.4)'   : 'rgba(0,22,96,0.4)'
  const arrowDim     = dark ? 'rgba(232,238,248,0.2)'    : 'rgba(0,22,96,0.2)'
  return (
    <th
      onClick={() => onSort(col)}
      className={`relative px-4 py-3 text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none group whitespace-nowrap ${align} ${className}`}
      style={{ ...(width ? { width, minWidth: width } : {}), color: active ? activeColor : inactiveColor }}
    >
      <div className={`flex items-center gap-1 ${align.includes('center') ? 'justify-center' : ''}`}>
        {label}
        <span className="inline-flex flex-col gap-px shrink-0">
          <span style={{fontSize:'7px', lineHeight:1, color: active && sortDir === 'asc' ? activeColor : arrowDim}}>▲</span>
          <span style={{fontSize:'7px', lineHeight:1, color: active && sortDir === 'desc' ? activeColor : arrowDim}}>▼</span>
        </span>
      </div>
      {onResizeStart && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-200 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onResizeStart(e, col) }}
        />
      )}
    </th>
  )
}

export default function Pipeline() {
  const navigate = useNavigate()
  const { dark } = useTheme()
  // Unified dark blue-navy palette — one consistent hue family
  const D = {
    bg:     '#0F172A',   // page background — deep blue-navy
    card:   '#172340',   // card surface — matches Figma table row bg
    card2:  '#172340',   // header bar
    rim:    'rgba(99,140,255,0.12)',  // borders — cool blue tint
    rim2:   'rgba(99,140,255,0.08)',
    text:   '#E8EEF8',   // primary text — cool white
    muted:  'rgba(232,238,248,0.55)',
    muted2: 'rgba(232,238,248,0.38)',
    muted3: 'rgba(232,238,248,0.25)',
  }
  const tk = {
    // Layout
    pageBg:           dark ? D.bg     : '#F8F9FB',
    // Header bar
    headerBg:         dark ? D.card2  : '#fff',
    headerBorder:     dark ? D.rim    : 'rgba(0,22,96,0.06)',
    // Typography
    titleColor:       dark ? D.text   : '#001660',
    subtitleColor:    dark ? D.muted2 : 'rgba(0,22,96,0.4)',
    nameColor:        dark ? D.text   : '#001660',
    mutedText:        dark ? D.muted  : 'rgba(0,22,96,0.55)',
    muteText2:        dark ? D.muted2 : 'rgba(0,22,96,0.45)',
    muteText3:        dark ? D.muted3 : 'rgba(0,22,96,0.35)',
    labelColor:       dark ? D.muted2 : 'rgba(0,22,96,0.4)',
    // Cards / panels
    cardBg:           dark ? D.card   : '#fff',
    cardBorder:       dark ? D.rim    : 'rgba(0,22,96,0.07)',
    cardShadow:       dark ? 'none'   : '0 1px 4px rgba(0,22,96,0.04)',
    innerCardBg:      dark ? 'rgba(15,23,42,0.5)' : '#F8F9FB',
    innerCardBorder:  dark ? D.rim2   : 'rgba(0,22,96,0.06)',
    // Separator
    sepBg:            dark ? D.rim    : 'rgba(0,22,96,0.12)',
    // Table
    tableHeaderBg:    dark ? 'rgba(15,23,42,0.6)' : '#FAFBFC',
    tableRowAlt:      dark ? 'rgba(99,140,255,0.04)' : 'rgba(0,22,96,0.012)',
    tableRowSelected: dark ? 'rgba(37,75,206,0.25)' : 'rgba(37,75,206,0.04)',
    tableRowBorder:   dark ? D.rim2   : 'rgba(0,22,96,0.04)',
    // Inputs / filters
    filterBg:         dark ? 'rgba(15,23,42,0.6)' : '#F8F9FB',
    filterBorder:     dark ? D.rim    : 'rgba(0,22,96,0.12)',
    filterColor:      dark ? D.muted  : 'rgba(0,22,96,0.7)',
    // Timeframe pills
    pillActiveBg:     dark ? 'rgba(99,140,255,0.18)' : 'rgba(37,75,206,0.10)',
    pillActiveColor:  dark ? '#93B4FF' : '#254BCE',
    pillInactiveColor: dark ? D.muted2 : 'rgba(0,22,96,0.5)',
    // Counts / numbers
    countColor:       dark ? D.text   : '#001660',
    // Analytics card highlight (emerald)
    fundedCardBg:     dark ? 'rgba(1,97,99,0.2)'  : 'rgba(1,97,99,0.06)',
    fundedCardBorder: dark ? 'rgba(147,221,186,0.18)' : 'rgba(1,97,99,0.18)',
    fundedNumColor:   dark ? '#93DDBA' : '#016163',
    fundedTextColor:  dark ? 'rgba(147,221,186,0.7)' : 'rgba(1,97,99,0.7)',
    fundedMutedColor: dark ? 'rgba(147,221,186,0.4)' : 'rgba(1,97,99,0.5)',
    fundedBorderTop:  dark ? 'rgba(147,221,186,0.1)' : 'rgba(1,97,99,0.12)',
  }

  const [activeStatuses, setActiveStatuses] = useState(new Set())
  const [search, setSearch]               = useState('')
  const [selectedLead, setSelectedLead]   = useState(null)
  // Leads added in-session via Quick Prescreen — prepended to the pipeline list.
  // Backed by Firestore so adds persist across reloads and sync across browsers.
  const [extraLeads, setExtraLeads]       = useState([])
  const [freshlyAddedId, setFreshlyAddedId] = useState(null)
  // IDs of leads the user removed in-session (LEADS_BASE entries can't be deleted —
  // we just hide them locally; Firestore-backed leads are deleted from the collection).
  const [hiddenLeadIds, setHiddenLeadIds] = useState(() => new Set())
  useEffect(() => subscribeLeads(setExtraLeads), [])
  // Per-session "just sent" tracking — flips the lead row to "Sent · Just now"
  const [sentLeadIds, setSentLeadIds]     = useState(() => new Set())
  const [selectedIds, setSelectedIds]     = useState(new Set())
  const [currentPage, setCurrentPage]     = useState(0)
  const [pageSize, setPageSize]           = useState(50)
  const [filterChannel, setFilterChannel] = useState('')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterSource, setFilterSource]   = useState('')
  const [filterStage, setFilterStage]     = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo]   = useState('')
  const [sortKey, setSortKey]             = useState(null)
  const [sortDir, setSortDir]             = useState('asc')
  const [showQuickAdd, setShowQuickAdd]   = useState(false)
  const [showImportCSV, setShowImportCSV] = useState(false)
  const [showAddMenu, setShowAddMenu]     = useState(false)
  const [batchBadge, setBatchBadge]       = useState(false)
  const [ctxDatePreset, setCtxDatePreset] = useState('all')
  const [ctxSalesRep, setCtxSalesRep]     = useState('')
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [addLeadsOpen, setAddLeadsOpen] = useState(false)
  const [analyticsTab, setAnalyticsTab]   = useState('health')
  const [chatOpen, setChatOpen]           = useState(false)
  const [chatMessages, setChatMessages]   = useState([
    { role: 'ai', text: "Hi! I'm your pipeline assistant. Ask me anything about your leads — I can summarize activity, flag who needs attention, or break down your conversion rates." }
  ])
  const [chatInput, setChatInput]         = useState('')
  const chatEndRef                        = useRef(null)

  // Local LEADS shadows the module constant — includes any in-session prescreen adds at the top
  // and excludes anything the user removed in-session.
  const LEADS = useMemo(
    () => [...extraLeads, ...LEADS_BASE].filter(l => !hiddenLeadIds.has(l.id)),
    [extraLeads, hiddenLeadIds],
  )

  // Whenever a lead is opened in the drawer, push its identity to the demo
  // session so the downstream Email / Solar Calculator / Application screens
  // all reflect this same person.
  useEffect(() => {
    if (!selectedLead) return
    const [first, ...rest] = String(selectedLead.name || '').split(' ')
    const addr = String(selectedLead.address || '')
    const parts = addr.split(',').map(s => s.trim())
    // address parts: street, city, state+zip
    const street = parts[0] || ''
    const city   = parts[1] || ''
    const stZip  = (parts[2] || '').split(/\s+/)
    setDemoSession({
      firstName: first || '',
      lastName:  rest.join(' ') || '',
      email:     selectedLead.email || '',
      address:   street,
      city,
      state:     stZip[0] || '',
      zip:       stZip[1] || '',
      requestedLoanAmount: String(parseInt(String(selectedLead.amount || '').replace(/[^0-9]/g,'')) || ''),
    })
  }, [selectedLead])

  // ── Analytics computed values (full pipeline, not filtered) ──────────────
  const bySt = {}
  STATUSES.forEach(s => { bySt[s.key] = LEADS.filter(l => l.status === s.key).length })
  const totalLeads         = LEADS.length
  const qualNoContact      = LEADS.filter(l => l.status === 'qualified' && !l.emailSent && !l.postcardSent).length
  const emailSentCt        = LEADS.filter(l => l.emailSent).length
  const postcardSentCt     = LEADS.filter(l => l.postcardSent).length
  const bothSentCt         = LEADS.filter(l => l.emailSent && l.postcardSent).length
  const noOutreachCt       = LEADS.filter(l => !l.emailSent && !l.postcardSent).length
  const contactedPlus      = LEADS.filter(l => ['contacted','engaged','hot','applying','approved','funded'].includes(l.status)).length
  const engagedPlus        = LEADS.filter(l => ['engaged','hot','applying','approved','funded'].includes(l.status)).length
  const applyingPlus       = LEADS.filter(l => ['hot','applying','approved','funded'].includes(l.status)).length
  const responseRate       = contactedPlus > 0 ? Math.round(engagedPlus / contactedPlus * 100) : 0
  const applyRate          = engagedPlus   > 0 ? Math.round(applyingPlus / engagedPlus * 100)  : 0
  const fundedVal          = LEADS.filter(l => l.status === 'funded').reduce((s, l) => s + parseInt(l.amount.replace(/[$,]/g, '')), 0)

  // ── AI scripted responses ─────────────────────────────────────────────────
  function getAIResponse(msg) {
    const m = msg.toLowerCase()
    if (m.match(/summarize|overview|pipeline|status|how.*look/)) {
      return `Here's your pipeline snapshot:\n\n• **${bySt.qualified}** qualified — awaiting first contact\n• **${bySt.contacted}** contacted — offer delivered, waiting on response\n• **${bySt.engaged}** engaged — visited their portal offer\n• **${bySt.hot}** hot — clicked Apply Now\n• **${bySt.applying}** applying — actively filling out\n• **${bySt.approved}** approved · **${bySt.funded}** funded\n\nTotal: **${totalLeads} leads** · Response rate: **${responseRate}%** · Apply rate: **${applyRate}%**`
    }
    if (m.match(/follow.?up|attention|action|urgent|priority/)) {
      const hot = LEADS.filter(l => l.status === 'hot').slice(0, 3)
      return `Immediate priorities:\n\n**Hot leads (clicked Apply):**\n${hot.map(l => `• ${l.name} — ${l.amount} ${l.product}, ${l.location}`).join('\n')}\n\n**Not yet contacted:** ${qualNoContact} qualified leads have no outreach yet — sending their offer now could move them quickly.\n\n**Engaged but stalled:** ${bySt.engaged} leads visited the portal but haven't clicked Apply. A follow-up email or postcard could convert them.`
    }
    if (m.match(/response|conversion|rate|convert/)) {
      return `Conversion breakdown:\n\n• Contacted → Engaged: **${responseRate}%** (${engagedPlus} of ${contactedPlus})\n• Engaged → Applied: **${applyRate}%** (${applyingPlus} of ${engagedPlus})\n• Applied → Funded: **${bySt.funded}** funded this period (${Math.round(bySt.funded / Math.max(1, applyingPlus) * 100)}% of advanced leads)\n\nYour engaged-to-apply rate of ${applyRate}% is strong. The biggest lever is the **${bySt.contacted}** contacted leads not yet engaged.`
    }
    if (m.match(/hot|urgent|apply|clicked/)) {
      const hot = LEADS.filter(l => l.status === 'hot').slice(0, 5)
      return `**${bySt.hot} hot leads** clicked Apply Now:\n\n${hot.map(l => `• ${l.name} — ${l.amount} ${l.product} (${l.location})`).join('\n')}\n\nCall them — hot leads convert fastest within 24 hrs of clicking Apply.`
    }
    if (m.match(/email|postcard|outreach|contact|reach/)) {
      return `Outreach coverage:\n\n• **Email sent:** ${emailSentCt} leads\n• **Postcard sent:** ${postcardSentCt} leads\n• **Both sent:** ${bothSentCt} leads\n• **No outreach yet:** ${noOutreachCt} leads\n\n**${qualNoContact}** qualified leads are ready but haven't received any offer. Send their personalized offer to move them to Contacted.`
    }
    if (m.match(/funded|won|closed|revenue/)) {
      const funded = LEADS.filter(l => l.status === 'funded')
      return `**${bySt.funded} loans funded** this period.\n\n${funded.map(l => `• ${l.name} — ${l.amount} ${l.product}`).join('\n')}\n\nTotal funded value: **$${(fundedVal/1000).toFixed(0)}k**\n\nAnother ${bySt.approved} are approved and in closing.`
    }
    if (m.match(/qualified|prescreened|new/)) {
      return `**${bySt.qualified} qualified leads** are in your pipeline.\n\n• **${qualNoContact}** haven't received any outreach yet — they're your quickest win.\n• The rest have been contacted or are progressing through the funnel.\n\nAll ${bySt.qualified} passed prescreen and have a live offer ready. Each is 1 touchpoint away from being contacted.`
    }
    return `I can help with:\n\n• **"Summarize my pipeline"** — full overview\n• **"Who needs follow-up?"** — urgent actions\n• **"What's my response rate?"** — conversion metrics\n• **"Show hot leads"** — clicked Apply\n• **"Outreach coverage"** — email/postcard stats\n• **"Funded this period"** — closed loans`
  }

  function sendChat(text) {
    const trimmed = text.trim()
    if (!trimmed) return
    setChatMessages(prev => [...prev, { role: 'user', text: trimmed }])
    setChatInput('')
    setTimeout(() => {
      const reply = getAIResponse(trimmed)
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }])
    }, 600)
  }

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatOpen])

  const DATE_PRESETS = [
    { id: 'all',     label: 'All Time' },
    { id: 'ytd',     label: 'YTD' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'month',   label: 'This Month' },
    { id: '30d',     label: 'Last 30 Days' },
    { id: 'week',    label: 'This Week' },
  ]

  const getPresetDates = (preset) => {
    const now = new Date()
    const fmt = d => d.toISOString().split('T')[0]
    if (preset === 'week')    { const s = new Date(now); s.setDate(now.getDate() - 7); return [fmt(s), fmt(now)] }
    if (preset === 'month')   return [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)]
    if (preset === '30d')     { const s = new Date(now); s.setDate(now.getDate() - 30); return [fmt(s), fmt(now)] }
    if (preset === 'quarter') { const q = Math.floor(now.getMonth() / 3); return [fmt(new Date(now.getFullYear(), q * 3, 1)), fmt(now)] }
    if (preset === 'ytd')     return [fmt(new Date(now.getFullYear(), 0, 1)), fmt(now)]
    return ['', '']
  }
  const [ctxDateFrom, ctxDateTo] = getPresetDates(ctxDatePreset)

  const countByStatus = (key) => LEADS.filter(l => {
    if (l.status !== key) return false
    if (filterProduct && l.product !== filterProduct) return false
    if (filterSource === 'geo' && !l.source.startsWith('Geo Campaign')) return false
    if (filterSource !== 'geo' && filterSource && l.source !== filterSource) return false
    if (filterChannel === 'email' && !l.emailSent) return false
    if (filterChannel === 'postcard' && !l.postcardSent) return false
    if (filterChannel === 'portal' && !l.portalFirst) return false
    if (ctxDateFrom || ctxDateTo) {
      const d = l.createdDate ? new Date(l.createdDate) : null
      if (d) {
        if (ctxDateFrom && d < new Date(ctxDateFrom)) return false
        if (ctxDateTo && d > new Date(ctxDateTo)) return false
      }
    }
    return true
  }).length

  const parseDate = (s) => s ? new Date(s) : null
  const parseAmt  = (s) => parseInt(String(s).replace(/[^0-9]/g, '')) || 0

  const filtered = LEADS.filter(l => {
    if (filterStage && l.status !== filterStage) return false
    if (activeStatuses.size > 0 && !activeStatuses.has(l.status)) return false
    if (search) {
      const q = search.toLowerCase()
      if (!l.name.toLowerCase().includes(q) && !l.email?.toLowerCase().includes(q) && !l.phone?.includes(search)) return false
    }
    if (filterProduct && l.product !== filterProduct) return false
    if (filterSource) {
      if (filterSource === 'geo' && !l.source.startsWith('Geo Campaign')) return false
      if (filterSource !== 'geo' && l.source !== filterSource) return false
    }
    if (filterChannel) {
      if (filterChannel === 'email' && !l.emailSent) return false
      if (filterChannel === 'postcard' && !l.postcardSent) return false
      if (filterChannel === 'portal' && !l.portalFirst) return false
    }
    if (ctxDateFrom || ctxDateTo) {
      const d = parseDate(l.createdDate)
      if (d) {
        if (ctxDateFrom && d < new Date(ctxDateFrom)) return false
        if (ctxDateTo && d > new Date(ctxDateTo)) return false
      }
    }
    return true
  })

  const sorted = sortKey ? [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'amount')  return (parseAmt(a.amount)  - parseAmt(b.amount))  * dir
    if (sortKey === 'monthly') return (parseAmt(a.monthly) - parseAmt(b.monthly)) * dir
    if (sortKey === 'days')    return (a.days - b.days) * dir
    const av = String(a[sortKey] ?? ''), bv = String(b[sortKey] ?? '')
    return av.localeCompare(bv) * dir
  }) : filtered

  const hasFilters = !!(search || filterChannel || filterProduct || filterSource || filterStage || ctxSalesRep) || activeStatuses.size > 0

  function clearFilters() {
    setSearch(''); setFilterChannel(''); setFilterProduct('')
    setFilterSource(''); setFilterStage(''); setFilterDateFrom(''); setFilterDateTo('')
    setCtxDatePreset('all'); setCtxSalesRep('')
    setActiveStatuses(new Set()); setCurrentPage(0)
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setCurrentPage(0)
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, totalPages - 1)
  const pageStart = safePage * pageSize
  const pageEnd = Math.min(pageStart + pageSize, sorted.length)
  const paginated = sorted.slice(pageStart, pageEnd)

  // Smooth sparkline point arrays — each status has a distinct shape
  // Note: in SVG y=0 is top, y=40 is bottom; so lower y = higher on screen = positive trend
  const SPARK_PTS = {
    qualified: [[0,32],[14,26],[28,29],[40,22],[52,25],[63,18],[74,21],[84,14],[92,16],[100,10]],
    contacted: [[0,20],[10,24],[22,19],[35,28],[46,22],[56,17],[66,21],[76,14],[86,18],[100,11]],
    engaged:   [[0,8],[12,12],[22,10],[34,18],[46,22],[56,24],[66,28],[76,30],[88,32],[100,35]], // declining
    hot:       [[0,34],[10,28],[20,24],[30,30],[42,20],[52,14],[62,22],[74,14],[86,10],[100,16]],
    applying:  [[0,10],[12,14],[24,12],[36,20],[48,24],[58,28],[68,26],[78,32],[88,34],[100,36]], // declining
    approved:  [[0,32],[12,30],[24,28],[34,32],[46,28],[56,20],[66,14],[76,18],[88,10],[100,5]],
    funded:    [[0,34],[12,32],[22,28],[32,30],[44,26],[54,22],[64,18],[74,20],[86,14],[100,9]],
  }
  // Tiles that show a declining (red) trend
  const SPARK_DECLINING = new Set(['engaged', 'applying'])

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

  const DEFAULT_VISIBLE_COLS = new Set(['status','name','location','amount','product','monthly','portal','apply','days','lastActivity','source','actions'])
  const ALL_COLS = [
    { key:'status', label:'Status' }, { key:'name', label:'Name' }, { key:'location', label:'Location' },
    { key:'amount', label:'Loan Amount' }, { key:'product', label:'Product' }, { key:'monthly', label:'Monthly' },
    { key:'portal', label:'Portal' }, { key:'apply', label:'Apply' }, { key:'days', label:'Days' },
    { key:'lastActivity', label:'Last Activity' }, { key:'source', label:'Source' }, { key:'actions', label:'Actions' },
  ]
  const [visibleCols, setVisibleCols] = useState(new Set(DEFAULT_VISIBLE_COLS))
  const [colPickerOpen, setColPickerOpen] = useState(false)

  const [colWidths, setColWidths] = useState({
    status: 130, name: 165, location: 145, amount: 115, product: 85,
    monthly: 90, portal: 72, apply: 72, days: 62, lastActivity: 130, source: 145, actions: 120,
  })
  const resizingRef = useRef(null)
  const filterSentinelRef = useRef(null)
  const [filterBarStuck, setFilterBarStuck] = useState(false)

  useEffect(() => {
    const sentinel = filterSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setFilterBarStuck(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    function onMouseMove(e) {
      if (!resizingRef.current) return
      const { col, startX, startWidth } = resizingRef.current
      const delta = e.clientX - startX
      setColWidths(prev => ({ ...prev, [col]: Math.max(50, startWidth + delta) }))
    }
    function onMouseUp() { resizingRef.current = null }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex flex-col min-h-full" style={{background: tk.pageBg}}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{background: tk.headerBg, borderBottom:`1px solid ${tk.headerBorder}`}}>
        <div className="px-5 pt-6 pb-4 flex items-start gap-3">
          <div>
            <h1 className="text-[26px] font-bold leading-tight" style={{color: tk.titleColor}}>Pipeline</h1>
            {/* Analytics toggle — lives under title */}
            <button
              onClick={() => setAnalyticsOpen(o => !o)}
              className="flex items-center gap-1.5 mt-0.5 transition-opacity hover:opacity-75"
            >
              <svg className={`w-3 h-3 transition-transform shrink-0 ${analyticsOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: tk.labelColor}}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <span className="text-[12px]" style={{color: tk.muteText2}}>
                <span className="font-bold" style={{color:'#016163'}}>{bySt.hot}</span> hot ·{' '}
                <span className="font-bold" style={{color:'#016163'}}>{qualNoContact}</span> awaiting contact ·{' '}
                <span className="font-bold" style={{color:'#016163'}}>{responseRate}%</span> response rate ·{' '}
                <span className="font-bold" style={{color:'#016163'}}>{bySt.funded}</span> funded
              </span>
            </button>
          </div>
          <div className="ml-auto relative">
            {addLeadsOpen && <div className="fixed inset-0 z-30" onClick={() => setAddLeadsOpen(false)} />}
            <button onClick={() => setAddLeadsOpen(o => !o)} className="pl-btn-royal" style={{paddingRight: 12}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Leads
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`ml-0.5 transition-transform ${addLeadsOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {addLeadsOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-40 rounded-xl overflow-hidden"
                style={{background:'#fff', border:'1px solid rgba(0,22,96,0.1)', boxShadow:'0 8px 28px rgba(0,22,96,0.14)', minWidth:210}}>
                {[
                  {
                    label: 'Add Single Lead',
                    desc: 'Enter one lead by hand',
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
                    action: () => { setShowQuickAdd(true); setAddLeadsOpen(false) },
                  },
                  {
                    label: 'Bulk Upload Leads',
                    desc: 'Import from a spreadsheet',
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
                    action: () => { setShowImportCSV(true); setBatchBadge(false); setAddLeadsOpen(false) },
                  },
                  {
                    label: 'Geo-Search Leads',
                    desc: 'Find leads by area',
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                    action: () => { navigate('/geo-campaigns?view=map'); setAddLeadsOpen(false) },
                  },
                ].map(({ label, desc, icon, action }) => (
                  <button key={label} onClick={action}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{color:'#001660', borderBottom:'1px solid rgba(0,22,96,0.05)'}}
                    onMouseOver={e => e.currentTarget.style.background='rgba(0,22,96,0.04)'}
                    onMouseOut={e => e.currentTarget.style.background='transparent'}
                  >
                    <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'rgba(37,75,206,0.08)', color:'#254BCE'}}>{icon}</span>
                    <div>
                      <div className="text-[13px] font-semibold">{label}</div>
                      <div className="text-[11px]" style={{color:'rgba(0,22,96,0.4)'}}>{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Analytics panel — animated expand/collapse ───────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateRows: analyticsOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.28s cubic-bezier(0.4,0,0.2,1)',
          borderTop: 'none',
        }}>
          <div style={{overflow: 'hidden'}}>
            <div
              className="px-5 pt-4 pb-5 grid grid-cols-4 gap-4"
              style={{
                opacity: analyticsOpen ? 1 : 0,
                transform: analyticsOpen ? 'translateY(0)' : 'translateY(-6px)',
                transition: 'opacity 0.22s ease, transform 0.25s ease',
              }}
            >
              <div className="rounded-xl p-4 flex flex-col gap-2" style={{background: tk.innerCardBg, border:`1px solid ${tk.innerCardBorder}`}}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#016163'}}>Outreach Needed</span>
                <div className="text-[32px] font-bold leading-none" style={{color: tk.countColor}}>{qualNoContact}</div>
                <div className="text-[11px]" style={{color: tk.mutedText}}>leads not yet contacted</div>
                <div className="mt-auto pt-3" style={{borderTop:`1px solid ${tk.innerCardBorder}`}}>
                  <span className="text-[10px]" style={{color: tk.muteText3}}>{emailSentCt} emailed · {postcardSentCt} postcard sent</span>
                </div>
              </div>

              <div className="rounded-xl p-4 flex flex-col gap-3" style={{background: tk.innerCardBg, border:`1px solid ${tk.innerCardBorder}`}}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{color: tk.labelColor}}>Conversion Rates</span>
                <div className="flex flex-col gap-3">
                  {[{ label: 'Contact → Engaged', pct: responseRate }, { label: 'Engaged → Applied', pct: applyRate }].map(({ label, pct }) => (
                    <div key={label} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px]" style={{color: tk.mutedText}}>{label}</span>
                        <span className="text-[13px] font-bold " style={{color:'#016163'}}>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{background: dark ? 'rgba(99,140,255,0.1)' : 'rgba(0,22,96,0.08)'}}>
                        <div className="h-full rounded-full" style={{width:`${pct}%`, background:'#016163'}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4 flex flex-col gap-3" style={{background: tk.innerCardBg, border:`1px solid ${tk.innerCardBorder}`}}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{color: tk.labelColor}}>Funnel Overview</span>
                <div className="flex flex-col gap-2">
                  {[{ label: 'Qualified', n: bySt.qualified }, { label: 'Contacted', n: bySt.contacted }, { label: 'Engaged', n: bySt.engaged }, { label: 'Hot', n: bySt.hot }].map(({ label, n }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-[10px] w-16 shrink-0" style={{color: tk.labelColor}}>{label}</span>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{background: dark ? 'rgba(99,140,255,0.1)' : 'rgba(0,22,96,0.08)'}}>
                        <div className="h-full rounded-full" style={{width:`${Math.round(n/totalLeads*100)}%`, background:'#254BCE'}} />
                      </div>
                      <span className="text-[11px] font-semibold  w-5 text-right" style={{color: tk.countColor}}>{n}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-4 flex flex-col gap-2" style={{background: tk.fundedCardBg, border:`1px solid ${tk.fundedCardBorder}`}}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#016163'}}>Funded Value</span>
                <div className="text-[32px] font-bold leading-none" style={{color: tk.fundedNumColor}}>${(fundedVal/1000).toFixed(0)}k</div>
                <div className="text-[11px]" style={{color: tk.fundedTextColor}}>{bySt.funded} funded · {bySt.approved} in closing</div>
                <div className="mt-auto pt-3" style={{borderTop:`1px solid ${tk.fundedBorderTop}`}}>
                  <span className="text-[10px]" style={{color: tk.fundedMutedColor}}>
                    Pipeline value: ${Math.round(LEADS.filter(l => !['funded'].includes(l.status)).reduce((s,l)=>s+parseInt(l.amount.replace(/[$,]/g,'')),0)/1000)}k
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeframe bar ────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center flex-wrap gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest mr-1 shrink-0" style={{color: tk.muteText3}}>Time frame</span>
          <div className="w-px h-3.5 mx-2 shrink-0" style={{background: tk.sepBg}} />
          {DATE_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => { setCtxDatePreset(p.id); setCurrentPage(0) }}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all"
              style={ctxDatePreset === p.id
                ? { background: tk.pillActiveBg, color: tk.pillActiveColor }
                : { color: tk.pillInactiveColor, background:'transparent' }
              }
            >{p.label}</button>
          ))}
          <div className="w-px h-3.5 mx-2 shrink-0" style={{background: tk.sepBg}} />
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => { setFilterDateFrom(e.target.value); setCtxDatePreset(''); setCurrentPage(0) }}
              className="px-2.5 py-1.5 text-[12px] rounded-lg border focus:outline-none transition-colors"
              style={{
                border: filterDateFrom ? '1px solid #254BCE' : `1px solid ${tk.filterBorder}`,
                background: tk.filterBg,
                color: filterDateFrom ? '#254BCE' : tk.pillInactiveColor,
              }}
            />
            <span className="text-xs shrink-0" style={{color: tk.muteText3}}>→</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => { setFilterDateTo(e.target.value); setCtxDatePreset(''); setCurrentPage(0) }}
              className="px-2.5 py-1.5 text-[12px] rounded-lg border focus:outline-none transition-colors"
              style={{
                border: filterDateTo ? '1px solid #254BCE' : `1px solid ${tk.filterBorder}`,
                background: tk.filterBg,
                color: filterDateTo ? '#254BCE' : tk.pillInactiveColor,
              }}
            />
            {(filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setCtxDatePreset('all'); setCurrentPage(0) }}
                className="text-xs transition-colors"
                style={{color: tk.muteText2}}
                title="Clear dates"
              >✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Status tiles ─────────────────────────────────────────────────── */}
      <div className="px-5 pb-6">
        <div className="grid grid-cols-7 gap-1.5">
          {STATUSES.map((s, idx) => {
            const count = countByStatus(s.key)
            const isActive = activeStatuses.has(s.key)
            const prevCount = idx > 0 ? countByStatus(STATUSES[idx - 1].key) : null
            const convPct = prevCount ? Math.round(count / prevCount * 100) : null
            return (
              <button
                key={s.key}
                onClick={() => {
                  setCurrentPage(0)
                  setActiveStatuses(prev => {
                    const next = new Set(prev)
                    if (next.has(s.key)) next.delete(s.key)
                    else next.add(s.key)
                    return next
                  })
                }}
                className={`pl-stat-tile text-left ${isActive ? 'active' : ''}`}
                style={dark ? {
                  background: isActive ? 'rgba(37,75,206,0.2)' : 'rgba(255,255,255,0.05)',
                  border: isActive ? '1.5px solid #254BCE' : `1px solid ${D.rim}`,
                  boxShadow: 'none',
                } : {}}
              >
                {/* Colored top accent bar */}

                <div className="px-4 pt-3 pb-1">
                  {/* Status label */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background: s.textColor}} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{color: dark ? 'rgba(245,241,238,0.5)' : 'rgba(0,22,96,0.45)'}} title={s.info}>{s.label}</span>
                  </div>

                  {/* Count + trend */}
                  <div className="flex items-end gap-2 justify-between">
                    <div>
                      <div className="text-[30px] font-bold leading-none tracking-tight" style={{color: tk.countColor}}>{count}</div>
                    </div>
                    {convPct !== null && (() => {
                      const declining = SPARK_DECLINING.has(s.key)
                      const negVal = declining ? Math.abs(Math.round((1 - count / Math.max(1, prevCount)) * 100)) : null
                      return (
                        <div className="text-right pb-1">
                          <div className="text-[13px] font-bold leading-none" style={{color: declining ? '#EF4444' : '#016163'}}>
                            {declining ? '↓' : '↑'} {declining ? negVal : convPct}%
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Sparkline */}
                {(() => {
                  const declining = SPARK_DECLINING.has(s.key)
                  const lineColor = declining ? '#EF4444' : '#22C55E'
                  const fillColor = declining ? '#EF4444' : '#22C55E'
                  return (
                    <div className="w-full mt-1" style={{height: 40}}>
                      <svg viewBox="0 0 100 40" width="100%" height="40" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`gl-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={fillColor} stopOpacity={dark ? "0.25" : "0.15"} />
                            <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={`${smoothPath(SPARK_PTS[s.key])} L 100,40 L 0,40 Z`} fill={`url(#gl-${s.key})`} />
                        <path d={smoothPath(SPARK_PTS[s.key])} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity={dark ? "0.8" : "0.6"} />
                      </svg>
                    </div>
                  )
                })()}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <div className="px-5 pb-6">
        <div className="rounded-2xl" style={{background: tk.cardBg, border:`1px solid ${tk.cardBorder}`, boxShadow: dark ? 'none' : '0 1px 6px rgba(0,22,96,0.05)', overflow:'hidden'}}>

          {/* Sentinel — detects when filter bar has stuck */}
          <div ref={filterSentinelRef} style={{height: 1, opacity: 0, pointerEvents: 'none'}} />

          {/* Height placeholder — keeps card layout when bar is fixed */}
          {filterBarStuck && <div style={{height: 46}} />}

          {/* ── Filter bar: sticky in card when not stuck, fixed edge-to-edge when stuck */}
          <div className="py-3 flex items-center gap-2 flex-wrap shrink-0"
            style={{
              background: tk.cardBg,
              borderBottom: `1px solid ${tk.innerCardBorder}`,
              paddingLeft: 24,
              paddingRight: 24,
              // Fixed = escapes overflow:hidden, truly edge-to-edge
              ...(filterBarStuck ? {
                position: 'fixed',
                top: 0,
                left: 40,
                right: 0,
                zIndex: 50,
                boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,22,96,0.08)',
              } : {
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }),
            }}>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{color: tk.muteText2}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(0) }}
                  placeholder="Search leads..."
                  className="pl-8 pr-3 py-1.5 text-[12px] rounded-lg w-44 focus:outline-none"
                  style={{border:`1px solid ${tk.filterBorder}`, background: tk.filterBg, color: tk.nameColor}}
                />
              </div>
              <select value={filterStage} onChange={e => { setFilterStage(e.target.value); setActiveStatuses(new Set()); setCurrentPage(0) }}
                className="pl-3 pr-8 py-1.5 text-[12px] rounded-lg cursor-pointer focus:outline-none"
                style={{border:`1px solid ${tk.filterBorder}`, background: tk.filterBg, color: tk.filterColor}}>
                <option value="">All Stages</option>
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <select value={ctxSalesRep} onChange={e => { setCtxSalesRep(e.target.value); setCurrentPage(0) }}
                className="pl-3 pr-8 py-1.5 text-[12px] rounded-lg cursor-pointer focus:outline-none"
                style={{border:`1px solid ${tk.filterBorder}`, background: tk.filterBg, color: tk.filterColor}}>
                <option value="">All Reps</option>
                <option value="sarah">Sarah Chen</option>
                <option value="marcus">Marcus Webb</option>
                <option value="priya">Priya Nair</option>
                <option value="tom">Tom Gallagher</option>
              </select>
              <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setCurrentPage(0) }}
                className="pl-3 pr-8 py-1.5 text-[12px] rounded-lg cursor-pointer focus:outline-none"
                style={{border:`1px solid ${tk.filterBorder}`, background: tk.filterBg, color: tk.filterColor}}>
                <option value="">All Sources</option>
                <option value="geo">Geo Campaign</option>
                <option value="Bulk Upload">Bulk Upload</option>
                <option value="Manual Entry">Manual Entry</option>
              </select>
              <select value={filterProduct} onChange={e => { setFilterProduct(e.target.value); setCurrentPage(0) }}
                className="pl-3 pr-8 py-1.5 text-[12px] rounded-lg cursor-pointer focus:outline-none"
                style={{border:`1px solid ${tk.filterBorder}`, background: tk.filterBg, color: tk.filterColor}}>
                <option value="">All Products</option>
                <option value="HELOC">HELOC</option>
                <option value="HELOAN">HELOAN</option>
              </select>
              <span className="text-[11px] ml-1" style={{color: tk.muteText3}}>{sorted.length} result{sorted.length !== 1 ? 's' : ''}</span>
              {hasFilters && (
                <button onClick={clearFilters}
                  className="px-3 py-1.5 text-[12px] rounded-lg transition-colors font-medium"
                  style={{border:`1px solid ${tk.filterBorder}`, color: tk.muteText2, background:'transparent'}}>
                  Clear All
                </button>
              )}
              {/* Columns picker */}
              <div className="relative group/colbtn ml-auto">
                <button
                  onClick={() => setColPickerOpen(o => !o)}
                  title="Edit columns"
                  className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                  style={{border:`1px solid ${tk.filterBorder}`, color: tk.muteText2, background: colPickerOpen ? (dark ? 'rgba(99,140,255,0.1)' : 'rgba(0,22,96,0.04)') : 'transparent'}}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover/colbtn:opacity-100 transition-opacity duration-100 delay-0 group-hover/colbtn:delay-[600ms] z-50"
                  style={{background:'#001660', color:'#fff', boxShadow:'0 2px 8px rgba(0,22,96,0.2)'}}>
                  Edit columns
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0" style={{borderLeft:'4px solid transparent', borderRight:'4px solid transparent', borderBottom:'4px solid #001660'}} />
                </div>
                {colPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setColPickerOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 z-40 rounded-xl py-2 min-w-[180px]"
                      style={{background: dark ? '#1E2D4A' : '#fff', border:`1px solid ${tk.filterBorder}`, boxShadow:'0 8px 24px rgba(0,22,96,0.12)'}}>
                      <div className="px-3 pb-2 flex items-center justify-between" style={{borderBottom:`1px solid ${tk.innerCardBorder}`}}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{color: tk.muteText3}}>Columns</span>
                        <button
                          onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE_COLS))}
                          className="text-[10px] font-medium hover:underline"
                          style={{color:'#254BCE'}}
                        >Reset</button>
                      </div>
                      <div className="pt-1.5">
                        {ALL_COLS.map(col => (
                          <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors rounded-md mx-1"
                            style={{fontSize:'12px', color: tk.nameColor}}
                            onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(99,140,255,0.08)' : 'rgba(0,22,96,0.04)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <input
                              type="checkbox"
                              checked={visibleCols.has(col.key)}
                              style={{accentColor:'#001660', width:13, height:13}}
                              onChange={e => {
                                setVisibleCols(prev => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.add(col.key)
                                  else next.delete(col.key)
                                  return next
                                })
                              }}
                            />
                            {col.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
          </div>
          {/* Selection action bar */}
          {selectedIds.size > 0 && (
            <div className="px-5 py-2.5 flex items-center justify-between" style={{background: dark ? 'rgba(37,75,206,0.15)' : 'rgba(37,75,206,0.04)', borderBottom:`1px solid ${tk.innerCardBorder}`}}>
              <span className="text-[13px] font-medium" style={{color: tk.nameColor}}>{selectedIds.size} selected</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const ids = Array.from(selectedIds)
                    if (ids.length === 0) return
                    if (!window.confirm(`Delete ${ids.length} ${ids.length === 1 ? 'lead' : 'leads'}? This can't be undone.`)) return
                    // Firestore docs have string IDs; LEADS_BASE entries use numeric IDs.
                    const fsIds   = ids.filter(id => typeof id === 'string')
                    const baseIds = ids.filter(id => typeof id !== 'string')
                    if (fsIds.length) {
                      await Promise.all(fsIds.map(id => deleteLead(id).catch(err => console.warn('[firestore] deleteLead failed', err))))
                    }
                    if (baseIds.length) {
                      setHiddenLeadIds(prev => { const next = new Set(prev); baseIds.forEach(id => next.add(id)); return next })
                    }
                    setSelectedIds(new Set())
                  }}
                  className="inline-flex items-center gap-1.5"
                  style={{ height: '30px', fontSize: '12px', padding: '0 12px', borderRadius: 8, fontWeight: 600, color: '#B91C1C', background: 'rgba(185,28,28,0.06)', border: '1px solid rgba(185,28,28,0.25)', cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(185,28,28,0.14)'}
                  onMouseOut={e  => e.currentTarget.style.background = 'rgba(185,28,28,0.06)'}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  Delete
                </button>
                <button className="pl-btn-secondary" style={{height:'30px', fontSize:'12px', padding:'0 12px'}}>Export ↓</button>
                <button className="pl-btn-royal" style={{height:'30px', fontSize:'12px', padding:'0 12px'}}>✉ Mail Postcard</button>
                <button className="pl-btn-royal" style={{height:'30px', fontSize:'12px', padding:'0 12px'}}>📧 Send Email</button>
                <div className="w-px h-4 mx-1" style={{background:'rgba(0,22,96,0.12)'}} />
                <button onClick={() => setSelectedIds(new Set())} className="pl-btn-secondary" style={{height:'30px', fontSize:'12px', padding:'0 12px'}}>Cancel</button>
              </div>
            </div>
          )}

          {/* Table — scrollable */}
          <div className="overflow-x-auto">
            <table className="text-sm" style={{tableLayout:'fixed', width:'100%', minWidth: Object.values(colWidths).reduce((a,b)=>a+b,0)+40}}>
              <thead>
                <tr className="text-left" style={{borderBottom:`1px solid ${tk.innerCardBorder}`, background: tk.tableHeaderBg, position:'sticky', top:0, zIndex:2}}>
                  {visibleCols.has('status')   && <SortTh col="status"   label="Status"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.status}   onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} />}
                  {visibleCols.has('name')     && <SortTh col="name"     label="Name"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.name}     onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} />}
                  {visibleCols.has('location') && <SortTh col="location" label="Location"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.location}  onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} />}
                  {visibleCols.has('amount')   && <SortTh col="amount"   label="Loan Amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.amount}   onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} />}
                  {visibleCols.has('product')  && <SortTh col="product"  label="Product"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.product}  onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} />}
                  {visibleCols.has('monthly')  && <SortTh col="monthly"  label="Monthly"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.monthly}  onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} />}
                  {visibleCols.has('portal')   && <SortTh col="portal"   label="Portal"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.portal}   onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} align="text-center" />}
                  {visibleCols.has('apply')    && <SortTh col="apply"    label="Apply"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.apply}    onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} align="text-center" />}
                  {visibleCols.has('days')     && <SortTh col="days"     label="Days"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={colWidths.days}     onResizeStart={(e,c) => { resizingRef.current = { col:c, startX:e.clientX, startWidth:colWidths[c] } }} align="text-center" />}
                  {visibleCols.has('lastActivity') && (
                    <th className="relative px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest group" style={{width:colWidths.lastActivity, minWidth:colWidths.lastActivity, color: tk.labelColor}}>
                      Last Activity
                      <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-200 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={e => { e.preventDefault(); resizingRef.current = { col:'lastActivity', startX:e.clientX, startWidth:colWidths.lastActivity } }} />
                    </th>
                  )}
                  {visibleCols.has('source') && (
                    <th className="relative px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest group" style={{width:colWidths.source, minWidth:colWidths.source, color: tk.labelColor}}>
                      Source
                      <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-200 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={e => { e.preventDefault(); resizingRef.current = { col:'source', startX:e.clientX, startWidth:colWidths.source } }} />
                    </th>
                  )}
                  {visibleCols.has('actions') && <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{width:colWidths.actions, minWidth:colWidths.actions, color: tk.labelColor}}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={visibleCols.size + 1} className="px-4 py-16 text-center text-[13px]" style={{color: tk.muteText3}}>No leads match this filter</td></tr>
                )}
                {paginated.map((lead, i) => {
                  const isFresh = lead.id === freshlyAddedId
                  return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="pl-table-row group"
                    style={{
                      borderBottom:`1px solid ${tk.tableRowBorder}`,
                      background: isFresh ? 'rgba(1,97,99,0.08)'
                                : selectedLead?.id === lead.id ? tk.tableRowSelected
                                : i % 2 !== 0 ? tk.tableRowAlt : tk.cardBg,
                      boxShadow: isFresh ? 'inset 3px 0 0 #016163' : 'none',
                      transition: 'background 0.4s ease',
                    }}
                  >
                    {visibleCols.has('status') && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className={`w-3.5 h-3.5 rounded cursor-pointer shrink-0 transition-opacity ${selectedIds.has(lead.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            style={{accentColor:'#001660'}}
                            checked={selectedIds.has(lead.id)}
                            onChange={e => {
                              setSelectedIds(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(lead.id)
                                else next.delete(lead.id)
                                return next
                              })
                            }}
                          />
                          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[lead.status]}`} />
                          <span className="text-[12px] font-medium" style={{color: tk.mutedText}}>{STATUS_LABEL[lead.status]}</span>
                        </div>
                      </td>
                    )}
                    {visibleCols.has('name')     && (
                      <td className="px-4 py-3 text-[13px] font-semibold" style={{color: tk.nameColor}}>
                        <span className="inline-flex items-center gap-2">
                          {lead.name}
                          {isFresh && (
                            <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{background:'#016163', color:'#fff'}}>
                              Just added
                            </span>
                          )}
                        </span>
                      </td>
                    )}
                    {visibleCols.has('location') && <td className="px-4 py-3 text-[12px]" style={{color: tk.mutedText}}>{lead.location}</td>}
                    {visibleCols.has('amount')   && <td className="px-4 py-3 text-[13px] font-semibold" style={{color: tk.nameColor}}>{lead.amount}</td>}
                    {visibleCols.has('product')  && <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{background: tk.innerCardBg, color: tk.mutedText}}>{lead.product}</span></td>}
                    {visibleCols.has('monthly')  && <td className="px-4 py-3 text-[12px]" style={{color: tk.mutedText}}>{lead.monthly}</td>}
                    {visibleCols.has('portal')   && <td className="px-4 py-3 text-center">{lead.portal ? <span className="text-[13px] font-bold" style={{color:'#016163'}}>✓</span> : <span style={{color: tk.muteText3}}>—</span>}</td>}
                    {visibleCols.has('apply')    && <td className="px-4 py-3 text-center">{lead.apply ? <span className="text-[13px] font-bold" style={{color:'#016163'}}>✓</span> : <span style={{color: tk.muteText3}}>—</span>}</td>}
                    {visibleCols.has('days')     && <td className="px-4 py-3 text-center text-[12px]" style={{color: tk.mutedText}}>{lead.days}</td>}
                    {visibleCols.has('lastActivity') && <td className="px-4 py-3 text-[11px]" style={{color: tk.muteText2}}>{lead.lastActivity}</td>}
                    {visibleCols.has('source') && (
                      <td className="px-4 py-3 text-[11px]">
                        {lead.source?.startsWith('Geo Campaign — ')
                          ? <span className="px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{background:'rgba(37,75,206,0.08)', color:'#254BCE'}}>{lead.source.replace('Geo Campaign — ', '')}</span>
                          : lead.source === 'Bulk Upload'
                            ? <span className="px-2 py-0.5 rounded-full font-medium" style={{background:'rgba(251,191,36,0.1)', color:'#92400E'}}>Bulk</span>
                            : lead.source === 'Manual Entry'
                              ? <span className="px-2 py-0.5 rounded-full font-medium" style={{background:'rgba(0,22,96,0.06)', color:'rgba(0,22,96,0.5)'}}>Manual</span>
                              : <span style={{color:'rgba(0,22,96,0.2)'}}>—</span>}
                      </td>
                    )}
                    {visibleCols.has('actions') && <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {lead.actions.map(action => {
                          const iconMap = {
                            'Send Email':        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
                            'Send Postcard':     <PostcardIcon size={13} />,
                            'Follow Up':         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 15.22a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 4.46h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 12a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
                            'View':              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>,
                            'Open Application':  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
                          }
                          return (
                            <div key={action} className="relative group">
                              <button
                                className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                                style={{color:'#254BCE'}}
                                onMouseOver={e => { e.currentTarget.style.background='rgba(37,75,206,0.08)'; e.currentTarget.style.color='#001660' }}
                                onMouseOut={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#254BCE' }}
                              >{iconMap[action] ?? action[0]}</button>
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-100 delay-0 group-hover:delay-[600ms] z-50"
                                style={{background:'#001660', color:'#fff', boxShadow:'0 2px 8px rgba(0,22,96,0.2)'}}>
                                {action}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{borderLeft:'4px solid transparent', borderRight:'4px solid transparent', borderTop:'4px solid #001660'}} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </td>}
                  </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="flex items-center justify-end gap-4 px-5 py-3 select-none" style={{borderTop:`1px solid ${tk.innerCardBorder}`}}>
              <div className="flex items-center gap-2">
                <span className="text-[11px]" style={{color: tk.labelColor}}>Page Size:</span>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(0) }}
                  className="rounded-lg pl-2 pr-7 py-1 text-[11px] focus:outline-none"
                  style={{border:`1px solid ${tk.filterBorder}`, background: tk.filterBg, color: tk.filterColor}}
                >
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <span className="text-[11px]" style={{color: tk.labelColor}}>
                {sorted.length === 0 ? '0 to 0 of 0' : `${pageStart + 1} to ${pageEnd} of ${sorted.length}`}
              </span>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setCurrentPage(0)} disabled={safePage === 0}
                  className="px-1.5 py-1 rounded text-xs  transition-colors disabled:opacity-30 disabled:cursor-default"
                  style={{color: tk.labelColor}}>|◀</button>
                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
                  className="px-1.5 py-1 rounded text-xs  transition-colors disabled:opacity-30 disabled:cursor-default"
                  style={{color: tk.labelColor}}>◀</button>
                <span className="px-2 text-[11px]" style={{color: tk.labelColor}}>Page {safePage + 1} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage === totalPages - 1}
                  className="px-1.5 py-1 rounded text-xs  transition-colors disabled:opacity-30 disabled:cursor-default"
                  style={{color: tk.labelColor}}>▶</button>
                <button onClick={() => setCurrentPage(totalPages - 1)} disabled={safePage === totalPages - 1}
                  className="px-1.5 py-1 rounded text-xs  transition-colors disabled:opacity-30 disabled:cursor-default"
                  style={{color: tk.labelColor}}>▶|</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead detail drawer */}
      <LeadDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onEmailSent={id => setSentLeadIds(s => new Set(s).add(id))}
        emailSentInSession={selectedLead ? sentLeadIds.has(selectedLead.id) : false}
        onDelete={async (lead) => {
          // Firestore docs have string IDs; LEADS_BASE entries use numeric IDs.
          const isFirestoreLead = typeof lead.id === 'string'
          if (isFirestoreLead) {
            try { await deleteLead(lead.id) } catch (err) { console.warn('[firestore] deleteLead failed', err) }
          } else {
            setHiddenLeadIds(prev => { const next = new Set(prev); next.add(lead.id); return next })
          }
          setSelectedLead(null)
        }}
      />

      {/* Quick Prescreen modal */}
      {showQuickAdd && (
        <QuickPrescreenModal
          onClose={() => setShowQuickAdd(false)}
          onPrescreenComplete={async (partial) => {
            const newLead = {
              status: 'qualified', name: partial.name, location: partial.location,
              amount: partial.amount, product: 'HELOC', monthly: partial.monthly, fiveYear: partial.fiveYear,
              portal: false, apply: false, days: 0, lastActivity: 'Just added · prescreened',
              actions: ['Send Email','Send Postcard'],
              phone: '(555) 555-0100', email: partial.email, address: partial.address,
              apr: '8.25%', offerDate: 'Today', offerStatus: 'active',
              propValue: '—', equity: '—', cltv: '—', fico: '—', dti: '—',
              portalFirst: null, portalLast: null, pagesViewed: 0, clickedApply: null, daysSince: 0,
              emailSent: null, postcardSent: null, lastContact: null,
              source: 'Quick Prescreen', createdBy: 'Demo User', createdDate: 'Today',
              prescreenChecks: [
                { check: 'Address Verification', result: 'Pass', reason: null },
                { check: 'Max CLTV',             result: 'Pass', reason: null },
                { check: 'Credit check',         result: 'Pass', reason: null },
                { check: 'Loan Offer',           result: 'Generated', reason: null },
              ],
              timeline: [{ date: 'Today', event: 'Lead created via Quick Prescreen' }],
            }
            try {
              const id = await addLead(newLead)
              setFreshlyAddedId(id)
              setTimeout(() => setFreshlyAddedId(null), 8000)
            } catch (err) {
              console.warn('[firestore] addLead failed', err)
            }
          }}
        />
      )}
      {/* Import CSV modal */}
      {showImportCSV && <ImportCSVModal onClose={() => setShowImportCSV(false)} onBatchDone={() => { setTimeout(() => setBatchBadge(true), 1500) }} />}

      {/* ── AI Chat panel ─────────────────────────────────────────────────── */}
      {chatOpen && (
        <div className="fixed bottom-20 right-6 w-[360px] rounded-2xl flex flex-col overflow-hidden z-50"
          style={{height:'520px', background:'#fff', border:'1px solid rgba(0,22,96,0.1)', boxShadow:'0 20px 60px rgba(0,22,96,0.15)'}}>
          <div className="px-4 py-3.5 flex items-center gap-3 shrink-0" style={{background:'#001660'}}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{background:'rgba(255,255,255,0.12)'}}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white leading-tight">Pipeline Assistant</div>
              <div className="text-[10px]" style={{color:'rgba(255,255,255,0.45)'}}>Ask me about your leads</div>
            </div>
            <button onClick={() => setChatOpen(false)} className="ml-auto text-lg leading-none transition-colors"
              style={{color:'rgba(255,255,255,0.4)'}}
              onMouseOver={e => e.currentTarget.style.color='#fff'}
              onMouseOut={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}
            >✕</button>
          </div>
          <div className="px-3 py-2.5 flex gap-1.5 flex-wrap shrink-0" style={{borderBottom:'1px solid rgba(0,22,96,0.07)', background:'#F8F9FB'}}>
            {['Summarize pipeline', 'Who needs follow-up?', 'Hot leads', 'Response rate', 'Outreach coverage'].map(p => (
              <button key={p} onClick={() => sendChat(p)}
                className="text-[10px] px-2.5 py-1 rounded-full font-medium transition-all"
                style={{background:'#fff', border:'1px solid rgba(0,22,96,0.12)', color:'rgba(0,22,96,0.6)'}}
                onMouseOver={e => { e.currentTarget.style.background='#001660'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#001660' }}
                onMouseOut={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='rgba(0,22,96,0.6)'; e.currentTarget.style.borderColor='rgba(0,22,96,0.12)' }}
              >{p}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                  style={msg.role === 'user' ? {background:'#001660', color:'#fff'} : {background:'rgba(0,22,96,0.05)', color:'#001660'}}
                  dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
                />
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="px-3 py-3 shrink-0" style={{borderTop:'1px solid rgba(0,22,96,0.06)'}}>
            <form onSubmit={e => { e.preventDefault(); sendChat(chatInput) }}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{background:'#F8F9FB', border:'1px solid rgba(0,22,96,0.1)'}}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about your pipeline…"
                className="flex-1 bg-transparent text-[13px] outline-none"
                style={{color:'#001660'}}
              />
              <button type="submit" disabled={!chatInput.trim()}
                className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 transition-opacity shrink-0"
                style={{background:'#001660'}}>
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating chat button */}
      <button
        onClick={() => setChatOpen(o => !o)}
        className={`fixed bottom-6 right-6 rounded-full flex items-center justify-center transition-all z-50 ${chatOpen ? 'scale-95' : 'hover:scale-105'}`}
        style={{width:'52px', height:'52px', background: chatOpen ? '#0a2070' : '#001660', boxShadow:'0 4px 20px rgba(0,22,96,0.3)'}}
        title="Pipeline Assistant"
      >
        {chatOpen ? (
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
    </div>
  )
}
