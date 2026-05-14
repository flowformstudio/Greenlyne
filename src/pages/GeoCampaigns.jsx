import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QUOTA } from '../lib/quota'
import { useTheme } from '../lib/theme'
import GeoLeafletMap, { geocodeAddress, generateHouseholdsInShape, buildPropertyPopup } from '../components/GeoLeafletMap'
import { getPropertiesCountPolygon, getPropertiesCountCircle, getPropertiesByCriteria, listSavedCampaigns, getSavedCampaignDetail, getPrescreenUsageWidget, getUserInfoByToken, saveCampaignMail, getCampaignCollectionDetail, getPropertiesForCampaign, deleteSavedCampaign } from '../lib/glyneApi'
import { addLead } from '../lib/firebase'
import EmailPreview from '../components/EmailPreview'
import EmailPreviewPage from './EmailPreview'
import { useIsMobile } from '../lib/useIsMobile'
import CampaignsMobile from './CampaignsMobile'
import GeoMapMobile from './GeoMapMobile'

const CAMPAIGNS_BASE = [
  {
    id: 1,
    name: 'Miami Westside',
    period: 'March 2026',
    status: 'active',
    launched: 'Mar 2',
    type: 'Mail Campaign',
    targeted: 2400,
    qualified: 847,
    contacted: 612,
    engaged: 89,
    hot: 12,
    medianEquity: '$142k',
    avgFico: 714,
    cityImg: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=600&h=220&fit=crop&auto=format',
    cityLabel: 'Miami, FL',
    lat: 25.7617, lng: -80.1918, zoom: 11,
  },
  {
    id: 2,
    name: 'Austin North',
    period: 'February 2026',
    status: 'active',
    launched: 'Feb 14',
    type: 'Mail Campaign',
    targeted: 1850,
    qualified: 620,
    contacted: 480,
    engaged: 61,
    hot: 9,
    medianEquity: '$188k',
    avgFico: 728,
    cityImg: 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=600&h=220&fit=crop&auto=format',
    cityLabel: 'Austin, TX',
    lat: 30.2672, lng: -97.7431, zoom: 11,
  },
  {
    id: 3,
    name: 'Phoenix Central',
    period: 'March 2026',
    status: 'active',
    launched: 'Mar 5',
    type: 'Mail Campaign',
    targeted: 3100,
    qualified: 1020,
    contacted: 740,
    engaged: 104,
    hot: 18,
    medianEquity: '$115k',
    avgFico: 701,
    cityImg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=220&fit=crop&auto=format',
    cityLabel: 'Phoenix, AZ',
    lat: 33.4484, lng: -112.0740, zoom: 11,
  },
  {
    id: 4,
    name: 'Denver Highlands',
    period: 'January 2026',
    status: 'paused',
    launched: 'Jan 20',
    type: 'Mail Campaign',
    targeted: 980,
    qualified: 310,
    contacted: 198,
    engaged: 27,
    hot: 4,
    medianEquity: '$221k',
    avgFico: 741,
    cityImg: 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=600&h=220&fit=crop&auto=format',
    cityLabel: 'Denver, CO',
    lat: 39.7392, lng: -104.9903, zoom: 11,
  },
]

// ── Campaign cover artwork helpers ───────────────────────────────────────────
// City → curated stock photo. Keys are lowercased label substrings; first hit wins.
const CITY_PHOTOS = {
  'miami':       'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&h=400&fit=crop&auto=format',
  'austin':      'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&h=400&fit=crop&auto=format',
  'phoenix':     'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop&auto=format',
  'denver':      'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800&h=400&fit=crop&auto=format',
  'los angeles': 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&h=400&fit=crop&auto=format',
  ', la':        'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&h=400&fit=crop&auto=format',
  'san francisco':'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=400&fit=crop&auto=format',
  'new york':    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=400&fit=crop&auto=format',
  'chicago':     'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=400&fit=crop&auto=format',
  'seattle':     'https://images.unsplash.com/photo-1502175353174-a7a1f0d34f9d?w=800&h=400&fit=crop&auto=format',
  'boston':      'https://images.unsplash.com/photo-1501979376754-2ff867a4f659?w=800&h=400&fit=crop&auto=format',
  'dallas':      'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=800&h=400&fit=crop&auto=format',
  'houston':     'https://images.unsplash.com/photo-1568707577860-c80fd66ffc40?w=800&h=400&fit=crop&auto=format',
  'atlanta':     'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800&h=400&fit=crop&auto=format',
  'san diego':   'https://images.unsplash.com/photo-1538397535093-d9d31b78a92e?w=800&h=400&fit=crop&auto=format',
  'portland':    'https://images.unsplash.com/photo-1556606744-3f3c8f0bc91d?w=800&h=400&fit=crop&auto=format',
}
const DEFAULT_CITY_PHOTO = 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=800&h=400&fit=crop&auto=format'

function cityPhotoFor(label = '') {
  const s = String(label).toLowerCase()
  for (const key of Object.keys(CITY_PHOTOS)) if (s.includes(key)) return CITY_PHOTOS[key]
  return DEFAULT_CITY_PHOTO
}

// City centroid lookup — used so backend campaigns whose label mentions a known
// city still get a map snippet instead of falling back to a flat city photo.
const CITY_COORDS = {
  'miami':         { lat: 25.7617, lng: -80.1918, zoom: 11 },
  'austin':        { lat: 30.2672, lng: -97.7431, zoom: 11 },
  'phoenix':       { lat: 33.4484, lng: -112.0740, zoom: 11 },
  'denver':        { lat: 39.7392, lng: -104.9903, zoom: 11 },
  'los angeles':   { lat: 34.0522, lng: -118.2437, zoom: 10 },
  ', la':          { lat: 34.0522, lng: -118.2437, zoom: 10 },
  'san francisco': { lat: 37.7749, lng: -122.4194, zoom: 11 },
  'new york':      { lat: 40.7128, lng: -74.0060, zoom: 11 },
  'chicago':       { lat: 41.8781, lng: -87.6298, zoom: 11 },
  'seattle':       { lat: 47.6062, lng: -122.3321, zoom: 11 },
  'boston':        { lat: 42.3601, lng: -71.0589, zoom: 11 },
  'dallas':        { lat: 32.7767, lng: -96.7970, zoom: 11 },
  'houston':       { lat: 29.7604, lng: -95.3698, zoom: 10 },
  'atlanta':       { lat: 33.7490, lng: -84.3880, zoom: 11 },
  'san diego':     { lat: 32.7157, lng: -117.1611, zoom: 11 },
  'portland':      { lat: 45.5152, lng: -122.6784, zoom: 11 },
}
function cityCoordsFor(...labels) {
  const hay = labels.filter(Boolean).join(' ').toLowerCase()
  for (const key of Object.keys(CITY_COORDS)) if (hay.includes(key)) return CITY_COORDS[key]
  return null
}

// Build a Mapbox Static Images URL centered on lat/lng. If a polygon (array of
// [lat,lng] or {lat,lng}) is supplied, draws it as a filled overlay so the card
// shows the actual targeted area.
function mapboxStaticUrl({ lat, lng, zoom = 11, polygon, width = 800, height = 400 }) {
  const token = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || ''
  if (!token || lat == null || lng == null) return null
  let path = ''
  if (Array.isArray(polygon) && polygon.length >= 3) {
    const enc = encodePolyline(polygon)
    if (enc) path = `path-3+254bce-0.8+254bce-0.20(${encodeURIComponent(enc)}),`
  }
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${path}pin-s+254bce(${lng},${lat})/${lng},${lat},${zoom},0/${width}x${height}@2x?access_token=${token}`
}

// Google's polyline-encoded path used by Mapbox `path-` overlays.
function encodePolyline(points) {
  try {
    const norm = points.map(p => Array.isArray(p) ? p : [p.lat, p.lng])
    let lastLat = 0, lastLng = 0, result = ''
    for (const [lat, lng] of norm) {
      const dLat = Math.round(lat * 1e5) - lastLat
      const dLng = Math.round(lng * 1e5) - lastLng
      lastLat += dLat; lastLng += dLng
      result += encVal(dLat) + encVal(dLng)
    }
    return result
  } catch { return '' }
}
function encVal(v) {
  v = v < 0 ? ~(v << 1) : (v << 1)
  let s = ''
  while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5 }
  s += String.fromCharCode(v + 63)
  return s
}

// Resolve a campaign's cover image: real map > city photo > default city photo.
function campaignCover(c = {}) {
  const map = mapboxStaticUrl({ lat: c.lat, lng: c.lng, zoom: c.zoom || 11, polygon: c.polygon })
  if (map) return map
  if (c.cityImg) return c.cityImg
  return cityPhotoFor(c.cityLabel || '')
}

// ── Screened leads per campaign ──────────────────────────────────────────────
function PostcardIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 29 30" fill="none" stroke="currentColor" strokeWidth="2.42" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24.1665 7.5H4.83317C3.49848 7.5 2.4165 8.61929 2.4165 10V20C2.4165 21.3807 3.49848 22.5 4.83317 22.5H24.1665C25.5012 22.5 26.5832 21.3807 26.5832 20V10C26.5832 8.61929 25.5012 7.5 24.1665 7.5Z"/>
      <path d="M14.5 7.5V22.5"/>
      <path d="M2.4165 15H14.4998"/>
    </svg>
  )
}

const CAMPAIGN_LEADS = {
  1: [ // Miami Westside
    { id:1,  name:'Sandra Reyes',     address:'1204 SW 8th St',        offer:'$78,000',  fico:731, equity:'$145k', status:'contacted' },
    { id:2,  name:'James Whitfield',  address:'3847 NW 7th Ave',       offer:'$112,000', fico:748, equity:'$198k', status:'hot' },
    { id:3,  name:'Maria Gonzalez',   address:'2201 Coral Way',        offer:'$65,000',  fico:714, equity:'$121k', status:'engaged' },
    { id:4,  name:'Robert Kimura',    address:'901 Brickell Key Dr',   offer:'$145,000', fico:762, equity:'$231k', status:'contacted' },
    { id:5,  name:'Tanya Brown',      address:'5502 SW 40th St',       offer:'$54,000',  fico:703, equity:'$98k',  status:'qualified' },
    { id:6,  name:'Carlos Mendez',    address:'1110 NE 2nd Ave',       offer:'$89,000',  fico:726, equity:'$157k', status:'qualified' },
    { id:7,  name:'Lisa Park',        address:'700 Biscayne Blvd',     offer:'$203,000', fico:779, equity:'$312k', status:'hot' },
    { id:8,  name:'Daniel Osei',      address:'3302 Grand Ave',        offer:'$71,000',  fico:718, equity:'$133k', status:'qualified' },
    { id:9,  name:'Patricia Nguyen',  address:'4415 SW 57th Ct',       offer:'$96,000',  fico:739, equity:'$174k', status:'engaged' },
    { id:10, name:'Marcus Turner',    address:'2688 S Bayshore Dr',    offer:'$180,000', fico:755, equity:'$267k', status:'contacted' },
    { id:11, name:'Anna Kowalski',    address:'88 SE 8th St #1201',    offer:'$134,000', fico:744, equity:'$212k', status:'qualified' },
    { id:12, name:'Brian Liu',        address:'1435 NW 22nd Ave',      offer:'$58,000',  fico:709, equity:'$107k', status:'qualified' },
  ],
  2: [ // Austin North
    { id:1,  name:'Kevin Walsh',      address:'4209 Bull Creek Rd',    offer:'$121,000', fico:752, equity:'$204k', status:'hot' },
    { id:2,  name:'Nicole Foster',    address:'8812 Burnet Rd',        offer:'$88,000',  fico:733, equity:'$162k', status:'engaged' },
    { id:3,  name:'Thomas Hill',      address:'3311 Duval St',         offer:'$145,000', fico:761, equity:'$228k', status:'contacted' },
    { id:4,  name:'Samantha Cruz',    address:'6701 N Lamar Blvd',     offer:'$74,000',  fico:719, equity:'$138k', status:'qualified' },
    { id:5,  name:'Derek Johnson',    address:'2205 Speedway',         offer:'$192,000', fico:774, equity:'$291k', status:'hot' },
    { id:6,  name:'Priya Patel',      address:'5500 Airport Blvd',     offer:'$63,000',  fico:711, equity:'$115k', status:'qualified' },
    { id:7,  name:'Walter Scott',     address:'1040 E 6th St',         offer:'$107,000', fico:742, equity:'$183k', status:'contacted' },
    { id:8,  name:'Caitlin Moore',    address:'9201 Research Blvd',    offer:'$81,000',  fico:728, equity:'$151k', status:'qualified' },
  ],
  3: [ // Phoenix Central
    { id:1,  name:'Eduardo Rios',     address:'3301 E Indian School Rd', offer:'$82,000', fico:722, equity:'$128k', status:'engaged' },
    { id:2,  name:'Rebecca Stone',    address:'1602 W Camelback Rd',   offer:'$98,000',  fico:737, equity:'$168k', status:'hot' },
    { id:3,  name:'Anthony Bell',     address:'4840 N 44th St',        offer:'$61,000',  fico:706, equity:'$109k', status:'qualified' },
    { id:4,  name:'Michelle Tran',    address:'2700 E Thomas Rd',      offer:'$115,000', fico:750, equity:'$196k', status:'contacted' },
    { id:5,  name:'Steven Adams',     address:'8900 N Black Canyon Hwy', offer:'$74,000', fico:718, equity:'$134k', status:'qualified' },
    { id:6,  name:'Diana Flores',     address:'1501 N 7th Ave',        offer:'$142,000', fico:759, equity:'$224k', status:'hot' },
    { id:7,  name:'Chris Nakamura',   address:'3800 N Central Ave',    offer:'$53,000',  fico:702, equity:'$96k',  status:'qualified' },
    { id:8,  name:'Jessica Warren',   address:'2102 E McDowell Rd',    offer:'$88,000',  fico:731, equity:'$155k', status:'engaged' },
    { id:9,  name:'Mark Santos',      address:'5600 N 16th St',        offer:'$109,000', fico:746, equity:'$189k', status:'contacted' },
    { id:10, name:'Laura Chen',       address:'7200 N 19th Ave',       offer:'$67,000',  fico:714, equity:'$122k', status:'qualified' },
  ],
  4: [ // Denver Highlands
    { id:1,  name:'Jacob Miller',     address:'3450 W 32nd Ave',       offer:'$156,000', fico:763, equity:'$245k', status:'contacted' },
    { id:2,  name:'Amanda Wilson',    address:'2811 W 26th Ave',       offer:'$118,000', fico:749, equity:'$203k', status:'engaged' },
    { id:3,  name:'Ryan Clarke',      address:'4101 Tennyson St',      offer:'$89,000',  fico:734, equity:'$164k', status:'qualified' },
    { id:4,  name:'Stephanie Young',  address:'1702 W 38th Ave',       offer:'$201,000', fico:771, equity:'$308k', status:'hot' },
  ],
}

const STATUS_META = {
  hot:       { label: 'Hot',       color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  engaged:   { label: 'Engaged',   color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  contacted: { label: 'Contacted', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  qualified: { label: 'Qualified', color: '#016163', bg: 'rgba(1,97,99,0.08)'   },
}

// ── Shared filter UI primitives ───────────────────────────────────────────────
function Slider({ label, value, onChange, min, max, step=10, fmt, dark }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium" style={{color: dark ? 'rgba(232,238,248,0.6)' : '#4B5563'}}>{label}</span>
        <span className="text-[11px] font-semibold" style={{color: dark ? '#E8EEF8' : '#111827'}}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step}
        value={value} onChange={e => onChange(+e.target.value)}
        className="w-full h-1 cursor-pointer" style={{accentColor: dark ? '#638CFF' : '#1F2937', outline: 'none'}} />
      <div className="flex justify-between text-[10px]" style={{color: dark ? 'rgba(232,238,248,0.2)' : '#D1D5DB'}}>
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
    </div>
  )
}

function RangeSlider({ label, minVal, maxVal, onMinChange, onMaxChange, min, max, step=1, fmt, dark }) {
  const pctMin = ((minVal - min) / (max - min)) * 100
  const pctMax = ((maxVal - min) / (max - min)) * 100

  function handleMinChange(e) {
    const val = Math.min(+e.target.value, maxVal - step)
    onMinChange(val)
  }
  function handleMaxChange(e) {
    const val = Math.max(+e.target.value, minVal + step)
    onMaxChange(val)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium" style={{color: dark ? 'rgba(232,238,248,0.6)' : '#4B5563'}}>{label}</span>
        <span className="text-[11px] font-semibold tabular-nums" style={{color: dark ? '#E8EEF8' : '#111827'}}>
          {fmt(minVal)} – {fmt(maxVal)}
        </span>
      </div>
      <div className="dual-range-slider">
        {/* Track */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: '50%', transform: 'translateY(-50%)',
          height: 4, background: dark ? 'rgba(232,238,248,0.12)' : '#E5E7EB', borderRadius: 2,
        }} />
        {/* Filled segment */}
        <div style={{
          position: 'absolute',
          left: `${pctMin}%`, right: `${100 - pctMax}%`,
          top: '50%', transform: 'translateY(-50%)',
          height: 4, background: dark ? '#638CFF' : '#001660', borderRadius: 2,
        }} />
        <input type="range" min={min} max={max} step={step}
          value={minVal} onChange={handleMinChange} />
        <input type="range" min={min} max={max} step={step}
          value={maxVal} onChange={handleMaxChange} />
      </div>
      <div className="flex justify-between text-[10px]" style={{color: dark ? 'rgba(232,238,248,0.2)' : '#D1D5DB'}}>
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange, dark }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium" style={{color: dark ? 'rgba(232,238,248,0.6)' : '#4B5563'}}>{label}</span>
      <button onClick={() => onChange(!value)}
        style={{background: value ? (dark ? '#638CFF' : '#111827') : (dark ? 'rgba(232,238,248,0.15)' : '#E5E7EB')}}
        className="w-9 h-5 rounded-full transition-colors flex items-center px-0.5 shrink-0">
        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform
          ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

function FilterRow({ children, dark }) {
  return (
    <div className="px-4 py-3 last:border-0" style={{borderBottom: `1px solid ${dark ? 'rgba(99,140,255,0.08)' : 'rgba(0,22,96,0.04)'}`}}>
      {children}
    </div>
  )
}

function SectionLabel({ children, dark }) {
  return (
    <div className="px-4 pt-3 pb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{color: dark ? 'rgba(232,238,248,0.3)' : '#9CA3AF'}}>{children}</span>
    </div>
  )
}

function FiltersPanel({ onCoreChange, floatMode = false }) {
  const { dark } = useTheme()
  // Core filters
  const [equity, setEquity]           = useState(50)
  const [fico, setFico]               = useState(660)
  const [monthsOwned, setMonthsOwned] = useState(24)
  const [income, setIncome]           = useState(50)
  const [poolFilter, setPoolFilter]   = useState('any')

  // Project Cost Model
  const [costModelOpen, setCostModelOpen] = useState(false)
  const [costModelType, setCostModelType] = useState('none')
  const [fixedCost, setFixedCost]         = useState('')
  const [costPerSqm, setCostPerSqm]       = useState(180)

  // Advanced: Census & Geography
  const [advancedOpen, setAdvancedOpen]             = useState(false)
  const [lmiFilter, setLmiFilter]                   = useState(null)
  const [censusTractFilter, setCensusTractFilter]   = useState(false)
  const [pullFullCensusTract, setPullFullCensusTract] = useState(false)

  // Advanced: Exclusions
  const [excludeRetargeting, setExcludeRetargeting] = useState(false)
  const [excludeDays, setExcludeDays]               = useState(30)
  const [excludeSource, setExcludeSource]           = useState('any_bank')

  // Advanced: Solar filters
  const [roofM2Min, setRoofM2Min]     = useState(10)
  const [roofM2Max, setRoofM2Max]     = useState(1000)
  const [solarAreaMin, setSolarAreaMin] = useState(5)
  const [solarAreaMax, setSolarAreaMax] = useState(3000)
  const [sunshineMin, setSunshineMin]  = useState(500)
  const [sunshineMax, setSunshineMax]  = useState(3000)
  const [propAgeMin, setPropAgeMin]    = useState(0)
  const [propAgeMax, setPropAgeMax]    = useState(6000)
  const [projCostMin, setProjCostMin]  = useState(25000)
  const [projCostMax, setProjCostMax]  = useState(500000)
  const [minKwhMin, setMinKwhMin]      = useState(100)
  const [minKwhMax, setMinKwhMax]      = useState(20000)
  const [maxKwhMin, setMaxKwhMin]      = useState(6000)
  const [maxKwhMax, setMaxKwhMax]      = useState(20000)
  const [minPanelsMin, setMinPanelsMin] = useState(4)
  const [minPanelsMax, setMinPanelsMax] = useState(200)
  const [maxPanelsMin, setMaxPanelsMin] = useState(10)
  const [maxPanelsMax, setMaxPanelsMax] = useState(200)
  const [billMin, setBillMin]          = useState(0)
  const [billMax, setBillMax]          = useState(3000)
  const [kwhMonthMin, setKwhMonthMin]  = useState(100)
  const [kwhMonthMax, setKwhMonthMax]  = useState(20000)

  useEffect(() => {
    onCoreChange?.({
      equity, fico, monthsOwned, income, poolFilter,
      // Solar filters — surfaced so the host can refine getPropertiesByCriteria
      // when the user is on a solar-installer tenant.
      solar: {
        roofM2: [roofM2Min, roofM2Max],
        sunshineHours: [sunshineMin, sunshineMax],
        propertyAge: [propAgeMin, propAgeMax],
        estProjectCost: [projCostMin, projCostMax],
        minAnnualKwh: [minKwhMin, minKwhMax],
        maxAnnualKwh: [maxKwhMin, maxKwhMax],
      },
    })
  }, [equity, fico, monthsOwned, income, poolFilter,
      roofM2Min, roofM2Max, sunshineMin, sunshineMax,
      propAgeMin, propAgeMax, projCostMin, projCostMax,
      minKwhMin, minKwhMax, maxKwhMin, maxKwhMax]) // eslint-disable-line

  const CoreFilters = () => (
    <div className="flex flex-col">
      <FilterRow dark={dark}>
        <Slider dark={dark} label="Min Home Equity" value={equity} onChange={setEquity}
          min={50} max={1000} fmt={v => v >= 1000 ? '$1M+' : `$${v}k`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <Slider dark={dark} label="Owner FICO Score" value={fico} onChange={setFico}
          min={660} max={850} step={5} fmt={v => `${v}+`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <Slider dark={dark} label="Months of Ownership" value={monthsOwned} onChange={setMonthsOwned}
          min={0} max={360} fmt={v => v === 0 ? 'Any' : `${v} mo+`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <Slider dark={dark} label="Est. Household Income" value={income} onChange={setIncome}
          min={50} max={1000} fmt={v => v >= 1000 ? '$1M+' : `$${v}k+`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium" style={{color: dark ? 'rgba(232,238,248,0.6)' : '#4B5563'}}>Swimming Pool</span>
          <div className="flex rounded-lg overflow-hidden text-[10px]" style={{border:`1px solid ${dark ? 'rgba(99,140,255,0.2)' : '#E5E7EB'}`}}>
            {[['any','Any'],['with','With pool'],['without','Without pool']].map(([val, lbl]) => (
              <button key={val} onClick={() => setPoolFilter(val)}
                style={{
                  flex:1, padding:'4px 0', textAlign:'center', transition:'background 0.15s',
                  background: poolFilter === val ? (dark ? '#638CFF' : '#111827') : 'transparent',
                  color: poolFilter === val ? '#fff' : (dark ? 'rgba(232,238,248,0.5)' : '#6B7280'),
                }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </FilterRow>
    </div>
  )

  const COST_MODEL_OPTIONS = [
    {
      key: 'fixed',
      label: 'Project Cost',
      desc: 'Enter a fixed total amount',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
    },
    {
      key: 'per_area',
      label: 'Cost per m²',
      desc: 'Based on solar array size',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      key: 'none',
      label: 'No Cost Input',
      desc: 'Calculate maximum loan',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      ),
    },
  ]

  const muted = dark ? 'rgba(232,238,248,0.4)' : '#9CA3AF'
  const bodyTxt = dark ? 'rgba(232,238,248,0.55)' : '#6B7280'
  const chipBorder = dark ? 'rgba(99,140,255,0.25)' : '#E5E7EB'

  const ProjectCostModel = () => (
    <div className="flex flex-col">
      <FilterRow dark={dark}>
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{color: muted}}>How should project cost be determined?</span>
          <div className="grid grid-cols-3 gap-1.5">
            {COST_MODEL_OPTIONS.map(opt => {
              const active = costModelType === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setCostModelType(opt.key)}
                  className="flex flex-col items-start gap-1.5 px-2.5 py-2.5 rounded-md border text-left transition-all"
                  style={{
                    background: active ? 'rgba(99,140,255,0.12)' : (dark ? 'rgba(232,238,248,0.04)' : '#fff'),
                    borderColor: active ? '#638CFF' : chipBorder,
                    boxShadow: active ? '0 0 0 1px #638CFF' : 'none',
                  }}
                >
                  <span style={{color: active ? '#638CFF' : muted}}>{opt.icon}</span>
                  <span className="text-[11px] font-semibold leading-tight" style={{color: active ? (dark ? '#E8EEF8' : '#254BCE') : (dark ? 'rgba(232,238,248,0.7)' : '#374151')}}>{opt.label}</span>
                  <span className="text-[10px] leading-tight" style={{color: muted}}>{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      </FilterRow>
      {costModelType === 'fixed' && (
        <FilterRow dark={dark}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium" style={{color: bodyTxt}}>Total project cost</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{color: muted}}>$</span>
              <input
                type="number"
                value={fixedCost}
                onChange={e => setFixedCost(e.target.value)}
                placeholder="e.g. 32,000"
                className="w-48 rounded-lg pl-7 pr-3 py-2 text-sm outline-none"
                style={{border:`1px solid ${chipBorder}`, background: dark ? 'rgba(232,238,248,0.05)' : '#fff', color: dark ? '#E8EEF8' : '#111827'}}
              />
            </div>
            <p className="text-[10px]" style={{color: muted}}>The same cost will apply to all leads in this campaign.</p>
          </div>
        </FilterRow>
      )}
      {costModelType === 'per_area' && (
        <FilterRow dark={dark}>
          <Slider dark={dark} label="Cost per m² of solar array" value={costPerSqm} onChange={setCostPerSqm}
            min={50} max={600} step={5} fmt={v => `$${v}/m²`} />
          <p className="text-[10px] mt-1.5" style={{color: muted}}>Applied to each property's estimated solar array area to calculate project cost.</p>
        </FilterRow>
      )}
      {costModelType === 'none' && (
        <FilterRow dark={dark}>
          <p className="text-[11px] leading-relaxed" style={{color: muted}}>
            No cost input — each homeowner's maximum eligible loan amount will be calculated based on equity, income, and credit profile.
          </p>
        </FilterRow>
      )}
    </div>
  )

  const AdvancedFilters = () => (
    <div className="flex flex-col">
      <SectionLabel dark={dark}>Census &amp; Geography</SectionLabel>
      <FilterRow dark={dark}>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium" style={{color: bodyTxt}}>LMI / CRA / CDFI</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              ['LMI','LMI Tracts'],
              ['CRA','CRA Tracts'],
              ['CDFI','CDFI Tracts'],
              ['non_cdfi_cra','Non-CDFI & Non-CRA'],
            ].map(([val, lbl]) => (
              <button key={val}
                onClick={() => setLmiFilter(v => v === val ? null : val)}
                style={{
                  fontSize:10, padding:'2px 8px', borderRadius:4, border:`1px solid`,
                  borderColor: lmiFilter === val ? (dark ? '#638CFF' : '#111827') : chipBorder,
                  background: lmiFilter === val ? (dark ? '#638CFF' : '#111827') : 'transparent',
                  color: lmiFilter === val ? '#fff' : (dark ? 'rgba(232,238,248,0.5)' : '#6B7280'),
                }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </FilterRow>
      <FilterRow dark={dark}>
        <Toggle dark={dark} label="Filter on Census Tract" value={censusTractFilter} onChange={setCensusTractFilter} />
      </FilterRow>
      <FilterRow dark={dark}>
        <Toggle dark={dark} label="Pull Full Census Tract Data" value={pullFullCensusTract} onChange={setPullFullCensusTract} />
      </FilterRow>
      <SectionLabel dark={dark}>Audience Exclusions</SectionLabel>
      <FilterRow dark={dark}>
        <div className="flex flex-col gap-2.5">
          <Toggle dark={dark} label="Consumer Retargeting Exclusion" value={excludeRetargeting} onChange={setExcludeRetargeting} />
          {excludeRetargeting && (
            <div className="flex flex-col gap-2 pl-1">
              <span className="text-[10px]" style={{color: muted}}>Offer received in the last:</span>
              <div className="flex flex-wrap gap-1">
                {[7, 30, 60, 90, 180].map(d => (
                  <button key={d} onClick={() => setExcludeDays(d)}
                    style={{
                      fontSize:10, padding:'2px 8px', borderRadius:4, border:`1px solid`,
                      borderColor: excludeDays === d ? (dark ? '#638CFF' : '#111827') : chipBorder,
                      background: excludeDays === d ? (dark ? '#638CFF' : '#111827') : 'transparent',
                      color: excludeDays === d ? '#fff' : (dark ? 'rgba(232,238,248,0.5)' : '#6B7280'),
                    }}>
                    {d}d
                  </button>
                ))}
              </div>
              <span className="text-[10px]" style={{color: muted}}>Offer received from:</span>
              <div className="flex flex-col gap-1">
                {[['any_bank','Any Bank'],['my_bank','My Bank']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer" onClick={() => setExcludeSource(val)}>
                    <div className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors"
                      style={{borderColor: excludeSource === val ? (dark ? '#638CFF' : '#111827') : (dark ? 'rgba(232,238,248,0.25)' : '#D1D5DB')}}>
                      {excludeSource === val && <div className="w-1.5 h-1.5 rounded-full" style={{background: dark ? '#638CFF' : '#111827'}}/>}
                    </div>
                    <span className="text-[11px]" style={{color: bodyTxt}}>{lbl}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </FilterRow>
      <SectionLabel dark={dark}>Solar Properties</SectionLabel>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Roof Size" minVal={roofM2Min} maxVal={roofM2Max}
          onMinChange={setRoofM2Min} onMaxChange={setRoofM2Max}
          min={10} max={1000} fmt={v => `${v} m²`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Array Coverage Size" minVal={solarAreaMin} maxVal={solarAreaMax}
          onMinChange={setSolarAreaMin} onMaxChange={setSolarAreaMax}
          min={5} max={3000} fmt={v => `${v} m²`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Annual Sunshine Hours" minVal={sunshineMin} maxVal={sunshineMax}
          onMinChange={setSunshineMin} onMaxChange={setSunshineMax}
          min={500} max={3000} fmt={v => `${v}h`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Property Age" minVal={propAgeMin} maxVal={propAgeMax}
          onMinChange={setPropAgeMin} onMaxChange={setPropAgeMax}
          min={0} max={6000} fmt={v => `${v} mo`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Est. Project Cost" minVal={projCostMin} maxVal={projCostMax}
          onMinChange={setProjCostMin} onMaxChange={setProjCostMax}
          min={25000} max={500000} step={1000} fmt={v => `$${(v/1000).toFixed(0)}k`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Min Annual DC kWh" minVal={minKwhMin} maxVal={minKwhMax}
          onMinChange={setMinKwhMin} onMaxChange={setMinKwhMax}
          min={100} max={20000} step={100} fmt={v => `${v.toLocaleString()} kWh`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Max Annual DC kWh" minVal={maxKwhMin} maxVal={maxKwhMax}
          onMinChange={setMaxKwhMin} onMaxChange={setMaxKwhMax}
          min={6000} max={20000} step={100} fmt={v => `${v.toLocaleString()} kWh`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Min Solar Panel Count" minVal={minPanelsMin} maxVal={minPanelsMax}
          onMinChange={setMinPanelsMin} onMaxChange={setMinPanelsMax}
          min={4} max={200} fmt={v => `${v}`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Max Solar Panel Count" minVal={maxPanelsMin} maxVal={maxPanelsMax}
          onMinChange={setMaxPanelsMin} onMaxChange={setMaxPanelsMax}
          min={10} max={200} fmt={v => `${v}`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Monthly Electricity Bill" minVal={billMin} maxVal={billMax}
          onMinChange={setBillMin} onMaxChange={setBillMax}
          min={0} max={3000} fmt={v => `$${v}`} />
      </FilterRow>
      <FilterRow dark={dark}>
        <RangeSlider dark={dark} label="Avg Monthly kWh Usage" minVal={kwhMonthMin} maxVal={kwhMonthMax}
          onMinChange={setKwhMonthMin} onMaxChange={setKwhMonthMax}
          min={100} max={20000} step={100} fmt={v => `${v.toLocaleString()}`} />
      </FilterRow>
    </div>
  )

  const panelBg    = dark ? '#172340' : '#fff'
  const panelBorder = dark ? 'rgba(99,140,255,0.12)' : '#E5E7EB'
  const sectionDivider = dark ? 'rgba(99,140,255,0.08)' : '#F3F4F6'

  return (
    <div className={floatMode ? "flex-1 min-h-0 flex flex-col overflow-y-auto" : "w-60 flex flex-col shrink-0 overflow-y-auto"} style={{background: panelBg, ...(floatMode ? {} : {borderRight: `1px solid ${panelBorder}`})}}>
      <div className="px-4 py-3 shrink-0" style={{borderBottom:`1px solid ${sectionDivider}`}}>
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{color: muted}}>Filters</h3>
      </div>
      <div className="flex flex-col">
        <CoreFilters />
        <div style={{borderTop:`1px solid ${sectionDivider}`}}>
          <button onClick={() => setCostModelOpen(o => !o)}
            className="w-full px-4 py-3 flex items-center justify-between text-[11px] font-semibold transition-colors"
            style={{color: muted}}
            onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.04)' : '#F9FAFB'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <span>Project Cost Model</span>
            <span className="text-[10px] normal-case tracking-normal" style={{color: dark ? 'rgba(232,238,248,0.2)' : '#D1D5DB'}}>
              {costModelOpen ? '▲' : '▼'}&nbsp;optional
            </span>
          </button>
          {costModelOpen && <ProjectCostModel />}
        </div>
        <div style={{borderTop:`1px solid ${sectionDivider}`}}>
          <button onClick={() => setAdvancedOpen(o => !o)}
            className="w-full px-4 py-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide transition-colors"
            style={{color: muted}}
            onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.04)' : '#F9FAFB'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <span>Advanced</span>
            <span className="text-[10px] normal-case tracking-normal" style={{color: dark ? 'rgba(232,238,248,0.2)' : '#D1D5DB'}}>{advancedOpen ? '▲ collapse' : '▼ expand'}</span>
          </button>
          {advancedOpen && <AdvancedFilters />}
        </div>
      </div>
    </div>
  )
}

// ── Browse Map ────────────────────────────────────────────────────────────────
const BROWSE_HOUSES = [
  { id: 1,  x: 160, y: 140, address: '1142 SW 8th St, Miami, FL 33135',    owner: 'Carlos & Maria Reyes',    homeValue: 485000, equity: 194000, fico: 731, yearsOwned: 9  },
  { id: 2,  x: 215, y: 185, address: '884 SW 12th Ave, Miami, FL 33135',   owner: 'Janet Morales',           homeValue: 420000, equity: 152000, fico: 694, yearsOwned: 6  },
  { id: 3,  x: 270, y: 150, address: '2031 SW 9th St, Miami, FL 33135',    owner: 'Robert & Ann Kim',        homeValue: 512000, equity: 221000, fico: 758, yearsOwned: 14 },
  { id: 4,  x: 320, y: 205, address: '756 SW 14th Ave, Miami, FL 33135',   owner: 'Diana Fernandez',         homeValue: 398000, equity: 118000, fico: 672, yearsOwned: 4  },
  { id: 5,  x: 375, y: 165, address: '1509 SW 6th St, Miami, FL 33135',    owner: 'Miguel Torres',           homeValue: 543000, equity: 267000, fico: 782, yearsOwned: 17 },
  { id: 6,  x: 175, y: 255, address: '630 SW 17th Ave, Miami, FL 33135',   owner: 'Patricia Wu',             homeValue: 361000, equity:  95000, fico: 649, yearsOwned: 3  },
  { id: 7,  x: 240, y: 280, address: '1188 SW 11th St, Miami, FL 33135',   owner: 'James & Laura Hoffman',   homeValue: 449000, equity: 178000, fico: 718, yearsOwned: 8  },
  { id: 8,  x: 310, y: 255, address: '2254 SW 8th St, Miami, FL 33135',    owner: 'Sandra Patel',            homeValue: 477000, equity: 199000, fico: 744, yearsOwned: 11 },
  { id: 9,  x: 360, y: 295, address: '921 SW 16th Ave, Miami, FL 33135',   owner: 'Alfonso & Rosa Diaz',     homeValue: 408000, equity: 131000, fico: 705, yearsOwned: 5  },
  { id: 10, x: 420, y: 210, address: '1735 SW 10th St, Miami, FL 33135',   owner: 'Kevin Nguyen',            homeValue: 527000, equity: 238000, fico: 763, yearsOwned: 13 },
  { id: 11, x: 200, y: 330, address: '572 SW 20th Ave, Miami, FL 33135',   owner: 'Maria Gonzalez',          homeValue: 374000, equity:  87000, fico: 638, yearsOwned: 2  },
  { id: 12, x: 280, y: 355, address: '1362 SW 14th St, Miami, FL 33135',   owner: 'Thomas & Ellen Burke',    homeValue: 462000, equity: 183000, fico: 727, yearsOwned: 10 },
  { id: 13, x: 345, y: 340, address: '2118 SW 12th St, Miami, FL 33135',   owner: 'Rosa Alvarez',            homeValue: 389000, equity: 107000, fico: 681, yearsOwned: 5  },
  { id: 14, x: 410, y: 305, address: '830 SW 22nd Ave, Miami, FL 33135',   owner: 'David & Cynthia Park',    homeValue: 498000, equity: 211000, fico: 749, yearsOwned: 12 },
  { id: 15, x: 460, y: 255, address: '1944 SW 7th St, Miami, FL 33135',    owner: 'Nina Castillo',           homeValue: 556000, equity: 282000, fico: 791, yearsOwned: 18 },
]

const BROWSE_ADDRESS_SUGGESTIONS = [
  '1142 SW 8th St, Miami, FL 33135',
  '884 SW 12th Ave, Miami, FL 33135',
  '2031 SW 9th St, Miami, FL 33135',
  '756 SW 14th Ave, Miami, FL 33135',
  '1509 SW 6th St, Miami, FL 33135',
  '630 SW 17th Ave, Miami, FL 33135',
  '1188 SW 11th St, Miami, FL 33135',
  '2254 SW 8th St, Miami, FL 33135',
  '921 SW 16th Ave, Miami, FL 33135',
  '1735 SW 10th St, Miami, FL 33135',
  '1362 SW 14th St, Miami, FL 33135',
  '2118 SW 12th St, Miami, FL 33135',
]

function BrowseMapView({ onClose }) {
  const [addressQuery, setAddressQuery]         = useState('')
  const [searchFocused, setSearchFocused]       = useState(false)
  const [hoveredHouse, setHoveredHouse]         = useState(null)
  const [mousePos, setMousePos]                 = useState({ x: 0, y: 0 })
  const [selectedIds, setSelectedIds]           = useState(new Set())   // multi-selected house IDs
  const [prescreenIds, setPrescreenIds]         = useState(new Set())   // checked to prescreen
  const [prescreenState, setPrescreenState]     = useState('idle')      // 'idle'|'loading'|'done'
  const [prescreenResults, setPrescreenResults] = useState({})          // id → {qualified, loanAmt, apr, monthly}

  const selectedHouses = BROWSE_HOUSES.filter(h => selectedIds.has(h.id))

  const suggestions = addressQuery.trim().length >= 2
    ? BROWSE_ADDRESS_SUGGESTIONS.filter(a => a.toLowerCase().includes(addressQuery.toLowerCase())).slice(0, 5)
    : []

  function toggleHouse(id) {
    const wasSelected = selectedIds.has(id)
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (wasSelected) next.delete(id); else next.add(id)
      return next
    })
    if (wasSelected) {
      setPrescreenIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
    setPrescreenState('idle')
    setPrescreenResults({})
  }

  function selectAllForPrescreen() {
    setPrescreenIds(new Set(selectedIds))
  }

  function deselectAllForPrescreen() {
    setPrescreenIds(new Set())
  }

  function handleSelectAddress(addr) {
    setAddressQuery(addr)
    setSearchFocused(false)
    const match = BROWSE_HOUSES.find(h => h.address === addr)
    if (match) toggleHouse(match.id)
  }

  function clearAll() {
    setSelectedIds(new Set())
    setPrescreenIds(new Set())
    setPrescreenState('idle')
    setPrescreenResults({})
  }

  function runPrescreen() {
    setPrescreenState('loading')
    setTimeout(() => {
      const results = {}
      selectedHouses.filter(h => prescreenIds.has(h.id)).forEach(h => {
        const qualified = h.fico >= 680 && h.equity >= 100000
        const loanAmt   = Math.round(h.equity * 0.8 / 1000) * 1000
        const apr       = h.fico >= 740 ? 7.49 : h.fico >= 700 ? 8.24 : 9.15
        const monthly   = loanAmt ? Math.round((loanAmt * (apr/100/12)) / (1 - Math.pow(1 + apr/100/12, -120))) : 0
        results[h.id]   = { qualified, loanAmt, apr, monthly }
      })
      setPrescreenResults(results)
      setPrescreenState('done')
    }, 2000)
  }


  return (
    <div className="flex flex-col overflow-hidden" style={{height:'calc(100vh - 3.5rem)'}}>

      {/* Header bar — matches NewCampaignFlow style */}
      <div className="px-8 py-4 flex items-center justify-between shrink-0"
        style={{background:'#fff', borderBottom:'1px solid #F3F4F6'}}>
        <div>
          <h1 className="text-lg font-semibold" style={{color:'#111827'}}>Browse Map</h1>
          <p className="text-sm mt-0.5" style={{color:'#9CA3AF'}}>Draw an area on the map to find homeowners</p>
        </div>
        <button onClick={onClose} className="text-sm transition-colors" style={{color:'#9CA3AF'}}
          onMouseOver={e => e.currentTarget.style.color='#374151'}
          onMouseOut={e => e.currentTarget.style.color='#9CA3AF'}>
          ✕ Close
        </button>
      </div>

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden"
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
    >
      {/* Full-bleed map */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 640 520" preserveAspectRatio="xMidYMid slice">
        <rect width="640" height="520" fill="#ede8de"/>
        <polygon points="590,0 640,0 640,520 570,520 510,400 555,240 530,80" fill="#c2d9ee" opacity="0.7"/>
        <rect x="80" y="140" width="80" height="55" rx="3" fill="#c6d9b0"/>
        <rect x="320" y="290" width="60" height="40" rx="3" fill="#c6d9b0"/>
        <rect x="460" y="120" width="45" height="60" rx="3" fill="#c6d9b0"/>
        {[100,200,300,400].map(y => <line key={y} x1="0" y1={y} x2="590" y2={y} stroke="#ccc4b4" strokeWidth="1.5"/>)}
        {[100,200,300,400,500].map(x => <line key={x} x1={x} y1="0" x2={x} y2="520" stroke="#ccc4b4" strokeWidth="1.5"/>)}
        {[50,150,250,350,450].map(y => <line key={`s${y}`} x1="0" y1={y} x2="590" y2={y} stroke="#d8d2c6" strokeWidth="1"/>)}
        {[50,150,250,350,450,550].map(x => <line key={`sx${x}`} x1={x} y1="0" x2={x} y2="520" stroke="#d8d2c6" strokeWidth="1"/>)}
        {BROWSE_HOUSES.map(h => {
            const sel = selectedIds.has(h.id)
            const hov = hoveredHouse?.id === h.id
            const fill = sel ? '#16a34a' : hov ? '#374151' : '#4b5563'
            return (
              <g key={h.id} style={{cursor:'pointer'}}
                onMouseEnter={() => setHoveredHouse(h)}
                onMouseLeave={() => setHoveredHouse(null)}
                onClick={() => toggleHouse(h.id)}>
                <rect x={h.x-8} y={h.y} width={16} height={12} rx="1.5" fill={fill}/>
                <polygon points={`${h.x},${h.y-7} ${h.x-10},${h.y} ${h.x+10},${h.y}`} fill={fill}/>
                {sel && <circle cx={h.x} cy={h.y+6} r="14" fill="none" stroke="#16a34a" strokeWidth="1.5" opacity="0.5"/>}
              </g>
            )
          })}
      </svg>

      {/* Hover tooltip */}
      {hoveredHouse && !selectedIds.has(hoveredHouse.id) && (
        <div
          className="absolute z-30 pointer-events-none bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-[12px] max-w-[240px]"
          style={{ left: mousePos.x + 14, top: mousePos.y - 10 }}>
          <div className="font-semibold text-gray-900 leading-snug mb-1">{hoveredHouse.address}</div>
          <div className="text-gray-400">Est. equity: <span className="text-emerald-700 font-semibold">${hoveredHouse.equity.toLocaleString()}</span></div>
        </div>
      )}

      {/* Legend chip */}
      <div className="absolute bottom-4 left-[272px] bg-white/90 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] text-gray-500 shadow-sm flex items-center gap-2 z-10">
        <svg width="12" height="14" viewBox="0 0 16 20">
          <rect x="2" y="8" width="12" height="10" rx="1.5" fill="#4b5563"/>
          <polygon points="8,0 0,8 16,8" fill="#4b5563"/>
        </svg>
        Click a house to view property details
      </div>

      {/* Center top — address search bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-80"
        onClick={e => e.stopPropagation()}>
        <div className="relative">
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 h-11"
            style={{background:'#fff', border:'1px solid rgba(0,0,0,0.08)', boxShadow:'0 4px 20px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.1)'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={addressQuery}
              onChange={e => setAddressQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              placeholder="Search address or ZIP code…"
              className="flex-1 bg-transparent text-[13px] text-gray-800 placeholder-gray-400 outline-none"
            />
            {addressQuery && (
              <button onClick={() => { setAddressQuery(''); setSelectedHouse(null); setPrescreenState('idle') }}
                className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
          {searchFocused && suggestions.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 rounded-2xl overflow-hidden z-30"
              style={{background:'#fff', border:'1px solid rgba(0,0,0,0.08)', boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>
              {suggestions.map(addr => (
                <button
                  key={addr}
                  onMouseDown={() => handleSelectAddress(addr)}
                  className="w-full text-left px-4 py-2.5 text-[12px] text-gray-700 flex items-center gap-2.5 transition-colors"
                  style={{borderBottom:'1px solid #F3F4F6'}}
                  onMouseOver={e => e.currentTarget.style.background='#F9FAFB'}
                  onMouseOut={e => e.currentTarget.style.background='transparent'}>
                  <span className="text-gray-300 text-[11px]">📍</span>
                  {addr}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left floating panel — filters */}
      <div className="absolute top-4 left-4 z-[1100] w-60 flex flex-col rounded-2xl overflow-hidden"
        style={{background:'#fff', border:'1px solid rgba(0,0,0,0.09)', boxShadow:'0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)', maxHeight:'calc(100% - 2rem)'}}
        onClick={e => e.stopPropagation()}>
        <FiltersPanel floatMode />
      </div>

      {/* Right floating panel — multi-select + prescreen */}
      <div className="absolute top-4 right-4 bottom-4 z-[1100] w-80 flex flex-col rounded-2xl overflow-hidden"
        style={{background:'#fff', border:'1px solid rgba(0,0,0,0.08)', boxShadow:'0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)'}}>
        {selectedIds.size === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🏠</div>
            <div className="text-sm font-semibold text-gray-700">Select properties</div>
            <div className="text-xs text-gray-400 leading-relaxed">Click houses on the map to select them. You can pick multiple and prescreen them together.</div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 shrink-0 flex flex-col gap-1.5" style={{borderBottom:'1px solid #F3F4F6', background:'#FAFAFA'}}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedIds.size} propert{selectedIds.size !== 1 ? 'ies' : 'y'} selected</span>
                <button onClick={clearAll} className="text-[11px] text-gray-400 transition-colors"
                  onMouseOver={e => e.currentTarget.style.color='#374151'}
                  onMouseOut={e => e.currentTarget.style.color='#9CA3AF'}>Clear all</button>
              </div>
              {prescreenState !== 'done' && (
                <div className="flex items-center gap-2">
                  <button onClick={selectAllForPrescreen}
                    className="text-[11px] font-medium transition-colors"
                    style={{color:'#254BCE'}}
                    onMouseOver={e => e.currentTarget.style.color='#1e3fa8'}
                    onMouseOut={e => e.currentTarget.style.color='#254BCE'}>
                    Select all
                  </button>
                  <span className="text-gray-300 text-[10px]">·</span>
                  <button onClick={deselectAllForPrescreen}
                    className="text-[11px] font-medium transition-colors"
                    style={{color:'#9CA3AF'}}
                    onMouseOver={e => e.currentTarget.style.color='#374151'}
                    onMouseOut={e => e.currentTarget.style.color='#9CA3AF'}>
                    Deselect all
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-2">
              {selectedHouses.map(h => {
                const result = prescreenResults[h.id]
                return (
                  <div key={h.id} className="mx-3 my-1.5 rounded-xl overflow-hidden"
                    style={{border: result ? (result.qualified ? '1px solid rgba(5,150,105,0.2)' : '1px solid #F3F4F6') : '1px solid #F0F0F0', background: result?.qualified ? 'rgba(5,150,105,0.02)' : '#fff'}}>
                    <div className="px-3 py-2.5 flex items-start gap-2.5">
                      {/* Checkbox */}
                      {prescreenState !== 'done' && (
                        <input type="checkbox"
                          checked={prescreenIds.has(h.id)}
                          onChange={e => setPrescreenIds(prev => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(h.id); else next.delete(h.id)
                            return next
                          })}
                          style={{accentColor:'#001660', marginTop:3, flexShrink:0, cursor:'pointer'}}
                        />
                      )}
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-semibold text-gray-900 leading-snug truncate">{h.address}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium text-emerald-700">${(h.equity/1000).toFixed(0)}k equity</span>
                          <span className="text-[10px] text-gray-400">FICO {h.fico}</span>
                        </div>
                        {/* Prescreen result inline */}
                        {result && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div style={{width:5, height:5, borderRadius:'50%', flexShrink:0, background: result.qualified ? '#10B981' : '#D1D5DB'}} />
                            {result.qualified ? (
                              <span className="text-[10px] font-semibold text-emerald-700">${(result.loanAmt/1000).toFixed(0)}k · {result.apr}% APR · ${result.monthly}/mo</span>
                            ) : (
                              <span className="text-[10px] text-gray-400">Does not qualify</span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Deselect */}
                      <button onClick={() => toggleHouse(h.id)}
                        className="text-[11px] shrink-0 mt-0.5 transition-colors"
                        style={{color:'#D1D5DB'}}
                        onMouseOver={e => e.currentTarget.style.color='#9CA3AF'}
                        onMouseOut={e => e.currentTarget.style.color='#D1D5DB'}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer CTA */}
            {prescreenState !== 'done' && (
              <div className="px-4 py-4 shrink-0 flex flex-col gap-2" style={{borderTop:'1px solid #F3F4F6'}}>
                {prescreenState === 'idle' && prescreenIds.size > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    <span>{prescreenIds.size} credit{prescreenIds.size !== 1 ? 's' : ''} · <span className="font-semibold text-gray-600">{QUOTA.user.monthlyRemaining}</span> remaining</span>
                  </div>
                )}
                <button
                  onClick={runPrescreen}
                  disabled={prescreenState === 'loading' || prescreenIds.size === 0}
                  className="w-full px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  onMouseOver={e => { if (prescreenIds.size > 0 && prescreenState !== 'loading') e.currentTarget.style.background='#374151' }}
                  onMouseOut={e => e.currentTarget.style.background='#111827'}>
                  {prescreenState === 'loading' ? (
                    <><span style={{display:'inline-block', animation:'spin 1.2s linear infinite'}}>⟳</span> Running prescreen…</>
                  ) : `Run Prescreen${prescreenIds.size > 0 ? ` (${prescreenIds.size})` : ''}`}
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

function NewCampaignFlow({ onCancel, onLaunch, initialData, initialName = '', leadSearchMode = false, fromPipeline = false, loadCampaignId = '' }) {
  const navigate = useNavigate()
  const { dark } = useTheme()
  const isEdit = !!initialData
  const [step, setStep]               = useState(2)
  const [campaignName, setCampaignName] = useState(initialData?.name ?? initialName ?? 'Miami Westside — March 2026')
  const [campaignType, setCampaignType] = useState('mail')

  // Step 2 state
  const [drawMode, setDrawMode]       = useState(null)
  const [shapeDrawn, setShapeDrawn]   = useState(isEdit)
  const [savingShape, setSavingShape] = useState(false)
  const [shapeSavedId, setShapeSavedId] = useState(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false)
  const [baseLayer, setBaseLayer]     = useState('default') // 'default' | 'satellite'
  const [layersMenuOpen, setLayersMenuOpen] = useState(false)
  const [campaignMenuOpenId, setCampaignMenuOpenId] = useState(null)
  // Browse Map flow (no name pre-entered) starts collapsed; New Campaign modal flow starts expanded.
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(() => leadSearchMode && !initialName && !fromPipeline)
  const [leftEdgeHovered, setLeftEdgeHovered] = useState(false)
  const [renamedCampaigns, setRenamedCampaigns] = useState({})
  const [editingCampaignId, setEditingCampaignId] = useState(null)
  const [draftCampaign, setDraftCampaign] = useState(() =>
    leadSearchMode && initialName ? { tempId: `init-${Date.now()}`, name: initialName } : null
  )

  useEffect(() => {
    if (shapeDrawn && leftPanelCollapsed) setLeftPanelCollapsed(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeDrawn])

  const [projectCost, setProjectCost] = useState('')
  const [addressQuery, setAddressQuery] = useState('')
  const [addressFocused, setAddresseFocused] = useState(false)
  // Live-map state (real Leaflet)
  const [mapShape, setMapShape] = useState(null)             // payload from GeoLeafletMap.onShape
  const [clearShapeSignal, setClearShapeSignal] = useState(0) // bump to imperatively clear the drawn polygon on the map
  const [mapHoveredHomeId, setMapHoveredHomeId] = useState(null) // hovered marker on map → mirror as row hover in list
  const [leafletMap, setLeafletMap] = useState(null) // Leaflet map handle for custom zoom controls
  const [drawerFullScreen, setDrawerFullScreen] = useState(false) // toggles the drawer to cover the entire viewport
  const [drawerMinimized, setDrawerMinimized] = useState(false)   // collapses the drawer to just the stats row
  // Result table — search, sort, and resizable columns
  const [resultSearch, setResultSearch] = useState('')
  const [resultSort, setResultSort] = useState({ key: 'homeValue', dir: 'desc' })
  const [resultColWidths, setResultColWidths] = useState({
    address: 200, apt: 90, city: 110, state: 70, zip: 90, propertyType: 110,
    ownerFirst: 120, ownerLast: 120, homeValue: 120, equity: 130,
    preScreenStatus: 160, crm: 70,
    offerAmt: 160, offerApr: 130, emailPreview: 130, postcardPreview: 130,
    roofSize: 110, arrayCoverage: 140, maxSunshine: 150, propertyAge: 120,
    estProjectCost: 140, maxAnnualDemand: 170, minAnnualDemand: 170,
    maxSolarPanels: 150, minSolarPanels: 150, monthlyBill: 150, avgMonthlyElec: 170,
  })
  const resizingColRef = useRef(null) // { col, startX, startWidth }
  useEffect(() => {
    const onMove = (e) => {
      const r = resizingColRef.current
      if (!r) return
      const dx = e.clientX - r.startX
      const next = Math.max(60, r.startWidth + dx)
      setResultColWidths(prev => ({ ...prev, [r.col]: next }))
    }
    const onUp = () => { resizingColRef.current = null; document.body.style.cursor = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])
  const [mapPct, setMapPct] = useState(88)                    // % of vertical space the top map gets (rest is the bottom results panel)
  const userDraggedSplitRef = useRef(false)                   // once user grabs the divider, stop auto-adjusting
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false) // right-side Saved Campaigns drawer
  const splitContainerRef = useRef(null)
  const draggingSplit = useRef(false)
  const [mapHouseholds, setMapHouseholds] = useState([])     // markers rendered on the map
  const [mapFlyTo, setMapFlyTo] = useState(null)             // [lat, lng, zoom] for programmatic recentering
  const [geoSuggestions, setGeoSuggestions] = useState([])   // Nominatim results
  const [recentAddresses, setRecentAddresses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('glyne:recentAddresses') || '[]') } catch { return [] }
  })
  const rememberAddress = (entry) => {
    if (!entry?.label) return
    setRecentAddresses(prev => {
      const next = [entry, ...prev.filter(e => e.label !== entry.label)].slice(0, 6)
      try { localStorage.setItem('glyne:recentAddresses', JSON.stringify(next)) } catch {}
      return next
    })
  }
  const clearRecentAddresses = () => {
    setRecentAddresses([])
    try { localStorage.removeItem('glyne:recentAddresses') } catch {}
  }
  const [geoLoading, setGeoLoading] = useState(false)
  const geoTimerRef = useRef(null)
  // Address-search → drop-circle modal (2-step: search, then set radius)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchStep, setSearchStep] = useState(1)        // 1 = search, 2 = radius
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([]) // [{label, lat, lng}]
  const [searchSelected, setSearchSelected] = useState(null)
  const [searchRadiusMi, setSearchRadiusMi] = useState(0.5)
  // Real backend counts for the drawn shape (replaces the rough area*800 estimate)
  const [realPropertyCount, setRealPropertyCount] = useState(null)
  const [propertyCountLoading, setPropertyCountLoading] = useState(false)
  // Real properties + analytics returned by get-properties-by-criteria
  const [realAnalytics, setRealAnalytics] = useState(null)
  const [realProperties, setRealProperties] = useState([])
  const refetchTimerRef = useRef(null)
  // Core filter values — managed by FiltersPanel, surfaced here for estimates +
  // for the real `getPropertiesByCriteria` call. Declared up here so the
  // live-refetch useEffect below can read it without TDZ issues.
  const [filterVals, setFilterVals] = useState({ equity: 50, fico: 660, monthsOwned: 24, income: 50, poolFilter: 'any' })
  // Real saved campaigns from this tenant (campaign-collections)
  const [savedCampaigns, setSavedCampaigns] = useState([])
  const [savedCampaignsLoading, setSavedCampaignsLoading] = useState(false)
  const [activeOverlays, setActiveOverlays] = useState([])
  const [showAllOverlays, setShowAllOverlays] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 })
  const [campaignQuery, setCampaignQuery] = useState('')
  const [campaignSort, setCampaignSort] = useState('date') // 'date' | 'props' | 'name'
  const [heatmapMode, setHeatmapMode] = useState(false)
  // Real prescreen quota for the authenticated account.
  const [quotaWidget, setQuotaWidget] = useState(null)
  const [quotaLoading, setQuotaLoading] = useState(false)
  // Authenticated user info — drives the "Open in PMPro" deep-link target + tenant label.
  const [userInfo, setUserInfo] = useState(null)
  useEffect(() => {
    let cancelled = false
    setQuotaLoading(true)
    Promise.all([
      getPrescreenUsageWidget().catch(() => null),
      getUserInfoByToken().catch(() => null),
    ]).then(([q, u]) => {
      if (cancelled) return
      setQuotaWidget(q)
      setUserInfo(u)
    }).finally(() => { if (!cancelled) setQuotaLoading(false) })
    return () => { cancelled = true }
  }, [])
  // Resolve the "Open in PMPro" URL from the live user-info, or fall back to a default.
  const pmproHomeUrl = userInfo?.bank_info?.pmpro_website || 'https://greenlyne.ai/'
  const userBankId = userInfo?.bank_info?.bank_id ?? userInfo?.bank_info?.id ?? null
  // Cache of fetched campaign details so we don't re-hit the API.
  const campaignDetailCache = useRef(new Map())
  // The "focused" campaign — drives the side card in the right panel.
  // Holds both the list row (id, name, created_by_name, …) and the detail (polygon, analytics).
  const [focusedCampaign, setFocusedCampaign] = useState(null)

  // Fetch the tenant's saved campaigns once when the map view opens.
  useEffect(() => {
    let cancelled = false
    setSavedCampaignsLoading(true)
    listSavedCampaigns()
      .then(data => {
        if (cancelled) return
        const arr = Array.isArray(data?.results) ? data.results : []
        setSavedCampaigns(arr)
        // Auto-open the campaign requested via ?load=… (e.g. clicked Edit Campaign).
        if (loadCampaignId) {
          const hit = arr.find(c => String(c.id) === String(loadCampaignId))
          if (hit) handleLoadSavedCampaign(hit)
        }
      })
      .catch(e => console.warn('[geo] listSavedCampaigns', e))
      .finally(() => { if (!cancelled) setSavedCampaignsLoading(false) })
    return () => { cancelled = true }
  }, [loadCampaignId])

  // Live refetch — when filters change while a polygon is drawn, re-run the
  // criteria search after a short debounce so the user sees counts update.
  useEffect(() => {
    if (!mapShape || mapShape.kind === 'circle') return
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
    refetchTimerRef.current = setTimeout(async () => {
      try {
        const isSolar = !!userInfo?.merchant_info?.is_solar
        setPropertyCountLoading(true)
        const propsData = await getPropertiesByCriteria(mapShape.latlngs, {
          filters: filterVals,
          solar: isSolar ? filterVals.solar : null,
        }).catch(() => null)
        if (propsData?.analytics) setRealAnalytics(propsData.analytics)
        if (Array.isArray(propsData?.results) && propsData.results.length > 0) {
          const realMarkers = propsData.results
            .map((p, i) => {
              const lat = p.Latitude ?? p.latitude ?? p.lat ?? null
              const lng = p.Longitude ?? p.longitude ?? p.lng ?? null
              if (typeof lat !== 'number' || typeof lng !== 'number') return null
              const qualified = (p.qualifies ?? p.is_qualified) ??
                ((p.FICO != null && p.AvailableEquity != null)
                  ? (p.FICO >= 660 && p.AvailableEquity >= 50_000) : undefined)
              return {
                id: p.PropertyId ?? p.id ?? `p-${i}`,
                lat, lng,
                address: p.Address || '',
                qualified,
                popupHtml: buildPropertyPopup(p, { qualified }),
              }
            })
            .filter(Boolean)
          if (realMarkers.length > 0) setMapHouseholds(realMarkers)
          setRealProperties(propsData.results)
        }
      } catch (e) { console.warn('[geo] refetch on filter change', e) }
      finally { setPropertyCountLoading(false) }
    }, 500)
    return () => { if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterVals])

  // When heatmap mode flips, recolor every active overlay in place — no refetch.
  useEffect(() => {
    if (activeOverlays.length === 0) return
    setActiveOverlays(prev => prev.map(o => {
      const id = Number(String(o.id).replace('camp-', ''))
      const camp = savedCampaigns.find(c => c.id === id)
      const count = camp?.total_property_count ?? 0
      return { ...o, color: colorForCampaignId(id, count), fitBounds: false }
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapMode])

  async function fetchCampaignDetail(campaign) {
    if (campaignDetailCache.current.has(campaign.id)) {
      return campaignDetailCache.current.get(campaign.id)
    }
    const detail = await getSavedCampaignDetail(campaign.id)
    const r = Array.isArray(detail?.results) && detail.results[0] ? detail.results[0] : null
    campaignDetailCache.current.set(campaign.id, r)
    return r
  }

  function buildOverlayFromDetail(campaign, r, fitBounds) {
    if (!r?.polygon_coordinates || r.polygon_coordinates.length < 3) return null
    const color = colorForCampaignId(campaign.id, campaign.total_property_count)
    const popupHtml = `
      <div class="glp-card">
        <div class="glp-eyebrow">Saved Campaign</div>
        <div class="glp-name">${escapeHtmlSafe(campaign.name || r.name || 'Untitled')}</div>
        <div class="glp-addr">${escapeHtmlSafe(campaign.created_by_name || '')}${campaign.created_at ? ` · ${new Date(campaign.created_at).toLocaleDateString()}` : ''}</div>
        <div class="glp-grid">
          <div class="glp-cell"><div class="glp-key">Selected</div><div class="glp-val">${(r.selected_households ?? 0).toLocaleString()}</div></div>
          <div class="glp-cell"><div class="glp-key">Qualifying</div><div class="glp-val">${(r.qualifying_households ?? 0).toLocaleString()}</div></div>
          <div class="glp-cell"><div class="glp-key">Homeowners</div><div class="glp-val">${(r.qualifying_homeowners ?? 0).toLocaleString()}</div></div>
          <div class="glp-cell"><div class="glp-key">Pre-screen Offers</div><div class="glp-val">${(r.homeowners_with_pre_screen_offer ?? 0).toLocaleString()}</div></div>
        </div>
      </div>
    `
    return {
      id: `camp-${campaign.id}`,
      latlngs: r.polygon_coordinates,
      color,
      name: campaign.name,
      popupHtml,
      fitBounds,
    }
  }

  async function handleDeleteCampaign(campaign) {
    if (!campaign?.id) return
    const ok = typeof window !== 'undefined'
      ? window.confirm(`Delete saved campaign "${campaign.name || `#${campaign.id}`}"?\n\nThis removes it from the backend permanently.`)
      : true
    if (!ok) return
    try {
      await deleteSavedCampaign(campaign.id)
      setSavedCampaigns(prev => prev.filter(c => c.id !== campaign.id))
      // Drop overlay if it's currently on the map
      setActiveOverlays(prev => prev.filter(o => o.id !== `camp-${campaign.id}`))
      if (focusedCampaign?.campaign?.id === campaign.id) setFocusedCampaign(null)
    } catch (e) {
      console.warn('[geo] delete campaign failed', e)
      window.alert(`Delete failed: ${e?.message || 'unknown error'}`)
    }
  }

  async function handleLoadSavedCampaign(campaign) {
    try {
      const r = await fetchCampaignDetail(campaign)
      const overlay = buildOverlayFromDetail(campaign, r, true)
      if (overlay) {
        setActiveOverlays([overlay])
        setFocusedCampaign({ campaign, detail: r })
        if (Array.isArray(r?.polygon_coordinates) && r.polygon_coordinates.length >= 3) {
          const latlngs = r.polygon_coordinates.map(([lng, lat]) => [lat, lng])
          // Wait for activateShapeFromCampaign to finish so its trailing
          // setRealProperties / setHouseholdPhase don't overwrite the read
          // we're about to perform from the saved campaign's cache.
          await activateShapeFromCampaign({
            kind: 'polygon',
            latlngs,
            bbox: bboxFromLatLngs(latlngs),
            areaKm2: 0,
            center: null,
            radius: null,
          })
          const campaignId = r?.id ?? r?.campaign_id
          if (campaignId) {
            liveCollectionIdRef.current = campaign.id
            liveCampaignIdRef.current = campaignId
            setShapeSavedId(campaign.id)
            // Reuse the same full pipeline that "screen a new area" runs —
            // trigger → poll → read. ensureLiveCampaignId short-circuits because
            // liveCampaignIdRef is already set, so no new campaign gets created.
            runLiveHouseholdsFetch({
              kind: 'polygon',
              latlngs,
              bbox: bboxFromLatLngs(latlngs),
              areaKm2: 0,
              center: null,
              radius: null,
            })
          }
        }
      }
    } catch (e) {
      console.warn('[geo] load saved campaign', e)
    }
  }

  /** Holds the campaign id we created for the current shape — once a "Get
   * Households" run succeeds we keep it around so "Prescreen" reuses it. */
  const liveCampaignIdRef = useRef(null)
  const liveCollectionIdRef = useRef(null)

  /** Pretty time for the polling status box: 8s, 1m 12s, 2m 30s, etc. */
  function formatElapsed(seconds) {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s === 0 ? `${m}m` : `${m}m ${s}s`
  }

  /** Convert the current filter-slider values into the integer ranges the
   * backend wants (FICO ≥ 600, equity in dollars, etc.). */
  function filterRanges() {
    const fico   = [Math.max(600, Number(filterVals.fico ?? 660)), 850]
    const equity = [Math.max(0, Number(filterVals.equity ?? 50) * 1000), 99_999_000]
    const months = [Math.max(0, Number(filterVals.monthsOwned ?? 0)), 360]
    return { fico, equity, cltv: [0, 100], monthOwnership: months }
  }

  /** Save → list collections → find by name → fetch detail → grab campaign_id.
   * One round-trip per step. */
  async function ensureLiveCampaignId(shape) {
    if (liveCampaignIdRef.current) return liveCampaignIdRef.current
    const ranges = filterRanges()
    const name = `demo_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    setLiveFetchError(null)
    // 1) Save
    await saveCampaignMail({ name, latlngs: (shape || mapShape).latlngs, ...ranges })
    // 2) Find the collection we just made (small delay so backend has it indexed)
    let collectionId = null
    for (let i = 0; i < 5 && !collectionId; i++) {
      await new Promise(r => setTimeout(r, 700))
      const list = await listSavedCampaigns().catch(() => null)
      const arr = list?.results || list || []
      const hit = arr.find(c => c.name === name)
      if (hit) collectionId = hit.id
    }
    if (!collectionId) throw new Error('Saved campaign appeared but its collection was not visible — try again.')
    // 3) Fetch the collection's first campaign id
    const detail = await getCampaignCollectionDetail(collectionId)
    const camp = (detail?.results || [])[0]
    if (!camp?.id) throw new Error('Campaign created but no campaign_id returned.')
    liveCollectionIdRef.current = collectionId
    liveCampaignIdRef.current   = camp.id
    return camp.id
  }

  /** Poll the campaign status field until the backend marks it done.
   * targetStatuses = e.g. ['Get Household Success', 'Get Household Failed'].
   *
   * Also opportunistically reads rows from the cache after a short warm-up;
   * if the read returns data, we treat that as completion and stop polling
   * — saves the user from having to click "stop & read" manually when the
   * backend gets stuck on the *_Started status forever. */
  async function pollCampaignStatus(targetStatuses, onTick, abortKey, opts = {}) {
    const collectionId = liveCollectionIdRef.current
    const campaignId   = liveCampaignIdRef.current
    if (!collectionId || !campaignId) return { status: null, propsData: null }
    const readEvery   = opts.readEvery   ?? 5  // try a read every N polls
    const readAfter   = opts.readAfter   ?? 5  // wait this many polls before first read
    const readArgs    = opts.readArgs    ?? null
    for (let i = 0; i < 240; i++) {       // up to ~8 min total
      await new Promise(r => setTimeout(r, 2000))
      if (abortKey && liveAbortRef.current[abortKey]) {
        liveAbortRef.current[abortKey] = false
        return { status: 'Aborted', propsData: null }
      }
      const detail = await getCampaignCollectionDetail(collectionId).catch(() => null)
      const c = (detail?.results || []).find(x => x.id === campaignId)
      const status = c?.status || '?'
      onTick?.(status, i)
      if (targetStatuses.includes(status)) return { status, propsData: null }
      // Opportunistic read — once we're past the warm-up phase, every Nth tick
      // attempt a cache read. As soon as backend has written rows, we're done.
      if (readArgs && i >= readAfter && (i - readAfter) % readEvery === 0) {
        const propsData = await getPropertiesForCampaign(readArgs).catch(() => null)
        const rows = Array.isArray(propsData?.results) ? propsData.results : []
        if (rows.length > 0) {
          return { status: `${status} (auto-stopped after rows arrived)`, propsData }
        }
      }
    }
    return { status: 'Timed out', propsData: null }
  }

  function applyResultsToUI(propsData, opts = {}) {
    if (propsData?.analytics) setRealAnalytics(propsData.analytics)
    const results = Array.isArray(propsData?.results) ? propsData.results : []
    // For prescreen runs we want to PRESERVE the original household table —
    // overwriting realProperties with the prescreen response causes rows to
    // disappear when the backend only returns offers for a subset (or none).
    // Instead, we merge prescreen rows in by id and let the existing rows
    // stay visible with status badges layered on top.
    if (!opts.fromPrescreen) {
      setRealProperties(results)
    }
    // If prescreen ran, transition into the "done" view that shows the green
    // qualified cards (matches the demo's prescreen-result panel) — populate
    // prescreenResults from real backend offer fields per row.
    if (opts.fromPrescreen && results.length > 0) {
      // Backend's determine_offer pipeline operates on the whole campaign
      // polygon, so it returns offers for every qualifying home in the area —
      // not just the user's selection. Filter the response to ONLY the
      // households the user actually selected before launching prescreen,
      // matching the user's intent.
      const selectedSet = selectedHouseholds
      const idMap = {}
      const ids   = []
      for (let i = 0; i < results.length; i++) {
        const p = results[i]
        // Match the same id shape realHomes uses so selection / lookups align.
        const id = p.PropertyId ?? p.id ?? `real-${i}`
        if (selectedSet.size > 0 && !selectedSet.has(id)) continue
        const fico    = Number(p.FICO ?? 0)
        const equity  = Number(p.AvailableEquity ?? 0)
        const loanAmt = Number(p.LoanAmount ?? Math.round(equity * 0.8) ?? 0)
        const apr     = Number(p.APR ?? (fico >= 740 ? 7.49 : fico >= 700 ? 8.24 : 9.15))
        const monthly = loanAmt && apr
          ? Math.round((loanAmt * (apr / 100 / 12)) / (1 - Math.pow(1 + apr / 100 / 12, -120)))
          : 0
        const qualified = (p.is_qualified ?? p.qualifies)
          ?? (loanAmt > 0)
        idMap[id] = { qualified: !!qualified, loanAmt, apr, monthly }
        ids.push(id) // preserve original id type (number/string) — Object.keys would coerce all to strings
      }
      console.log('[geo] prescreen complete: rows=', results.length, 'firstId=', ids[0], 'firstResult=', idMap[ids[0]])
      // Merge with existing results — previously this REPLACED the map, which
      // wiped prior prescreens whenever the user ran another one.
      setPrescreenResults(prev => ({ ...prev, ...idMap }))
      // Keep the user's selection intact. The table already shows status dots
      // for any row that has a prescreen result.
      setHouseholdPhase('done')
    }
    const realMarkers = results.map((p, i) => {
      const lat = p.Latitude ?? p.latitude ?? p.lat ?? null
      const lng = p.Longitude ?? p.longitude ?? p.lng ?? null
      if (typeof lat !== 'number' || typeof lng !== 'number') return null
      const qualified = (p.qualifies ?? p.is_qualified) ??
        ((p.FICO != null && p.AvailableEquity != null)
          ? (p.FICO >= 660 && p.AvailableEquity >= 50_000) : undefined)
      return {
        id: p.PropertyId ?? p.id ?? `p-${i}`,
        lat, lng,
        address: p.Address || '',
        qualified,
        popupHtml: buildPropertyPopup(p, { qualified }),
      }
    }).filter(Boolean)
    if (realMarkers.length > 0) setMapHouseholds(realMarkers)
  }

  /** Manual "Get Households" — full PMPro flow:
   *   1. Save campaign (gets campaign_id)
   *   2. Trigger Get Households (fetch_data_only_from_db=false, async)
   *   3. Poll until "Get Household Success"
   *   4. Read results (fetch_data_only_from_db=true)
   */
  async function runLiveHouseholdsFetch(shapeOverride) {
    // Allow callers to pass a shape directly (e.g. right after onShape sets
    // map state — React state isn't yet visible to this function on the same
    // tick), otherwise read from current mapShape state.
    const shape = shapeOverride || mapShape
    console.log('[geo] Get Households (live) clicked. shape:', shape)
    if (!shape) {
      setLiveFetchStatus('error'); setLiveFetchError('Draw a polygon or load a saved campaign first.'); return
    }
    if (!shape.latlngs || shape.latlngs.length < 3) {
      setLiveFetchStatus('error'); setLiveFetchError(`Shape has no polygon coordinates (kind=${shape.kind}). Draw a polygon/rectangle or use the address-search modal.`); return
    }
    setLiveFetchStatus('saving'); setLiveFetchError(null)
    try {
      // Step 2/3: ensure a campaign exists for this shape and we have its id.
      const campaignId = await ensureLiveCampaignId(shape)
      console.log('[geo] using campaign_id =', campaignId)
      const ranges = filterRanges()

      // Step 4: trigger Celery
      setLiveFetchStatus('triggering')
      await getPropertiesForCampaign({ campaignId, ...ranges, mode: 'trigger' })

      // Step 5: poll status (with auto-read while waiting — bypasses needing
      // to click "stop & read" when the backend never flips to Success).
      setLiveFetchStatus('polling')
      const { status: finalStatus, propsData: earlyData } = await pollCampaignStatus(
        ['Get Household Success', 'Get Household Failed'],
        (s, i) => setLiveFetchError(`${s} — ${formatElapsed((i + 1) * 2)} elapsed`),
        'households',
        { readArgs: { campaignId, ...ranges, mode: 'read', pageSize: 100 } }
      )

      // If auto-read already returned data, use it. Otherwise do a final read.
      setLiveFetchStatus('reading')
      setLiveFetchError(finalStatus === 'Get Household Success' || earlyData ? null : `Status: ${finalStatus}. Trying to read whatever is available…`)
      const propsData = earlyData || await getPropertiesForCampaign({ campaignId, ...ranges, mode: 'read', pageSize: 100 }).catch(() => null)
      const rows = Array.isArray(propsData?.results) ? propsData.results : []

      if (rows.length > 0) {
        applyResultsToUI(propsData)
        setLiveFetchStatus('done')
        if (finalStatus !== 'Get Household Success') {
          setLiveFetchError(`Loaded ${rows.length} households (status was "${finalStatus}" — partial result).`)
        }
        return
      }

      // No rows + bad status → genuine failure.
      if (finalStatus === 'Get Household Success') {
        setLiveFetchStatus('done')
        setLiveFetchError('Pipeline finished but returned 0 households. Try a different polygon or relax the filters.')
        return
      }
      setLiveFetchStatus('error')
      setLiveFetchError(
        finalStatus === 'Timed out'
          ? 'Backend pipeline timed out (8 min). Try a smaller polygon, or re-run — the campaign is saved and might finish later.'
          : `Pipeline ended with status "${finalStatus}" and no rows. Try re-running, or use a different polygon.`
      )
    } catch (e) {
      console.warn('[geo] Get Households error', e)
      setLiveFetchStatus('error'); setLiveFetchError(e?.body?.detail || e?.message || 'Live fetch failed')
    }
  }

  /** Manual "Prescreen" — same dance as Get Households but with determineOffer=true.
   * Reuses the campaign_id from a prior Get Households run; if none, runs that first. */
  async function runLivePrescreen() {
    console.log('[geo] Prescreen (live) clicked.')
    if (!mapShape) {
      setLivePrescreenStatus('error'); setLivePrescreenError('Draw a polygon or load a saved campaign first.'); return
    }
    if (!mapShape.latlngs || mapShape.latlngs.length < 3) {
      setLivePrescreenStatus('error'); setLivePrescreenError(`Shape has no polygon coordinates (kind=${mapShape.kind}).`); return
    }
    if (!liveCampaignIdRef.current) {
      setLivePrescreenStatus('error'); setLivePrescreenError('Run "Get Households (live)" first — Prescreen reuses the campaign it creates.'); return
    }
    setLivePrescreenStatus('triggering'); setLivePrescreenError(null)
    try {
      const ranges = filterRanges()
      const campaignId = liveCampaignIdRef.current

      // 7a — trigger
      await getPropertiesForCampaign({ campaignId, ...ranges, mode: 'trigger', determineOffer: true })

      // 7b — poll with auto-read while waiting
      setLivePrescreenStatus('polling')
      const { status: finalStatus, propsData: earlyData } = await pollCampaignStatus(
        ['Offer Determined', 'Offer Determination Failed', 'Get Household Failed'],
        (s, i) => setLivePrescreenError(`${s} — ${formatElapsed((i + 1) * 2)} elapsed`),
        'prescreen',
        { readArgs: { campaignId, ...ranges, mode: 'read', determineOffer: true, pageSize: 100 } }
      )

      setLivePrescreenStatus('reading')
      setLivePrescreenError(finalStatus === 'Offer Determined' || earlyData ? null : `Status: ${finalStatus}. Trying to read whatever is available…`)
      const propsData = earlyData || await getPropertiesForCampaign({ campaignId, ...ranges, mode: 'read', determineOffer: true, pageSize: 100 }).catch(() => null)
      const rows = Array.isArray(propsData?.results) ? propsData.results : []

      if (rows.length > 0) {
        applyResultsToUI(propsData, { fromPrescreen: true })
        setLivePrescreenStatus('done')
        if (finalStatus !== 'Offer Determined') {
          setLivePrescreenError(`Loaded ${rows.length} offers (status was "${finalStatus}" — partial result).`)
        }
        return
      }

      if (finalStatus === 'Offer Determined') {
        setLivePrescreenStatus('done')
        setLivePrescreenError('Pipeline finished but returned 0 offers. Try a different polygon.')
        return
      }
      setLivePrescreenStatus('error')
      setLivePrescreenError(
        finalStatus === 'Timed out'
          ? 'Prescreen pipeline timed out (8 min). Try a smaller polygon, or re-run — credit pulls can be slow.'
          : `Pipeline ended with status "${finalStatus}" and no offers. Try re-running with a smaller polygon.`
      )
    } catch (e) {
      console.warn('[geo] Prescreen error', e)
      setLivePrescreenStatus('error'); setLivePrescreenError(e?.body?.detail || e?.message || 'Prescreen failed')
    }
  }

  /** Treat a polygon (drawn or loaded) as the active shape: fetch real
   * properties + analytics, populate household markers, advance UI to "list" phase. */
  /** Treat a picked address suggestion as a single-house scan. Wraps the
   * address in a small radius polygon and runs the standard household
   * fetch — so the user sees "Scanning area…" → result row(s) in the table. */
  function scanFromAddress(entry) {
    if (!entry?.lat || !entry?.lng) return
    const center = [entry.lat, entry.lng]
    const radiusMeters = 40  // ~40m — typical single-parcel footprint
    const latlngs = circleRingLatLngs(center, radiusMeters, 32)
    const bbox = bboxFromLatLngs(latlngs)
    const shape = {
      kind: 'polygon',
      latlngs, bbox,
      areaKm2: Math.PI * (radiusMeters / 1000) ** 2,
      center, radius: radiusMeters,
    }
    activateShapeFromCampaign(shape)
    setTimeout(() => runLiveHouseholdsFetch(shape), 600)
  }

  async function saveCurrentShapeAsCampaign({ silent = false } = {}) {
    if (!mapShape?.latlngs || mapShape.latlngs.length < 3) return
    const defaultName = `Area ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    // If the user already named the draft (via the "+ New campaign" naming
    // modal, or an existing campaign loaded for edit), skip the redundant prompt.
    const PLACEHOLDER = 'Miami Westside — March 2026'
    const userName = campaignName && campaignName.trim() && campaignName.trim() !== PLACEHOLDER
      ? campaignName.trim() : ''
    const name = userName
      ? userName
      : (silent ? defaultName : window.prompt('Name this campaign:', defaultName))
    if (!name) return
    setSavingShape(true)
    try {
      const ranges = filterRanges()
      await saveCampaignMail({ name, latlngs: mapShape.latlngs, ...ranges })
      const list = await listSavedCampaigns().catch(() => null)
      const arr = list?.results || list || []
      const hit = arr.find(c => c.name === name)
      if (hit) {
        setSavedCampaigns(arr)
        setShapeSavedId(hit.id)
      }
    } catch (e) {
      console.warn('[geo] saveCurrentShapeAsCampaign', e)
      window.alert('Could not save campaign. Check the console for details.')
    } finally {
      setSavingShape(false)
    }
  }

  async function activateShapeFromCampaign(shape) {
    setMapShape(shape)
    setShapeDrawn(true)
    setShapeSavedId(null)
    setEstimatesLoading(true)
    setHouseholdPhase('loading')
    setSelectedHouseholds(new Set())
    setRealPropertyCount(null)
    setRealAnalytics(null)
    setRealProperties([])
    setMapHouseholds([])
    setPropertyCountLoading(true)
    try {
      const isSolar = !!userInfo?.merchant_info?.is_solar
      const [countData, propsData] = await Promise.all([
        getPropertiesCountPolygon(shape.latlngs).catch(() => null),
        getPropertiesByCriteria(shape.latlngs, {
          filters: filterVals,
          solar: isSolar ? filterVals.solar : null,
        }).catch(() => null),
      ])
      const count = countData?.count_of_properties ?? null
      if (typeof count === 'number') setRealPropertyCount(count)
      if (propsData?.analytics) setRealAnalytics(propsData.analytics)
      if (Array.isArray(propsData?.results) && propsData.results.length > 0) {
        const realMarkers = propsData.results
          .map((p, i) => {
            const lat = p.Latitude ?? p.latitude ?? p.lat ?? null
            const lng = p.Longitude ?? p.longitude ?? p.lng ?? null
            if (typeof lat !== 'number' || typeof lng !== 'number') return null
            const qualified = (p.qualifies ?? p.is_qualified) ??
              ((p.FICO != null && p.AvailableEquity != null)
                ? (p.FICO >= 660 && p.AvailableEquity >= 50_000) : undefined)
            return {
              id: p.PropertyId ?? p.id ?? `p-${i}`,
              lat, lng,
              address: p.Address || '',
              qualified,
              popupHtml: buildPropertyPopup(p, { qualified }),
            }
          })
          .filter(Boolean)
        if (realMarkers.length > 0) setMapHouseholds(realMarkers)
        setRealProperties(propsData.results)
      }
    } finally {
      setPropertyCountLoading(false)
      setEstimatesLoading(false)
      setHouseholdPhase('list')
    }
  }

  function bboxFromLatLngs(latlngs) {
    if (!latlngs || latlngs.length === 0) return [0, 0, 0, 0]
    let s = Infinity, w = Infinity, n = -Infinity, e = -Infinity
    for (const [lat, lng] of latlngs) {
      if (lat < s) s = lat
      if (lat > n) n = lat
      if (lng < w) w = lng
      if (lng > e) e = lng
    }
    return [s, w, n, e]
  }

  /**
   * Bulk-load every saved campaign's polygon and overlay them on the map.
   * Runs in batches of 8 in parallel to keep the proxy from drowning, with
   * progress reported to the panel. Cached so re-toggling is instant.
   */
  async function handleToggleAllOverlays() {
    if (showAllOverlays) {
      // Toggle off — clear and bail.
      setShowAllOverlays(false)
      setActiveOverlays([])
      return
    }
    setShowAllOverlays(true)
    setBulkLoading(true)
    // Search-aware: load whatever's currently filtered, not the full list.
    const target = filteredCampaigns
    setBulkProgress({ done: 0, total: target.length })
    const overlays = []
    const BATCH = 8
    for (let i = 0; i < target.length; i += BATCH) {
      const batch = target.slice(i, i + BATCH)
      // eslint-disable-next-line no-await-in-loop
      const details = await Promise.all(batch.map(c => fetchCampaignDetail(c).catch(() => null)))
      details.forEach((r, idx) => {
        const o = buildOverlayFromDetail(batch[idx], r, false)
        if (o) overlays.push(o)
      })
      setBulkProgress({ done: Math.min(i + BATCH, target.length), total: target.length })
      // Live-update the map as batches come in so progress is visible.
      setActiveOverlays(overlays.slice())
    }
    // After everything's loaded, fit to combined bounds.
    if (overlays.length > 0) {
      // Mark the last one as fitBounds=true so the map flies to the union.
      // Better approach: compute combined bbox + use fitBounds. For simplicity,
      // mark the overlay that covers the most area.
      let biggest = overlays[0], biggestArea = 0
      for (const o of overlays) {
        const lats = o.latlngs.map(p => p[1])
        const lngs = o.latlngs.map(p => p[0])
        const area = (Math.max(...lats) - Math.min(...lats)) * (Math.max(...lngs) - Math.min(...lngs))
        if (area > biggestArea) { biggest = o; biggestArea = area }
      }
      biggest.fitBounds = true
      setActiveOverlays(overlays.slice())
    }
    setBulkLoading(false)
  }

  const escapeHtmlSafe = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]))

  // 12 distinct campaign colors — chosen to read cleanly on the light basemap.
  const COLORS_FOR_CAMPAIGN = [
    '#254BCE', '#016163', '#7C3AED', '#DC2626', '#D97706', '#0891B2',
    '#059669', '#BE185D', '#475569', '#9333EA', '#0F766E', '#1F2937',
  ]
  // 6-step sequential heatmap (light → dark navy). Lower index = colder = less.
  const HEATMAP_PALETTE = [
    '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#1e3a8a',
  ]

  /** Min/max property counts across the tenant — used to scale heatmap. */
  const propsRange = (() => {
    if (savedCampaigns.length === 0) return { min: 0, max: 1 }
    let min = Infinity, max = -Infinity
    for (const c of savedCampaigns) {
      const n = c.total_property_count ?? 0
      if (n < min) min = n
      if (n > max) max = n
    }
    return { min: min === Infinity ? 0 : min, max: max < 1 ? 1 : max }
  })()

  function colorByCount(count) {
    const n = Math.max(0, Number(count) || 0)
    const { min, max } = propsRange
    if (max === min) return HEATMAP_PALETTE[Math.floor(HEATMAP_PALETTE.length / 2)]
    const t = (n - min) / (max - min)              // 0..1
    const idx = Math.min(HEATMAP_PALETTE.length - 1, Math.max(0, Math.round(t * (HEATMAP_PALETTE.length - 1))))
    return HEATMAP_PALETTE[idx]
  }

  const CAMPAIGN_COLOR = '#254BCE'
  const colorForCampaignId = (id, count) =>
    heatmapMode ? colorByCount(count) : CAMPAIGN_COLOR

  /** Apply search query + sort to saved campaigns. */
  const filteredCampaigns = (() => {
    const q = campaignQuery.trim().toLowerCase()
    let list = savedCampaigns
    if (q) {
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.created_by_name || '').toLowerCase().includes(q),
      )
    }
    if (campaignSort === 'name') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (campaignSort === 'props') {
      list = [...list].sort((a, b) => (b.total_property_count ?? 0) - (a.total_property_count ?? 0))
    } else {
      // date desc — already comes from API in that order; ensure stability anyway
      list = [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    }
    return list
  })()

  /** Center the map on a single saved campaign without removing other overlays. */
  async function focusSavedCampaign(campaign) {
    try {
      const r = await fetchCampaignDetail(campaign)
      const overlay = buildOverlayFromDetail(campaign, r, true)
      if (!overlay) return
      // If we're showing all, just re-fit to this one without losing the others.
      if (showAllOverlays) {
        setActiveOverlays(prev => prev.map(o => ({ ...o, fitBounds: o.id === overlay.id })))
      } else {
        setActiveOverlays([overlay])
      }
      setFocusedCampaign({ campaign, detail: r })
    } catch (e) {
      console.warn('[geo] focus saved campaign', e)
    }
  }

  /** Polygon click on the map → focus that campaign in the side card. */
  function handleOverlayClick(overlayId) {
    const id = Number(String(overlayId).replace('camp-', ''))
    const campaign = savedCampaigns.find(c => c.id === id)
    if (!campaign) return
    const cached = campaignDetailCache.current.get(id)
    if (cached) setFocusedCampaign({ campaign, detail: cached })
    else fetchCampaignDetail(campaign).then(d => setFocusedCampaign({ campaign, detail: d })).catch(() => {})
  }

  // Debounced live geocoding (Nominatim — free, ~1 req/sec).
  useEffect(() => {
    if (geoTimerRef.current) clearTimeout(geoTimerRef.current)
    if (!addressQuery || addressQuery.trim().length < 3) {
      setGeoSuggestions([])
      setGeoLoading(false)
      return
    }
    setGeoLoading(true)
    geoTimerRef.current = setTimeout(async () => {
      const hits = await geocodeAddress(addressQuery)
      setGeoSuggestions(hits)
      setGeoLoading(false)
    }, 350)
    return () => { if (geoTimerRef.current) clearTimeout(geoTimerRef.current) }
  }, [addressQuery])

  // Edit mode: show existing screened leads from this campaign
  const [showingExistingLeads, setShowingExistingLeads] = useState(isEdit)

  const ADDRESS_SUGGESTIONS = [
    { label: '1201 Brickell Ave, Miami, FL 33131', zip: '33131' },
    { label: '2601 S Bayshore Dr, Miami, FL 33133', zip: '33133' },
    { label: '800 NW 1st Ave, Miami, FL 33136', zip: '33136' },
    { label: '1000 NW 14th St, Miami, FL 33136', zip: '33136' },
    { label: '3250 SW 3rd Ave, Miami, FL 33129', zip: '33129' },
    { label: '501 Brickell Key Dr, Miami, FL 33131', zip: '33131' },
    { label: '1450 NW 10th Ave, Miami, FL 33136', zip: '33136' },
    { label: '100 S Biscayne Blvd, Miami, FL 33131', zip: '33131' },
    { label: 'Coral Gables, FL 33134', zip: '33134' },
    { label: 'Coconut Grove, Miami, FL 33133', zip: '33133' },
    { label: 'Little Havana, Miami, FL 33135', zip: '33135' },
    { label: 'Brickell, Miami, FL 33131', zip: '33131' },
    { label: 'Edgewater, Miami, FL 33132', zip: '33132' },
    { label: 'Wynwood, Miami, FL 33127', zip: '33127' },
    { label: 'Design District, Miami, FL 33137', zip: '33137' },
    { label: '33101 — Miami, FL', zip: '33101' },
    { label: '33125 — Miami, FL (Little Havana)', zip: '33125' },
    { label: '33126 — Miami, FL (Westchester)', zip: '33126' },
    { label: '33127 — Miami, FL (Wynwood)', zip: '33127' },
    { label: '33128 — Miami, FL (Downtown)', zip: '33128' },
    { label: '33130 — Miami, FL (Brickell West)', zip: '33130' },
    { label: '33131 — Miami, FL (Brickell)', zip: '33131' },
    { label: '33132 — Miami, FL (Edgewater)', zip: '33132' },
    { label: '33133 — Miami, FL (Coconut Grove)', zip: '33133' },
    { label: '33134 — Miami, FL (Coral Gables)', zip: '33134' },
  ]

  const addressSuggestions = addressQuery.trim().length >= 2
    ? ADDRESS_SUGGESTIONS.filter(s =>
        s.label.toLowerCase().includes(addressQuery.toLowerCase()) ||
        s.zip.includes(addressQuery)
      ).slice(0, 6)
    : []

  // Loading state for estimates
  const [estimatesLoading, setEstimatesLoading] = useState(false)

  // Household selection + prescreen state
  const [selectedHouseholds, setSelectedHouseholds] = useState(new Set())
  const [hiddenHouseholds, setHiddenHouseholds] = useState(new Set())
  const [outreachMenuOpen, setOutreachMenuOpen] = useState(null) // 'postcard' | 'email' | null
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [householdPhase, setHouseholdPhase] = useState('idle') // 'idle'|'loading'|'list'|'prescreening'|'done'

  // Auto-adjust the split: drawer stays low (~88% map) when idle, and slides up
  // when households/results are populated. Stops auto-adjusting once the user
  // grabs the divider manually so we don't fight their preference.
  useEffect(() => {
    if (userDraggedSplitRef.current) return
    if (householdPhase === 'idle')   setMapPct(88)
    else if (householdPhase === 'loading') setMapPct(70)
    else                              setMapPct(58)
  }, [householdPhase])
  const [prescreenProgress, setPrescreenProgress] = useState(0)
  const [prescreenResults, setPrescreenResults] = useState({}) // id -> { qualified, loanAmt, apr, monthly }
  const [outreachDone, setOutreachDone] = useState({}) // id -> { crm, mail, postcard, email }
  const [highlightedHomeId, setHighlightedHomeId] = useState(null)
  const householdRowsRef = useRef({}) // id -> DOM node, for auto-scroll on highlight
  // Manual "Get Households" / "Prescreen" actions — match production PMPro
  // which requires the user to explicitly trigger the live Altair pipeline.
  const [liveFetchStatus, setLiveFetchStatus] = useState('idle') // idle|loading|done|error
  const [liveFetchError, setLiveFetchError]   = useState(null)
  const [livePrescreenStatus, setLivePrescreenStatus] = useState('idle')
  const [livePrescreenError, setLivePrescreenError]   = useState(null)

  useEffect(() => {
    if (!autoSaveEnabled) return
    if (!shapeDrawn || shapeSavedId) return
    if (!mapShape?.latlngs || mapShape.latlngs.length < 3) return
    if (householdPhase !== 'list' && householdPhase !== 'done') return
    if (savingShape) return
    if (propertyCountLoading) return
    if (['saving','triggering','polling','reading'].includes(liveFetchStatus)) return
    saveCurrentShapeAsCampaign({ silent: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveEnabled, shapeDrawn, shapeSavedId, mapShape, householdPhase, savingShape, propertyCountLoading, liveFetchStatus])

  // Set to true when user clicks "Stop polling" — the polling loop checks this
  // each tick and bails so the function can fall through to the read step.
  const liveAbortRef = useRef({ households: false, prescreen: false })
  const [emailPreview, setEmailPreview] = useState(null) // { home, result } | null
  const [mailPreview, setMailPreview] = useState(null) // { home, result, kind } | null

  // Live estimates (reactive to filters)
  const { equity, fico, monthsOwned, poolFilter, income } = filterVals
  const equityFactor = equity <= 50  ? 1 : Math.max(0.15, 1 - (equity - 50)  / 950)
  const ficoFactor   = fico   <= 660 ? 1 : Math.max(0.25, 1 - (fico   - 660) / 190)
  const poolFactor   = poolFilter === 'with' ? 0.15 : 1
  const ownerFactor  = monthsOwned >= 24 ? 1 : Math.max(0.5, monthsOwned / 48)
  const estQualify = shapeDrawn
    ? Math.max(40, Math.round(2400 * 0.283 * equityFactor * ficoFactor * poolFactor * ownerFactor))
    : null

  // Normalize real backend properties into the same {id, address, owner,
  // equity, fico, homeValue, yearsOwned} shape the UI expects. When the real
  // endpoint returned rows for the drawn shape, use those; otherwise fall
  // back to the demo BROWSE_HOUSES (Miami mock) so something still renders.
  const realHomes = (Array.isArray(realProperties) && realProperties.length > 0)
    ? realProperties.map((p, i) => {
        const num = (v) => (v == null || v === '' ? null : Number(v))
        const firstName = p.OwnerFirstName || p.owner_first_name || null
        const lastName  = p.OwnerLastName  || p.owner_last_name  || null
        const owner = [firstName, lastName].filter(Boolean).join(' ') || p.owner_name || 'Homeowner'
        const street = p.Address || p.address || ''
        const addr   = [street, p.City, p.State, p.ZipCode].filter(Boolean).join(', ') || street
        const fico   = num(p.FICO ?? p.fico) ?? 0
        const eq     = num(p.AvailableEquity ?? p.available_equity) ?? 0
        const home   = num(p.HomeValue ?? p.home_value) ?? 0
        const months = num(p.MonthsOwnership ?? p.months_ownership) ?? 0
        return {
          id: p.PropertyId ?? p.id ?? `real-${i}`,
          address: addr,
          street,
          apt: p.AptSuite || p.apt_suite || null,
          city: p.City || null,
          state: p.State || null,
          zip: p.ZipCode || p.zip_code || null,
          propertyType: p.PropertyType || p.property_type || null,
          ownerFirst: firstName,
          ownerLast: lastName,
          owner,
          equity: eq,
          fico,
          homeValue: home,
          yearsOwned: Math.round(months / 12),
          monthsOwned: months,
          roofSize:        num(p.RoofSizeSqm ?? p.RoofSize ?? p.roof_size_sqm),
          arrayCoverage:   num(p.ArrayCoverageSqm ?? p.ArrayCoverage ?? p.array_coverage_sqm),
          maxSunshine:     num(p.MaxAnnualSunshine ?? p.max_annual_sunshine),
          propertyAge:     num(p.PropertyAge ?? p.property_age),
          estProjectCost:  num(p.EstProjectCost ?? p.est_project_cost),
          maxAnnualDemand: num(p.EstimatedMaximumAnnualDemand ?? p.estimated_maximum_annual_demand),
          minAnnualDemand: num(p.EstimatedMinimumAnnualDemand ?? p.estimated_minimum_annual_demand),
          maxSolarPanels:  num(p.MaxSolarPanelCount ?? p.max_solar_panel_count),
          minSolarPanels:  num(p.MinSolarPanelCount ?? p.min_solar_panel_count),
          monthlyBill:     num(p.MonthlyElectricityBill ?? p.monthly_electricity_bill),
          avgMonthlyElec:  num(p.AverageMonthlyElectricity ?? p.average_monthly_electricity),
          _raw: p,
        }
      })
    : null
  // Real homes only — when the backend returns nothing, we surface an
  // empty-state banner instead of mocking placeholder rows. BROWSE_HOUSES
  // (the demo Miami mock) is used purely as the visual layout when no
  // shape has been drawn yet.
  const sourceHomes = realHomes || (shapeDrawn ? [] : BROWSE_HOUSES)
  // True empty: the fetch has actually settled (no in-flight pipeline) and
  // still returned zero rows. Avoids flashing the empty state during the
  // transition from "loading" → "list" before properties arrive.
  const fetchInFlight = propertyCountLoading
    || ['saving','triggering','polling','reading'].includes(liveFetchStatus)
  const realDataEmpty = shapeDrawn
    && householdPhase !== 'loading'
    && !fetchInFlight
    && (!realHomes || realHomes.length === 0)
  const realDataPending = shapeDrawn
    && (fetchInFlight || (householdPhase === 'list' && (!realHomes || realHomes.length === 0)))
  // Households filtered by left-panel values.
  // When real backend data is loaded, the API already filtered to the
  // user's slider thresholds — re-filtering locally would just hide rows
  // that have null/missing fields. So skip the local filter for real rows.
  const filteredHouses = (realHomes
    ? sourceHomes
    : sourceHomes.filter(h =>
        h.equity >= equity * 1000 &&
        h.fico >= fico &&
        h.yearsOwned >= monthsOwned / 12
      )
  ).filter(h => !hiddenHouseholds.has(h.id))

  function toggleHousehold(id) {
    setSelectedHouseholds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function runPrescreens() {
    setHouseholdPhase('prescreening')
    setPrescreenProgress(0)
    const results = {}
    sourceHomes.filter(h => selectedHouseholds.has(h.id)).forEach(h => {
      const qualified = h.fico >= 680 && h.equity >= 100000
      const loanAmt   = qualified ? Math.round(h.equity * 0.8 / 1000) * 1000 : 0
      const apr       = h.fico >= 740 ? 7.49 : h.fico >= 700 ? 8.24 : 9.15
      const monthly   = loanAmt ? Math.round((loanAmt * (apr/100/12)) / (1 - Math.pow(1 + apr/100/12, -120))) : 0
      results[h.id]   = { qualified, loanAmt, apr, monthly }
    })
    let prog = 0
    const iv = setInterval(() => {
      prog = Math.min(100, prog + Math.random() * 18)
      setPrescreenProgress(Math.round(prog))
      if (prog >= 100) {
        clearInterval(iv)
        setPrescreenResults(results)
        setHouseholdPhase('done')
      }
    }, 140)
  }

  const qualifiedCount   = Object.values(prescreenResults).filter(r => r.qualified).length
  const prescreenedHomes = sourceHomes.filter(h => selectedHouseholds.has(h.id))
  const estimatedCost    = (selectedHouseholds.size * 0.18).toFixed(2)

  const stepSubtitle =
    householdPhase === 'idle'         ? 'Draw an area on the map to find homeowners'
    : householdPhase === 'loading'    ? 'Retrieving households…'
    : householdPhase === 'list'       ? `${selectedHouseholds.size} of ${filteredHouses.length} households selected`
    : householdPhase === 'prescreening' ? 'Running prescreen…'
    : `Prescreen complete — ${qualifiedCount} of ${prescreenedHomes.length} qualified`

  return (
    <div className="flex flex-col overflow-hidden" style={{height:'calc(100vh - 3.5rem)', background: dark ? '#0F172A' : '#F8F9FB'}}>

      {/* Top toolbar — title left, address search center, Draw area / Add circle / Clear area on the right */}
      <div className="py-3 pl-6 pr-6 flex items-center shrink-0"
        style={{background: dark ? '#172340' : '#fff', borderBottom: `1px solid ${dark ? 'rgba(99,140,255,0.12)' : '#F3F4F6'}`}}>
        <div className="shrink-0 flex items-center gap-3" style={{width: 276}}>
          <button onClick={onCancel}
            className="text-[13px] font-semibold transition-colors flex items-center gap-1.5"
            style={{color: dark ? '#638CFF' : '#254BCE', background:'transparent', border:'none', cursor:'pointer', padding:0}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back
          </button>
          <span className="text-[10px]" style={{color: dark ? 'rgba(232,238,248,0.25)' : 'rgba(0,22,96,0.20)'}}>|</span>
          <h1 className="text-[15px] font-bold leading-none" style={{color: dark ? '#E8EEF8' : '#001660', letterSpacing:'-0.01em'}}>
            Geo Prescreen
          </h1>
        </div>
        <div className="flex-1 relative" style={{marginRight: 16}} onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 h-10"
            style={{background: dark ? 'rgba(232,238,248,0.05)' : '#fff', border: `1px solid ${dark ? 'rgba(99,140,255,0.15)' : 'rgba(0,22,96,0.08)'}`}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={dark ? 'rgba(232,238,248,0.4)' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={addressQuery}
              onChange={e => { setAddressQuery(e.target.value); if (e.target.value && focusedCampaign) setFocusedCampaign(null) }}
              onFocus={() => setAddresseFocused(true)}
              onBlur={() => setTimeout(() => setAddresseFocused(false), 150)}
              placeholder="Search address or ZIP code…"
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{color: dark ? '#E8EEF8' : '#1F2937'}}
            />
            {addressQuery && (
              <button onClick={() => setAddressQuery('')} aria-label="Clear search"
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{background: dark ? 'rgba(99,140,255,0.18)' : 'rgba(0,22,96,0.12)', color: dark ? '#E8EEF8' : '#001660', border:'none', cursor:'pointer', padding:0}}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          {addressFocused && (() => {
            const queryActive = addressQuery.trim().length > 0
            const showRecents = !queryActive && recentAddresses.length > 0
            const showResults = queryActive && (geoLoading || geoSuggestions.length > 0)
            if (!showRecents && !showResults) return null
            return (
              <div className="absolute top-full mt-1.5 left-0 right-0 rounded-lg overflow-hidden z-[2000]"
                style={{background: dark ? '#172340' : '#fff', border:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>
                {showRecents && recentAddresses.map((r, i) => (
                  <button key={`r-${i}`}
                    onMouseDown={() => {
                      setAddressQuery(r.label); setAddresseFocused(false)
                      const isSingleHouse = !!r.addr?.house_number
                      setMapFlyTo([r.lat, r.lng, isSingleHouse ? 19 : 15])
                      rememberAddress(r); if (isSingleHouse) scanFromAddress(r)
                    }}
                    className="w-full px-3 py-2 text-left text-[12px] flex items-center gap-2"
                    style={{color: dark ? 'rgba(232,238,248,0.7)' : '#374151', borderBottom:`1px solid ${dark ? 'rgba(99,140,255,0.08)' : '#F3F4F6'}`, background:'transparent', cursor:'pointer'}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{color: dark ? 'rgba(232,238,248,0.35)' : '#9CA3AF'}}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className="truncate">{r.label}</span>
                  </button>
                ))}
                {showResults && geoLoading && (
                  <div className="px-3 py-2 text-[12px]" style={{color: dark ? 'rgba(232,238,248,0.45)' : '#9CA3AF'}}>Searching…</div>
                )}
                {showResults && !geoLoading && geoSuggestions.map((s, i) => (
                  <button key={i}
                    onMouseDown={() => {
                      setAddressQuery(s.label); setAddresseFocused(false)
                      const isSingleHouse = !!s.addr?.house_number
                      setMapFlyTo([s.lat, s.lng, isSingleHouse ? 19 : 15])
                      rememberAddress(s); if (isSingleHouse) scanFromAddress(s)
                    }}
                    className="w-full px-3 py-2 text-left text-[12px] flex items-center gap-2"
                    style={{color: dark ? 'rgba(232,238,248,0.7)' : '#374151', borderBottom:`1px solid ${dark ? 'rgba(99,140,255,0.08)' : '#F3F4F6'}`, background:'transparent', cursor:'pointer'}}>
                    <span style={{color: dark ? 'rgba(232,238,248,0.25)' : '#9CA3AF'}} className="text-[11px]">📍</span>
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            )
          })()}
        </div>
        {(() => {
          const baseBtn = "text-[12px] font-semibold flex items-center gap-1.5 px-3 h-10 rounded-lg transition-colors shrink-0"
          const onStyle  = { background: dark ? 'rgba(99,140,255,0.18)' : 'rgba(37,75,206,0.08)', color: dark ? '#638CFF' : '#254BCE', border: `1px solid ${dark ? 'rgba(99,140,255,0.35)' : 'rgba(37,75,206,0.25)'}`, cursor:'pointer' }
          const offStyle = { background: 'transparent', color: dark ? '#E8EEF8' : '#001660', border: `1px solid ${dark ? 'rgba(99,140,255,0.20)' : 'rgba(0,22,96,0.12)'}`, cursor:'pointer' }
          const offHoverBg = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'
          const onHoverBg  = dark ? 'rgba(99,140,255,0.28)' : 'rgba(37,75,206,0.14)'
          const hoverEnter = (active, disabled = false) => e => {
            if (disabled) return
            e.currentTarget.style.background = active ? onHoverBg : offHoverBg
          }
          const hoverLeave = (active, disabled = false) => e => {
            if (disabled) return
            e.currentTarget.style.background = active ? onStyle.background : 'transparent'
          }
          return (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setDrawMode(drawMode === 'polygon' ? null : 'polygon')}
                onMouseEnter={hoverEnter(drawMode === 'polygon')}
                onMouseLeave={hoverLeave(drawMode === 'polygon')}
                className={baseBtn} style={drawMode === 'polygon' ? onStyle : offStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.17541 16.8263 2.69336 4.65838 14.8789 6.89422l6.428 -5.924982L20.9715 14.552l-9.9477 3.2393"/>
                  <path d="M6.172 19.027a2.641 2.023 0 1 0 5.282 0 2.641 2.023 0 1 0 -5.282 0"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.3477 20.1711c1.7154 0.3318 1.918 1.9094 1.7154 2.8596"/>
                </svg>
                Draw area
              </button>
              <button onClick={() => setDrawMode(drawMode === 'circle' ? null : 'circle')}
                onMouseEnter={hoverEnter(drawMode === 'circle')}
                onMouseLeave={hoverLeave(drawMode === 'circle')}
                className={baseBtn} style={drawMode === 'circle' ? onStyle : offStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.284 16.706a11.1 11.1 0 0 1 -1.18 2.032"/>
                  <path d="M16.938 22.235a7.314 7.314 0 0 1 -1.083 0.459 7.455 7.455 0 0 1 -1.125 0.344"/>
                  <path d="M9.292 23.038a7.49 7.49 0 0 1 -1.125 -0.344 7.314 7.314 0 0 1 -1.083 -0.459"/>
                  <path d="M2.918 18.739a11.132 11.132 0 0 1 -1.179 -2.033"/>
                  <path d="M0.8 11.348a11.1 11.1 0 0 1 0.4 -2.315"/>
                  <path d="M3.924 4.323a12.406 12.406 0 0 1 1.8 -1.518"/>
                  <path d="m10.835 0.945 1.176 -0.062 1.176 0.062"/>
                  <path d="M18.3 2.805a12.452 12.452 0 0 1 1.8 1.518"/>
                  <path d="M22.819 9.033a11.039 11.039 0 0 1 0.4 2.315"/>
                  <path d="M8.261 12.133a3.75 3.75 0 1 0 7.5 0 3.75 3.75 0 1 0 -7.5 0Z"/>
                </svg>
                Add Radius
              </button>
              <button onClick={() => {
                setAddressQuery('')
                setShapeDrawn(false); setDrawMode(null); setMapShape(null)
                setMapHouseholds([]); setHouseholdPhase('idle'); setSelectedHouseholds(new Set())
                setPrescreenResults({}); setOutreachDone({}); setFocusedCampaign(null)
                setClearShapeSignal(n => n + 1)
              }}
                disabled={!shapeDrawn && !addressQuery}
                onMouseEnter={hoverEnter(false, !shapeDrawn && !addressQuery)}
                onMouseLeave={hoverLeave(false, !shapeDrawn && !addressQuery)}
                className={baseBtn}
                style={{ ...offStyle, opacity: (!shapeDrawn && !addressQuery) ? 0.4 : 1, cursor: (!shapeDrawn && !addressQuery) ? 'not-allowed' : 'pointer' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                </svg>
                Clear area
              </button>
            </div>
          )
        })()}
      </div>


      {/* Content — step 2: left Geo Campaigns panel + map area with floating drawer */}
      {step === 2 && (
        <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANEL — Geo Campaigns (collapsible; 8px hint strip remains when collapsed) */}
        <aside className="shrink-0 flex flex-col overflow-hidden border-r relative"
          style={{
            width: leftPanelCollapsed ? 8 : 300,
            background: dark ? '#172340' : '#fff',
            borderColor: dark ? 'rgba(99,140,255,0.12)' : 'rgba(0,22,96,0.08)',
            transition: 'width 280ms cubic-bezier(.4,0,.2,1)',
          }}>
          <div className="px-4 pt-4 pb-3 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[15px] font-bold" style={{color: dark ? '#E8EEF8' : '#001660'}}>Campaigns</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{background: dark ? 'rgba(99,140,255,0.20)' : 'rgba(0,22,96,0.08)', color: dark ? '#E8EEF8' : '#001660'}}>
                {savedCampaigns.length}
              </span>
              <button
                onClick={() => setLeftPanelCollapsed(true)}
                title="Hide campaigns"
                className="ml-auto w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0"
                style={{background: 'transparent', color: dark ? '#E8EEF8' : '#001660', border: `1px solid ${dark ? 'rgba(99,140,255,0.20)' : 'rgba(0,22,96,0.10)'}`, cursor:'pointer'}}
                onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5.25 11.998 18 0"/>
                  <path d="m9 8.248 -3.75 3.75L9 15.748"/>
                  <path d="m0.75 0.748 0 22.5"/>
                </svg>
              </button>
            </div>
            <div className="relative mb-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{color: dark ? 'rgba(232,238,248,0.35)' : '#9CA3AF'}}>
                <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="17" y2="17"/>
              </svg>
              <input
                type="text"
                value={campaignQuery}
                onChange={e => setCampaignQuery(e.target.value)}
                placeholder="Search campaigns"
                className="w-full pl-7 pr-3 py-2 rounded-lg text-[12px] outline-none"
                style={{background: dark ? 'rgba(232,238,248,0.05)' : '#fff', border: `1px solid ${dark ? 'rgba(99,140,255,0.15)' : 'rgba(0,22,96,0.08)'}`, color: dark ? '#E8EEF8' : '#001660'}}
              />
            </div>
            <button
              onClick={() => {
                setAddressQuery('')
                setShapeDrawn(false); setDrawMode(null); setMapShape(null)
                setMapHouseholds([]); setHouseholdPhase('idle'); setSelectedHouseholds(new Set())
                setPrescreenResults({}); setOutreachDone({}); setFocusedCampaign(null)
                setActiveOverlays([]); setShowAllOverlays(false)
                setClearShapeSignal(n => n + 1)
                const tempId = `draft-${Date.now()}`
                setDraftCampaign({ tempId, name: '' })
                setEditingCampaignId(tempId)
              }}
              className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors mb-1"
              style={{color: dark ? '#638CFF' : '#254BCE', background:'transparent', border:'none', padding:0, cursor:'pointer'}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add new campaign
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {savedCampaignsLoading && savedCampaigns.length === 0 && (
              <div className="px-4 py-3 text-[11px]" style={{color: dark ? 'rgba(232,238,248,0.4)' : 'rgba(0,22,96,0.4)'}}>Loading…</div>
            )}
            {!savedCampaignsLoading && savedCampaigns.length === 0 && (
              <div className="px-4 py-3 text-[11px]" style={{color: dark ? 'rgba(232,238,248,0.4)' : 'rgba(0,22,96,0.4)'}}>No campaigns yet.</div>
            )}
            {!savedCampaignsLoading && filteredCampaigns.length === 0 && savedCampaigns.length > 0 && (
              <div className="px-4 py-3 text-[11px]" style={{color: dark ? 'rgba(232,238,248,0.4)' : 'rgba(0,22,96,0.4)'}}>
                No matches for "{campaignQuery}".
              </div>
            )}
            {draftCampaign && (
              <div className="w-full px-4 py-2.5 flex items-start gap-2.5"
                style={{background: dark ? 'rgba(37,75,206,0.10)' : 'rgba(37,75,206,0.04)', borderLeft: `3px solid ${dark ? '#638CFF' : '#254BCE'}`}}>
                <span className="w-3 h-3 rounded-full shrink-0 mt-1"
                  style={{border: `2px dashed ${dark ? '#638CFF' : '#254BCE'}`}} />
                <div className="flex-1 min-w-0">
                  <input
                    autoFocus
                    type="text"
                    value={draftCampaign.name}
                    onChange={e => setDraftCampaign({ ...draftCampaign, name: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.currentTarget.blur() }
                      if (e.key === 'Escape') { setDraftCampaign(null); setEditingCampaignId(null) }
                    }}
                    onBlur={() => setEditingCampaignId(null)}
                    placeholder="New campaign name…"
                    className="w-full bg-transparent outline-none text-[13px] font-semibold"
                    style={{color: dark ? '#E8EEF8' : '#001660', border:'none', borderBottom: `1px solid ${dark ? 'rgba(99,140,255,0.35)' : 'rgba(37,75,206,0.30)'}`, padding:'2px 0'}}
                  />
                  <div className="text-[10.5px] mt-1" style={{color: dark ? 'rgba(232,238,248,0.45)' : 'rgba(0,22,96,0.5)'}}>
                    Draft · draw an area, then save
                  </div>
                </div>
                <button
                  onClick={() => { setDraftCampaign(null); setEditingCampaignId(null) }}
                  className="shrink-0 p-1 rounded"
                  title="Discard draft"
                  style={{color:'#9CA3AF', background:'transparent', border:'none', cursor:'pointer'}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
            {filteredCampaigns.map(c => {
              const isActive = activeOverlays.some(o => o.id === `camp-${c.id}`)
              const isJustSaved = shapeSavedId === c.id
              const dotColor = colorForCampaignId(c.id, c.total_property_count)
              const displayName = renamedCampaigns[c.id] || c.name || `Campaign ${c.id}`
              const isEditing = editingCampaignId === c.id
              return (
                <div key={c.id}
                  role="button" tabIndex={0}
                  onClick={() => isActive ? focusSavedCampaign(c) : handleLoadSavedCampaign(c)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isActive ? focusSavedCampaign(c) : handleLoadSavedCampaign(c) } }}
                  className="group w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer"
                  style={{
                    background: (isActive || isJustSaved) ? (dark ? 'rgba(37,75,206,0.18)' : 'rgba(37,75,206,0.06)') : 'transparent',
                    animation: isJustSaved ? 'ff-flash 1.6s ease-out 1' : 'none',
                    borderLeft: `3px solid ${(isActive || isJustSaved) ? (dark ? '#638CFF' : '#254BCE') : 'transparent'}`,
                  }}
                  onMouseOver={e => { if (!isActive && !isJustSaved) e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.04)' : '#F8F9FB' }}
                  onMouseOut={e => { if (!isActive && !isJustSaved) e.currentTarget.style.background = 'transparent' }}>
                  <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    style={{color: dotColor, opacity: isActive ? 1 : 0.65}}>
                    <path fill="currentColor" d="M12 22c-1.38335 0 -2.68335 -0.2625 -3.9 -0.7875 -1.21665 -0.525 -2.275 -1.2375 -3.175 -2.1375 -0.9 -0.9 -1.6125 -1.95835 -2.1375 -3.175C2.2625 14.68335 2 13.38335 2 12s0.2625 -2.68335 0.7875 -3.9c0.525 -1.21665 1.2375 -2.275 2.1375 -3.175 0.9 -0.9 1.95835 -1.6125 3.175 -2.1375C9.31665 2.2625 10.61665 2 12 2s2.68335 0.2625 3.9 0.7875c1.21665 0.525 2.275 1.2375 3.175 2.1375 0.9 0.9 1.6125 1.95835 2.1375 3.175C21.7375 9.31665 22 10.61665 22 12s-0.2625 2.68335 -0.7875 3.9c-0.525 1.21665 -1.2375 2.275 -2.1375 3.175 -0.9 0.9 -1.95835 1.6125 -3.175 2.1375C14.68335 21.7375 13.38335 22 12 22Zm0 -1.5c1.05 0 2.0375 -0.17085 2.9625 -0.5125 0.925 -0.34165 1.7625 -0.82915 2.5125 -1.4625l-1.8 -1.775c-0.51665 0.38335 -1.08335 0.6875 -1.7 0.9125 -0.61665 0.225 -1.275 0.3375 -1.975 0.3375 -1.66665 0 -3.08335 -0.58335 -4.25 -1.75 -1.16665 -1.16665 -1.75 -2.58335 -1.75 -4.25 0 -1.66665 0.58335 -3.08335 1.75 -4.25 1.16665 -1.16665 2.58335 -1.75 4.25 -1.75 1.66665 0 3.08335 0.58335 4.25 1.75 1.16665 1.16665 1.75 2.58335 1.75 4.25 0 0.7 -0.1125 1.35835 -0.3375 1.975 -0.225 0.61665 -0.52915 1.18335 -0.9125 1.7l1.775 1.775c0.61665 -0.75 1.1 -1.58335 1.45 -2.5 0.35 -0.91665 0.525 -1.9 0.525 -2.95 0 -2.36665 -0.825 -4.375 -2.475 -6.025C16.375 4.325 14.36665 3.5 12 3.5c-2.36665 0 -4.375 0.825 -6.025 2.475C4.325 7.625 3.5 9.63335 3.5 12c0 2.36665 0.825 4.375 2.475 6.025C7.625 19.675 9.63335 20.5 12 20.5Zm0 -4c0.48335 0 0.94585 -0.07085 1.3875 -0.2125s0.84585 -0.34585 1.2125 -0.6125l-1.85 -1.825c-0.11665 0.05 -0.2375 0.0875 -0.3625 0.1125 -0.125 0.025 -0.25415 0.0375 -0.3875 0.0375 -0.55 0 -1.02085 -0.19585 -1.4125 -0.5875C10.19585 13.02085 10 12.55 10 12s0.19585 -1.02085 0.5875 -1.4125C10.97915 10.19585 11.45 10 12 10s1.02085 0.19585 1.4125 0.5875C13.80415 10.97915 14 11.45 14 12c0 0.13335 -0.01665 0.26665 -0.05 0.4 -0.03335 0.13335 -0.075 0.26665 -0.125 0.4l1.85 1.8c0.26665 -0.36665 0.47085 -0.77085 0.6125 -1.2125 0.14165 -0.44165 0.2125 -0.90415 0.2125 -1.3875 0 -1.25 -0.4375 -2.3125 -1.3125 -3.1875S13.25 7.5 12 7.5s-2.3125 0.4375 -3.1875 1.3125S7.5 10.75 7.5 12s0.4375 2.3125 1.3125 3.1875S10.75 16.5 12 16.5Z"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="text"
                            defaultValue={displayName}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                              e.stopPropagation()
                              if (e.key === 'Enter') { e.currentTarget.blur() }
                              if (e.key === 'Escape') { setEditingCampaignId(null) }
                            }}
                            onBlur={e => {
                              const v = e.target.value.trim()
                              if (v) setRenamedCampaigns(prev => ({ ...prev, [c.id]: v }))
                              setEditingCampaignId(null)
                            }}
                            className="flex-1 min-w-0 bg-transparent outline-none text-[13px] font-semibold"
                            style={{color: dark ? '#E8EEF8' : '#001660', border:'none', borderBottom: `1px solid ${dark ? 'rgba(99,140,255,0.35)' : 'rgba(37,75,206,0.30)'}`, padding:'1px 0'}}
                          />
                          <button
                            type="button"
                            title="Save name"
                            onMouseDown={e => e.preventDefault()}
                            onClick={e => {
                              e.stopPropagation()
                              const input = e.currentTarget.previousElementSibling
                              if (input && input.blur) input.blur()
                            }}
                            className="shrink-0 inline-flex items-center justify-center transition-colors"
                            style={{width:22, height:22, borderRadius:6, background:'#10B981', color:'#fff', border:'none', cursor:'pointer'}}
                            onMouseOver={e => e.currentTarget.style.background = '#059669'}
                            onMouseOut={e => e.currentTarget.style.background = '#10B981'}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="text-[13px] font-semibold truncate flex-1 min-w-0" style={{color: dark ? '#E8EEF8' : '#001660'}}>
                          {displayName}
                        </div>
                      )}
                      <div className="text-[13px] font-bold tabular-nums shrink-0" style={{color: dark ? '#E8EEF8' : '#001660', letterSpacing:'-0.01em'}}>
                        {(c.total_property_count ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <div className="text-[10.5px] truncate flex-1 min-w-0" style={{color: dark ? 'rgba(232,238,248,0.45)' : 'rgba(0,22,96,0.5)'}}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : ''}
                        {isActive && (
                          <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{background: dark ? 'rgba(99,140,255,0.20)' : 'rgba(37,75,206,0.10)', color: dark ? '#638CFF' : '#254BCE'}}>
                            This area
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative shrink-0 -mr-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setCampaignMenuOpenId(campaignMenuOpenId === c.id ? null : c.id)}
                      className={`${campaignMenuOpenId === c.id ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity p-1 rounded`}
                      title="More actions"
                      style={{color:'#9CA3AF', background:'transparent', border:'none', cursor:'pointer'}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                        <circle cx="19" cy="12" r="1.5" fill="currentColor"/>
                      </svg>
                    </button>
                    {campaignMenuOpenId === c.id && (
                      <>
                        <div className="fixed inset-0 z-[1500]" onClick={() => setCampaignMenuOpenId(null)} />
                        <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-[1600]"
                          style={{background: dark ? '#172340' : '#fff', border: `1px solid ${dark ? 'rgba(99,140,255,0.18)' : 'rgba(0,22,96,0.08)'}`, boxShadow: '0 8px 24px rgba(0,22,96,0.15)', minWidth: 180}}>
                          <button
                            onClick={() => { setCampaignMenuOpenId(null); setEditingCampaignId(c.id) }}
                            className="w-full text-left text-[12px] flex items-center gap-2 px-3 py-2 transition-colors"
                            style={{color: dark ? '#E8EEF8' : '#001660', background:'transparent', border:'none', cursor:'pointer'}}
                            onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/>
                            </svg>
                            Rename campaign
                          </button>
                          <button
                            onClick={async () => {
                              setCampaignMenuOpenId(null)
                              try {
                                const detail = await getCampaignCollectionDetail(c.id).catch(() => null)
                                const inner = (detail?.results || [])[0]
                                let rowsCsv = ''
                                if (inner?.id) {
                                  const propsData = await getPropertiesForCampaign({ campaignId: inner.id, mode: 'read', pageSize: 500 }).catch(() => null)
                                  const rows = propsData?.results || []
                                  if (rows.length > 0) {
                                    const headers = ['Address','City','State','Zip','Owner First','Owner Last','Home Value','Available Equity','FICO','Months Owned']
                                    const data = rows.map(p => [
                                      p.Address || '', p.City || '', p.State || '', p.ZipCode || '',
                                      p.OwnerFirstName || '', p.OwnerLastName || '',
                                      p.HomeValue ?? '', p.AvailableEquity ?? '',
                                      p.FICO ?? '', p.MonthsOwnership ?? '',
                                    ])
                                    rowsCsv = [headers, ...data].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
                                  }
                                }
                                if (!rowsCsv) {
                                  rowsCsv = [['Name','Created','Total Properties'], [c.name || `Campaign ${c.id}`, c.created_at || '', c.total_property_count ?? '']].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
                                }
                                const blob = new Blob([rowsCsv], { type: 'text/csv;charset=utf-8;' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                const safe = (c.name || `campaign-${c.id}`).replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
                                a.href = url; a.download = `${safe}.csv`
                                document.body.appendChild(a); a.click(); document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                              } catch (e) {
                                console.warn('[geo] download campaign', e)
                                window.alert('Could not download. See console.')
                              }
                            }}
                            className="w-full text-left text-[12px] flex items-center gap-2 px-3 py-2 transition-colors"
                            style={{color: dark ? '#E8EEF8' : '#001660', background:'transparent', border:'none', borderTop:`1px solid ${dark ? 'rgba(99,140,255,0.10)' : 'rgba(0,22,96,0.06)'}`, cursor:'pointer'}}
                            onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Download campaign
                          </button>
                          <button
                            onClick={() => { setCampaignMenuOpenId(null); handleDeleteCampaign(c) }}
                            className="w-full text-left text-[12px] flex items-center gap-2 px-3 py-2 transition-colors"
                            style={{color:'#DC2626', background:'transparent', border:'none', borderTop:`1px solid ${dark ? 'rgba(99,140,255,0.10)' : 'rgba(0,22,96,0.06)'}`, cursor:'pointer'}}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Delete campaign
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {leftPanelCollapsed && (
          <div
            onMouseEnter={() => setLeftEdgeHovered(true)}
            onMouseLeave={() => setLeftEdgeHovered(false)}
            className="absolute z-[1400]"
            style={{ top: 0, bottom: 0, left: -10, width: 28 }}>
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              title="Show campaigns"
              className="absolute flex items-center justify-center"
              style={{
                top: 12, left: 0,
                width: 28, height: 28, borderRadius: 8,
                background: dark ? '#172340' : '#fff',
                color: dark ? '#E8EEF8' : '#001660',
                border: `1px solid ${dark ? 'rgba(99,140,255,0.20)' : 'rgba(0,22,96,0.10)'}`,
                boxShadow: '0 4px 14px rgba(0,22,96,0.10)',
                cursor: 'pointer', padding: 0,
                opacity: leftEdgeHovered ? 1 : 0,
                pointerEvents: leftEdgeHovered ? 'auto' : 'none',
                transition: 'opacity 180ms ease, background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
              onMouseOut={e => e.currentTarget.style.background = dark ? '#172340' : '#fff'}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}

        <div ref={splitContainerRef} className="flex-1 relative overflow-hidden">

        {/* Map section — full bleed; drawer floats above it */}
        <div className="absolute inset-0 overflow-hidden">

          {/* Map area — real Leaflet map, fills the top section */}
          <div className="absolute inset-0 overflow-hidden">
            <GeoLeafletMap
              center={[39.0997, -94.5786]}   /* Kansas City — FBKC tenant data coverage */
              zoom={11}
              drawMode={drawMode}
              clearShapeSignal={clearShapeSignal}
              flyTo={mapFlyTo}
              overlays={activeOverlays}
              onOverlayClick={handleOverlayClick}
              households={mapHouseholds}
              selectedHousehold={highlightedHomeId}
              selectedHouseholdIds={selectedHouseholds}
              onMapReady={setLeafletMap}
              baseLayer={baseLayer}
              radarPing={(() => {
                // Only animate the radar while we're scanning the area for households.
                // Prescreen targets specific selected homes, not the polygon, so the
                // radar sweep is misleading there.
                const inFlight = ['saving','triggering','polling','reading'].includes(liveFetchStatus)
                              || householdPhase === 'loading'
                if (!inFlight) return null
                if (!mapShape || !mapShape.center) return null
                // For polygons drawn freehand we don't know a clean radius;
                // derive an approximate one from bbox so the radar still scans.
                let radius = mapShape.radius
                if (!radius && Array.isArray(mapShape.bbox) && mapShape.bbox.length === 4) {
                  const [s, w, n, e] = mapShape.bbox
                  const latM = 111_320, lngM = 111_320 * Math.cos((s + n) / 2 * Math.PI / 180)
                  const dy = (n - s) * latM, dx = (e - w) * lngM
                  radius = 0.5 * Math.sqrt(dx*dx + dy*dy)
                }
                if (!radius) return null
                // Pass the polygon vertices so the radar wedge is clipped to
                // the user's custom shape (no round halo bleeding outside).
                const polygon = Array.isArray(mapShape.latlngs) && mapShape.latlngs.length >= 3
                  ? mapShape.latlngs
                  : null
                return { center: mapShape.center, radius, polygon }
              })()}
              onHoverHousehold={(id) => {
                setMapHoveredHomeId(id)
                if (id) {
                  const node = householdRowsRef.current[id]
                  if (node && typeof node.scrollIntoView === 'function') {
                    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }
                }
              }}
              onSelectHousehold={(id) => {
                setHighlightedHomeId(id)
                const node = householdRowsRef.current[id]
                if (node && typeof node.scrollIntoView === 'function') {
                  node.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              onShape={(rawShape) => {
                // The live backend pipeline only accepts polygon coordinates.
                // Convert a directly-drawn circle into a 64-segment polygon ring
                // so the rest of the flow (fetch + prescreen) treats it identically.
                const shape = rawShape?.kind === 'circle' && rawShape.center && rawShape.radius
                  ? {
                      kind: 'polygon',
                      latlngs: circleRingLatLngs(rawShape.center, rawShape.radius, 64),
                      bbox: rawShape.bbox,
                      areaKm2: rawShape.areaKm2,
                      center: rawShape.center,
                      radius: rawShape.radius,
                    }
                  : rawShape
                setMapShape(shape)
                setDrawMode(null)
                setShapeDrawn(true)
                setShapeSavedId(null)
                setEstimatesLoading(true)
                setHouseholdPhase('loading')
                setSelectedHouseholds(new Set())
                setRealPropertyCount(null)
                setRealAnalytics(null)
                setFocusedCampaign(null)
                setRealProperties([])
                setPropertyCountLoading(true)
                // Reset live-pipeline state — fresh shape needs a fresh campaign.
                liveCampaignIdRef.current = null
                liveCollectionIdRef.current = null
                setLiveFetchStatus('idle'); setLiveFetchError(null)
                setLivePrescreenStatus('idle'); setLivePrescreenError(null)
                // Wait for real backend results — no placeholder dots so
                // demo never shows fake data alongside real data.
                setMapHouseholds([])
                // Fire both real-data calls in parallel: a fast count and the
                // full criteria search (which also returns analytics).
                ;(async () => {
                  try {
                    const isSolar = !!userInfo?.merchant_info?.is_solar
                    const [countData, propsData] = await Promise.all([
                      shape.kind === 'circle'
                        ? getPropertiesCountCircle(shape.center, shape.radius)
                        : getPropertiesCountPolygon(shape.latlngs),
                      shape.kind === 'circle'
                        ? Promise.resolve(null)   // criteria endpoint requires polygon, skip for circle
                        : getPropertiesByCriteria(shape.latlngs, {
                            filters: filterVals,
                            solar: isSolar ? filterVals.solar : null,
                          }).catch(() => null),
                    ])
                    const count = countData?.count_of_properties ?? countData?.total_property_count ?? countData?.count ?? null
                    if (typeof count === 'number') setRealPropertyCount(count)
                    if (propsData?.analytics) setRealAnalytics(propsData.analytics)
                    if (Array.isArray(propsData?.results) && propsData.results.length > 0) {
                      const realMarkers = propsData.results
                        .map((p, i) => {
                          const lat = p.Latitude ?? p.latitude ?? p.lat ?? null
                          const lng = p.Longitude ?? p.longitude ?? p.lng ?? null
                          if (typeof lat !== 'number' || typeof lng !== 'number') return null
                          // Backend doesn't always tag qualification per-row in the
                          // DB-only fetch; infer from FICO + equity if missing.
                          const qualified = (p.qualifies ?? p.is_qualified) ??
                            ((p.FICO != null && p.AvailableEquity != null)
                              ? (p.FICO >= 660 && p.AvailableEquity >= 50_000)
                              : undefined)
                          return {
                            id: p.PropertyId ?? p.id ?? `p-${i}`,
                            lat, lng,
                            address: p.Address || p.address || '',
                            qualified,
                            popupHtml: buildPropertyPopup(p, { qualified }),
                          }
                        })
                        .filter(Boolean)
                      if (realMarkers.length > 0) setMapHouseholds(realMarkers)
                      setRealProperties(propsData.results)
                    }
                  } catch (e) {
                    console.warn('[geo] real-data fetch failed', e)
                  } finally {
                    setPropertyCountLoading(false)
                  }
                })()
                setTimeout(() => {
                  setEstimatesLoading(false)
                  setHouseholdPhase('list')
                  // Kick off the full live pipeline (Save → Trigger → Poll → Read)
                  // automatically when the user finishes drawing a polygon.
                  // Skip if it isn't a polygon (e.g. a circle from address-search,
                  // which has its own activate-from-campaign path).
                  if (shape?.kind === 'polygon' && Array.isArray(shape?.latlngs) && shape.latlngs.length >= 3) {
                    runLiveHouseholdsFetch(shape)
                  }
                }, 1200)
              }}
              onClearShape={() => {
                setShapeDrawn(false)
                setMapShape(null)
                setMapHouseholds([])
                setHouseholdPhase('idle')
                setSelectedHouseholds(new Set())
                setPrescreenResults({})
                setOutreachDone({})
                setFocusedCampaign(null)
              }}
            >
              {/* Right-side vertical tools — draw shape only (Leaflet provides zoom in top-right) */}
              {false && step === 2 && (
                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2"
                  onClick={e => e.stopPropagation()}>
                  {/* Draw tools */}
                  <div className="flex flex-col rounded-lg shadow-md overflow-hidden"
                    style={{background: dark ? '#172340' : '#fff', border:'none'}}>
                    {[
                      { key: 'polygon', icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8.17541 16.8263 2.69336 4.65838 14.8789 6.89422l6.428 -5.924982L20.9715 14.552l-9.9477 3.2393"/>
                          <path d="M6.172 19.027a2.641 2.023 0 1 0 5.282 0 2.641 2.023 0 1 0 -5.282 0"/>
                          <path d="M11.3477 20.1711c1.7154 0.3318 1.918 1.9094 1.7154 2.8596"/>
                        </svg>
                      ), label: 'Draw polygon area' },
                      { key: 'circle', icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9"/>
                          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                        </svg>
                      ), label: 'Draw circle area — click center, drag radius' },
                      { key: 'address', icon: (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                      ), label: 'Search address / ZIP — drop circle' },
                    ].map(({ key, icon, label }, idx, arr) => (
                      <button key={key}
                        title={label}
                        onClick={() => {
                          if (key === 'address') {
                            setSearchStep(1); setSearchQuery(''); setSearchResults([]); setSearchSelected(null); setSearchRadiusMi(0.5); setSearchModalOpen(true)
                            return
                          }
                          setDrawMode(drawMode === key ? null : key)
                        }}
                        style={{
                          width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.1s',
                          borderBottom: idx < arr.length - 1 ? `1px solid ${dark ? 'rgba(99,140,255,0.12)' : '#F3F4F6'}` : 'none',
                          background: drawMode === key ? (dark ? '#638CFF' : '#111827') : 'transparent',
                          color: drawMode === key ? '#fff' : (dark ? 'rgba(232,238,248,0.5)' : '#6B7280'),
                        }}
                        onMouseOver={e => { if (drawMode !== key) e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F3F4F6' }}
                        onMouseOut={e => { if (drawMode !== key) e.currentTarget.style.background = 'transparent' }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                  {/* Zoom controls — sit directly under the draw tools so the user always sees them, even with the drawer expanded. */}
                  <div className="flex flex-col rounded-lg shadow-md overflow-hidden"
                    style={{background: dark ? '#172340' : '#fff', border:'none'}}>
                    {[
                      { key: 'in',  label: 'Zoom in',  fn: () => leafletMap?.zoomIn(),  icon: <line x1="12" y1="5" x2="12" y2="19" /> },
                      { key: 'out', label: 'Zoom out', fn: () => leafletMap?.zoomOut(), icon: null },
                    ].map((b, i) => (
                      <button key={b.key}
                        title={b.label}
                        onClick={b.fn}
                        style={{
                          width:42, height:36, display:'flex', alignItems:'center', justifyContent:'center',
                          background: 'transparent', color: dark ? 'rgba(232,238,248,0.7)' : '#374151',
                          border: 'none', cursor: 'pointer',
                          borderBottom: i === 0 ? `1px solid ${dark ? 'rgba(99,140,255,0.12)' : '#F3F4F6'}` : 'none',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F3F4F6' }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          {b.icon}
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live callout removed from the map — summary now lives in the bottom drawer toolbar. */}

              {step === 2 && !drawMode && !shapeDrawn && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-gray-400 bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200 whitespace-nowrap z-[400]">
                  Use a drawing tool to select an area
                </div>
              )}

              {/* Right-side floating map controls — current location, layers, zoom in/out */}
              {step === 2 && (() => {
                const btnBase = {
                  width: 36, height: 36,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background: dark ? '#172340' : '#fff',
                  color: dark ? '#E8EEF8' : '#001660',
                  border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'background 0.15s',
                }
                const groupShadow = '0 4px 14px rgba(0,22,96,0.10), 0 1px 3px rgba(0,22,96,0.06)'
                const locateMe = () => {
                  if (!navigator.geolocation) return
                  navigator.geolocation.getCurrentPosition(
                    pos => setMapFlyTo([pos.coords.latitude, pos.coords.longitude, 15]),
                    err => console.warn('[geo] locateMe', err),
                    { enableHighAccuracy: true, timeout: 8000 }
                  )
                }
                return (
                  <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                    <button title="My location" onClick={locateMe}
                      style={{...btnBase, borderRadius: 10, boxShadow: groupShadow}}
                      onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
                      onMouseOut={e => e.currentTarget.style.background = dark ? '#172340' : '#fff'}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3.2" fill="currentColor"/>
                        <circle cx="12" cy="12" r="8"/>
                        <line x1="12" y1="2" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22"/>
                        <line x1="2" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22" y2="12"/>
                      </svg>
                    </button>
                    <div className="relative">
                      <button title="Map layers" onClick={() => setLayersMenuOpen(v => !v)}
                        style={{...btnBase, borderRadius: 10, boxShadow: groupShadow}}
                        onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
                        onMouseOut={e => e.currentTarget.style.background = dark ? '#172340' : '#fff'}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 22 7 12 12 2 7 12 2"/>
                          <polyline points="2 17 12 22 22 17"/>
                          <polyline points="2 12 12 17 22 12"/>
                        </svg>
                      </button>
                      {layersMenuOpen && (
                        <div className="absolute right-full mr-2 top-0 rounded-xl overflow-hidden flex"
                          style={{background: dark ? '#172340' : '#fff', boxShadow: groupShadow, padding: 6, gap: 4}}>
                          {[
                            { id: 'default', label: 'Map', preview: 'linear-gradient(135deg, #E8F0E4, #DDE7EC)' },
                            { id: 'satellite', label: 'Satellite', preview: 'linear-gradient(135deg, #475569, #1F2937)' },
                          ].map(opt => {
                            const on = baseLayer === opt.id
                            return (
                              <button key={opt.id}
                                onClick={() => { setBaseLayer(opt.id); setLayersMenuOpen(false) }}
                                className="flex flex-col items-center gap-1 p-1.5 rounded-lg"
                                style={{
                                  background: on ? (dark ? 'rgba(99,140,255,0.18)' : 'rgba(37,75,206,0.08)') : 'transparent',
                                  border: `2px solid ${on ? (dark ? '#638CFF' : '#254BCE') : 'transparent'}`,
                                  cursor: 'pointer',
                                }}>
                                <div style={{width: 50, height: 36, borderRadius: 6, background: opt.preview}} />
                                <span className="text-[10px] font-semibold" style={{color: on ? (dark ? '#638CFF' : '#254BCE') : (dark ? 'rgba(232,238,248,0.7)' : 'rgba(0,22,96,0.7)')}}>
                                  {opt.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden" style={{borderRadius: 10, boxShadow: groupShadow, background: dark ? '#172340' : '#fff'}}>
                      <button title="Zoom in" onClick={() => leafletMap?.zoomIn()}
                        style={{...btnBase, borderRadius: 0, borderBottom: `1px solid ${dark ? 'rgba(99,140,255,0.12)' : '#F0F2F5'}`}}
                        onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
                        onMouseOut={e => e.currentTarget.style.background = dark ? '#172340' : '#fff'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                      <button title="Zoom out" onClick={() => leafletMap?.zoomOut()}
                        style={{...btnBase, borderRadius: 0}}
                        onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
                        onMouseOut={e => e.currentTarget.style.background = dark ? '#172340' : '#fff'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })()}
            </GeoLeafletMap>
          </div>

          {false && (
          <div className="absolute top-4 z-[1000]" style={{left: 284, width: 640}}
            onClick={e => e.stopPropagation()}>
            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 h-11"
                style={{background: dark ? '#172340' : '#fff', border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.1)'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? 'rgba(232,238,248,0.35)' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={addressQuery}
                  onChange={e => {
                    setAddressQuery(e.target.value)
                    if (e.target.value && focusedCampaign) setFocusedCampaign(null)
                  }}
                  onFocus={() => setAddresseFocused(true)}
                  onBlur={() => setTimeout(() => setAddresseFocused(false), 150)}
                  placeholder="Search address or ZIP code…"
                  className="flex-1 bg-transparent outline-none text-[17px]"
                  style={{color: dark ? '#E8EEF8' : '#1F2937'}}
                />
                {(addressQuery || shapeDrawn) && (
                  <button
                    onClick={() => {
                      setAddressQuery('')
                      // Also tear down the drawn shape + any loaded households so the
                      // X behaves as a single "reset selection" action.
                      setShapeDrawn(false)
                      setDrawMode(null)
                      setMapShape(null)
                      setMapHouseholds([])
                      setHouseholdPhase('idle')
                      setSelectedHouseholds(new Set())
                      setPrescreenResults({})
                      setOutreachDone({})
                      setFocusedCampaign(null)
                      setClearShapeSignal(n => n + 1)
                    }}
                    aria-label="Clear search and selected area"
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0"
                    style={{
                      background: dark ? 'rgba(99,140,255,0.18)' : '#001660',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = dark ? 'rgba(99,140,255,0.30)' : '#254BCE' }}
                    onMouseOut={e => { e.currentTarget.style.background = dark ? 'rgba(99,140,255,0.18)' : '#001660' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                      <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
              {addressFocused && (() => {
                const queryActive = addressQuery.trim().length > 0
                const showRecents = !queryActive && recentAddresses.length > 0
                const showResults = queryActive && (geoLoading || geoSuggestions.length > 0)
                if (!showRecents && !showResults) return null
                return (
                  <div className="absolute top-full mt-1.5 left-0 right-0 rounded-2xl overflow-hidden z-[500]"
                    style={{background: dark ? '#172340' : '#fff', border:'none', boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>
                    {showRecents && (
                      <>
                        <div className="px-4 pt-2.5 pb-1.5 flex items-center justify-between"
                          style={{borderBottom:`1px solid ${dark ? 'rgba(99,140,255,0.10)' : '#F3F4F6'}`}}>
                          <span className="text-[9.5px] font-bold uppercase tracking-widest"
                            style={{color: dark ? 'rgba(232,238,248,0.45)' : 'rgba(0,22,96,0.45)'}}>
                            Recent searches
                          </span>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); clearRecentAddresses() }}
                            className="text-[10px] font-semibold transition-colors"
                            style={{color: dark ? 'rgba(232,238,248,0.4)' : 'rgba(0,22,96,0.4)', background:'transparent', border:'none', cursor:'pointer'}}
                            title="Clear recent searches">
                            Clear
                          </button>
                        </div>
                        {recentAddresses.map((r, i) => (
                          <button key={`r-${i}`}
                            onMouseDown={() => {
                              setAddressQuery(r.label)
                              setAddresseFocused(false)
                              const isSingleHouse = !!r.addr?.house_number
                              setMapFlyTo([r.lat, r.lng, isSingleHouse ? 19 : 15])
                              rememberAddress(r)
                              if (isSingleHouse) scanFromAddress(r)
                            }}
                            className="w-full px-4 py-2.5 text-left text-[12px] flex items-center gap-2.5"
                            style={{color: dark ? 'rgba(232,238,248,0.7)' : '#374151', borderBottom:`1px solid ${dark ? 'rgba(99,140,255,0.08)' : '#F3F4F6'}`}}
                            onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.05)' : '#F9FAFB'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              className="shrink-0" style={{color: dark ? 'rgba(232,238,248,0.35)' : '#9CA3AF'}}>
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            <span className="truncate">{r.label}</span>
                          </button>
                        ))}
                      </>
                    )}
                    {showResults && geoLoading && (
                      <div className="px-4 py-2.5 text-[12px]" style={{color: dark ? 'rgba(232,238,248,0.45)' : '#9CA3AF'}}>Searching…</div>
                    )}
                    {showResults && !geoLoading && geoSuggestions.map((s, i) => (
                      <button key={i}
                        onMouseDown={() => {
                          setAddressQuery(s.label)
                          setAddresseFocused(false)
                          const isSingleHouse = !!s.addr?.house_number
                          setMapFlyTo([s.lat, s.lng, isSingleHouse ? 19 : 15])
                          rememberAddress(s)
                          if (isSingleHouse) scanFromAddress(s)
                        }}
                        className="w-full px-4 py-2.5 text-left text-[12px] flex items-center gap-2.5"
                        style={{color: dark ? 'rgba(232,238,248,0.7)' : '#374151', borderBottom:`1px solid ${dark ? 'rgba(99,140,255,0.08)' : '#F3F4F6'}`}}
                        onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.05)' : '#F9FAFB'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{color: dark ? 'rgba(232,238,248,0.25)' : '#9CA3AF'}} className="text-[11px] shrink-0">📍</span>
                        <span className="truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
          )}

          {/* Left floating panel — filters.
              Idle: height fits content.
              Minimized drawer: bottom anchored just above the minimized pill.
              Normal: bottom snaps to the drawer's top edge (mapPct%).
              Fullscreen drawer: filter is fully obscured anyway; leave it as-is. */}
          {/* Collapsed pill — morphs in from where the panel sits */}
          <button
            className="absolute top-4 left-4 z-[1100] rounded-full flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold"
            onClick={e => { e.stopPropagation(); setFiltersCollapsed(false) }}
            style={{
              background: dark ? '#172340' : '#fff',
              color: dark ? '#E8EEF8' : '#001660',
              border: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10)',
              cursor: filtersCollapsed ? 'pointer' : 'default',
              opacity: filtersCollapsed ? 1 : 0,
              transform: filtersCollapsed ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.85)',
              pointerEvents: filtersCollapsed ? 'auto' : 'none',
              transformOrigin: 'top left',
              transitionProperty: 'opacity, transform',
              transitionDuration: filtersCollapsed ? '340ms' : '180ms',
              transitionDelay:    filtersCollapsed ? '140ms' : '0ms',
              transitionTimingFunction: filtersCollapsed ? 'cubic-bezier(.34,1.42,.64,1)' : 'cubic-bezier(.4,0,.2,1)',
              willChange: 'opacity, transform',
            }}
            title="Show filters">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </button>
          {/* Expanded filter panel — graceful shrink to pill on collapse, gentle pop on expand */}
          <div className="absolute top-4 left-4 z-[1100] w-64 flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: dark ? '#172340' : '#fff',
              border: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
              ...(householdPhase === 'idle'
                ? {}
                : drawerMinimized
                  ? { bottom: 116 }
                  : drawerFullScreen
                    ? { bottom: 16 }
                    : { bottom: `calc(${100 - mapPct}% + 24px)` }),
              opacity: filtersCollapsed ? 0 : 1,
              transform: filtersCollapsed ? 'translateY(-4px) scale(0.84)' : 'translateY(0) scale(1)',
              pointerEvents: filtersCollapsed ? 'none' : 'auto',
              transformOrigin: 'top left',
              transitionProperty: 'opacity, transform, bottom',
              transitionDuration: filtersCollapsed ? '240ms, 240ms, 500ms' : '380ms, 380ms, 500ms',
              transitionDelay:    filtersCollapsed ? '0ms, 0ms, 0ms'      : '100ms, 100ms, 0ms',
              transitionTimingFunction: filtersCollapsed
                ? 'cubic-bezier(.4,0,.2,1), cubic-bezier(.4,0,.2,1), cubic-bezier(.4,0,.2,1)'
                : 'cubic-bezier(.34,1.42,.64,1), cubic-bezier(.34,1.42,.64,1), cubic-bezier(.4,0,.2,1)',
              willChange: 'opacity, transform',
            }}
            onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setFiltersCollapsed(true)}
              className="absolute top-2.5 right-2.5 z-[1] p-1 rounded transition-colors"
              title="Collapse filters"
              style={{color: dark ? 'rgba(232,238,248,0.55)' : 'rgba(0,22,96,0.55)', background:'transparent', border:'none', cursor:'pointer'}}
              onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F8F9FB'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <FiltersPanel onCoreChange={setFilterVals} floatMode />
          </div>

          {/* Saved Campaigns drawer — opens from the right when the header button is clicked. */}
          {savedDrawerOpen && (<>
          <div onClick={() => setSavedDrawerOpen(false)}
            className="absolute inset-0 z-[1190]"
            style={{background: 'rgba(0,0,0,0.25)'}} />
          <div className="absolute top-0 right-0 bottom-0 z-[1200] w-[360px] flex flex-col overflow-hidden"
            style={{background: dark ? '#172340' : '#fff', borderLeft: 'none', boxShadow: '-8px 0 32px rgba(0,0,0,0.18)'}}
            onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b" style={{borderColor: dark ? 'rgba(99,140,255,0.12)' : 'rgba(0,0,0,0.06)'}}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{color: dark ? 'rgba(232,238,248,0.55)' : 'rgba(0,22,96,0.55)'}}>
                  Saved Campaigns
                </span>
              </div>
              {/* Search input */}
              <div className="relative mb-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                  className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{color: dark ? 'rgba(232,238,248,0.35)' : '#9CA3AF'}}>
                  <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="17" y2="17"/>
                </svg>
                <input
                  type="text"
                  value={campaignQuery}
                  onChange={e => setCampaignQuery(e.target.value)}
                  placeholder="Search by name or creator…"
                  className="w-full pl-7 pr-7 py-1.5 rounded-md text-[11px] outline-none"
                  style={{
                    background: dark ? 'rgba(232,238,248,0.05)' : '#F9FAFB',
                    border: `1px solid ${dark ? 'rgba(99,140,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
                    color: dark ? '#E8EEF8' : '#001660',
                  }}
                />
                {campaignQuery && (
                  <button onClick={() => setCampaignQuery('')}
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{background:'rgba(0,22,96,0.10)', color: dark ? 'rgba(232,238,248,0.6)' : '#6B7280', border:'none', cursor:'pointer', padding:0}}>
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {savedCampaignsLoading && savedCampaigns.length === 0 && (
                <div className="px-4 py-3 text-[11px]" style={{color: dark ? 'rgba(232,238,248,0.4)' : 'rgba(0,22,96,0.4)'}}>
                  Loading…
                </div>
              )}
              {!savedCampaignsLoading && savedCampaigns.length === 0 && (
                <div className="px-4 py-3 text-[11px]" style={{color: dark ? 'rgba(232,238,248,0.4)' : 'rgba(0,22,96,0.4)'}}>
                  No campaigns from this tenant yet.
                </div>
              )}
              {!savedCampaignsLoading && filteredCampaigns.length === 0 && savedCampaigns.length > 0 && (
                <div className="px-4 py-3 text-[11px]" style={{color: dark ? 'rgba(232,238,248,0.4)' : 'rgba(0,22,96,0.4)'}}>
                  No matches for "{campaignQuery}".
                </div>
              )}
              {filteredCampaigns.map(c => {
                const isActive = activeOverlays.some(o => o.id === `camp-${c.id}`)
                const dotColor = colorForCampaignId(c.id, c.total_property_count)
                return (
                  <div key={c.id}
                    role="button" tabIndex={0}
                    onClick={() => isActive ? focusSavedCampaign(c) : handleLoadSavedCampaign(c)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isActive ? focusSavedCampaign(c) : handleLoadSavedCampaign(c) } }}
                    className="group w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer"
                    style={{
                      background: isActive ? (dark ? 'rgba(37,75,206,0.18)' : 'rgba(37,75,206,0.06)') : 'transparent',
                      borderBottom: `1px solid ${dark ? 'rgba(99,140,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                    }}
                    onMouseOver={e => { if (!isActive) e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.04)' : '#F9FAFB' }}
                    onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                      style={{
                        background: dotColor,
                        opacity: isActive ? 1 : 0.4,
                        boxShadow: isActive ? `0 0 0 2px ${dotColor}33` : 'none',
                      }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold truncate" style={{color: dark ? '#E8EEF8' : '#001660'}}>
                        {c.name || `Campaign ${c.id}`}
                      </div>
                      <div className="text-[10px] mt-0.5 truncate" style={{color: dark ? 'rgba(232,238,248,0.45)' : 'rgba(0,22,96,0.5)'}}>
                        {(c.total_property_count ?? 0).toLocaleString()} properties
                        {c.created_at ? ` · ${new Date(c.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}` : ''}
                        {c.created_by_name ? ` · ${c.created_by_name.split(' ')[0]}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteCampaign(c) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1 p-1 rounded"
                      title="Delete this saved campaign"
                      style={{color:'#9CA3AF', background:'transparent', border:'none'}}
                      onMouseOver={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.08)' }}
                      onMouseOut={e => { e.currentTarget.style.color = '#9CA3AF'; e.currentTarget.style.background = 'transparent' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
            {activeOverlays.length > 0 && (
              <div className="px-4 py-2 border-t flex items-center justify-end" style={{borderColor: dark ? 'rgba(99,140,255,0.12)' : 'rgba(0,0,0,0.06)'}}>
                <button onClick={() => { setActiveOverlays([]); setShowAllOverlays(false) }}
                  className="text-[10px] font-semibold transition-colors"
                  style={{color: dark ? '#FCA5A5' : '#DC2626'}}>
                  Clear
                </button>
              </div>
            )}
          </div>
          </>)}

        {/* End of TOP map section. Divider follows, then BOTTOM results panel. */}
        </div>

        {/* FLOATING DRAWER — overlays the map, anchored to the bottom.
            Idle: compact centered bubble that fits its content (doesn't sit over filters or zoom).
            Active: full-width panel with side margins; expands to ~50% (drag to resize). */}
        <div className="absolute z-[1100] flex flex-col overflow-hidden"
          style={(() => {
            // Use top/left/right/bottom for non-idle states so all four edges
            // can interpolate cleanly between non-fullscreen and fullscreen.
            const isIdle = householdPhase === 'idle'
            if (isIdle) {
              return {
                left: '50%', transform: 'translateX(-50%)', bottom: 14,
                width: 'auto', height: 44, minHeight: 44,
                background: dark ? '#172340' : '#fff',
                borderRadius: 999, border: 'none',
                boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 12px 36px rgba(0,22,96,0.16), 0 2px 8px rgba(0,22,96,0.06)',
                transition: 'border-radius 360ms cubic-bezier(.2,.7,.2,1)',
              }
            }
            // Compute top% so we can animate top/left/right/bottom uniformly.
            const topPct = drawerFullScreen ? 0 : (drawerMinimized ? null : mapPct)
            return {
              top:    drawerFullScreen ? 0
                    : drawerMinimized   ? 'calc(100% - 104px)'  // 92 (height) + 12 (bottom margin)
                    : `${mapPct}%`,
              left:   drawerFullScreen ? 0 : 12,
              right:  drawerFullScreen ? 0 : 12,
              bottom: drawerFullScreen ? 0 : 12,
              minHeight: drawerMinimized ? 92 : 220,
              background: dark ? '#172340' : '#fff',
              borderRadius: drawerFullScreen ? 0 : 22,
              border: 'none',
              boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 12px 36px rgba(0,22,96,0.16), 0 2px 8px rgba(0,22,96,0.06)',
              willChange: 'top, bottom, left, right, border-radius',
              transition: 'top 500ms cubic-bezier(.4,0,.2,1), left 500ms cubic-bezier(.4,0,.2,1), right 500ms cubic-bezier(.4,0,.2,1), bottom 500ms cubic-bezier(.4,0,.2,1), border-radius 500ms cubic-bezier(.4,0,.2,1)',
            }
          })()}>

          {/* Idle state — compact pill content sized to fit */}
          {householdPhase === 'idle' && (
            <div className="flex items-center justify-center gap-2 px-5 h-full whitespace-nowrap select-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{color: dark ? 'rgba(232,238,248,0.45)' : '#9CA3AF'}}>
                <path d="M8.17 16.83L2.69 4.66l12.19 2.24 6.43-5.93L20.97 14.55l-9.95 3.24"/>
              </svg>
              <span className="text-[13px] font-medium" style={{color: dark ? 'rgba(232,238,248,0.7)' : '#6B7280'}}>
                Define area to see Households
              </span>
            </div>
          )}

          {/* Window controls — pinned to the drawer's top-right corner, above all content */}
          {householdPhase !== 'idle' && (
            <div className="absolute top-2 right-3 z-20 flex items-center gap-1">
              <button onClick={() => { setDrawerMinimized(v => !v); if (!drawerMinimized) setDrawerFullScreen(false) }}
                title={drawerMinimized ? 'Expand panel' : 'Minimize to stats only'}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                style={{background:'transparent', border:'none', color:'#6B7280', cursor:'pointer'}}
                onMouseOver={e => e.currentTarget.style.background = '#F3F4F6'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {drawerMinimized
                    ? <><polyline points="6 9 12 15 18 9"/></>
                    : <><line x1="5" y1="12" x2="19" y2="12"/></>}
                </svg>
              </button>
              <button onClick={() => { setDrawerFullScreen(v => !v); if (!drawerFullScreen) setDrawerMinimized(false) }}
                title={drawerFullScreen ? 'Exit full screen' : 'Expand to full screen'}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                style={{background:'transparent', border:'none', color:'#6B7280', cursor:'pointer'}}
                onMouseOver={e => e.currentTarget.style.background = '#F3F4F6'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                {drawerFullScreen ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Action buttons — pinned under the window controls so they're
              always anchored to the drawer's top-right corner. */}
          {/* Cancel-prescreen pill moved into the action row — keep this hidden. */}
          {false && householdPhase !== 'idle' && !drawerMinimized && ['triggering','polling','reading'].includes(livePrescreenStatus) && (
            <div className="absolute top-12 right-3 z-20">
              <button
                onClick={() => { liveAbortRef.current.prescreen = true }}
                className="text-[12px] font-semibold rounded-full flex items-center justify-center gap-1.5 transition-colors"
                style={{padding: '8px 16px', minWidth: 124, background: '#fff', color: '#DC2626', border: '1px solid rgba(220,38,38,0.4)', cursor:'pointer'}}
                title="Stop the prescreen pipeline and use whatever results have arrived so far.">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                </svg>
                <span>Cancel prescreen</span>
              </button>
            </div>
          )}

          {/* Active drawer — original panel rendered when not idle */}
          {householdPhase !== 'idle' && (
          <div className="absolute inset-0 flex flex-col overflow-hidden">

            {/* Drag handle row — pill grabber, drags the divider */}
            <div
              onMouseDown={(e) => {
                e.preventDefault()
                draggingSplit.current = true
                userDraggedSplitRef.current = true   // disable auto-adjust once the user takes manual control
                const startY = e.clientY
                const startPct = mapPct
                const rect = splitContainerRef.current?.getBoundingClientRect()
                const total = rect ? rect.height : window.innerHeight
                const onMove = (ev) => {
                  if (!draggingSplit.current) return
                  const dy = ev.clientY - startY
                  const next = Math.min(80, Math.max(20, startPct + (dy / total) * 100))
                  setMapPct(next)
                }
                const onUp = () => {
                  draggingSplit.current = false
                  window.removeEventListener('mousemove', onMove)
                  window.removeEventListener('mouseup', onUp)
                  document.body.style.cursor = ''
                  document.body.style.userSelect = ''
                }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
                document.body.style.cursor = 'row-resize'
                document.body.style.userSelect = 'none'
              }}
              className="shrink-0 flex items-center justify-center cursor-row-resize select-none"
              style={{ height: 18, paddingTop: 4 }}>
              <div style={{
                width: 44, height: 4, borderRadius: 999,
                background: dark ? 'rgba(232,238,248,0.30)' : 'rgba(0,22,96,0.18)',
              }} />
            </div>


            {/* Session header + Prescreen quota moved to the top navbar — bottom panel is results-only now. */}


            {/* ── EDIT MODE: existing screened leads ── */}
            {showingExistingLeads && (() => {
              const leads = CAMPAIGN_LEADS[initialData?.id] || []
              const hotCount  = leads.filter(l => l.status === 'hot').length
              const engCount  = leads.filter(l => ['engaged','contacted'].includes(l.status)).length
              return (
                <>
                  <div className="px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Screened Leads</span>
                      <span className="text-[10px] text-gray-400">{leads.length} qualified</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <div style={{background:'rgba(5,150,105,0.07)', borderRadius:8, padding:'7px 8px', border:'1px solid rgba(5,150,105,0.12)'}}>
                        <div style={{fontSize:20, fontWeight:700, color:'#059669', lineHeight:1, letterSpacing:'-0.03em'}}>{leads.length}</div>
                        <div style={{fontSize:9.5, color:'#6EE7B7', fontWeight:600, marginTop:2}}>Qualified</div>
                      </div>
                      <div style={{background:'rgba(220,38,38,0.06)', borderRadius:8, padding:'7px 8px', border:'1px solid rgba(220,38,38,0.1)'}}>
                        <div style={{fontSize:20, fontWeight:700, color:'#DC2626', lineHeight:1, letterSpacing:'-0.03em'}}>{hotCount}</div>
                        <div style={{fontSize:9.5, color:'#FCA5A5', fontWeight:600, marginTop:2}}>Hot</div>
                      </div>
                      <div style={{background:'rgba(37,75,206,0.05)', borderRadius:8, padding:'7px 8px', border:'1px solid rgba(37,75,206,0.1)'}}>
                        <div style={{fontSize:20, fontWeight:700, color:'#254BCE', lineHeight:1, letterSpacing:'-0.03em'}}>{engCount}</div>
                        <div style={{fontSize:9.5, color:'#93C5FD', fontWeight:600, marginTop:2}}>Engaged</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto" style={{background:'#FAFAFA'}}>
                    {leads.map(lead => {
                      const sm = STATUS_META[lead.status] || STATUS_META.qualified
                      return (
                        <div key={lead.id} style={{margin:'8px 10px', borderRadius:10, background:'#fff', border:'1px solid rgba(5,150,105,0.12)', overflow:'hidden'}}>
                          <div style={{padding:'10px 12px', display:'flex', flexDirection:'column', gap:4}}>
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:6}}>
                              <span style={{fontSize:12, fontWeight:600, color:'#111827', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{lead.name}</span>
                              <span style={{fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background: sm.bg, color: sm.color, whiteSpace:'nowrap', flexShrink:0}}>
                                {sm.label}
                              </span>
                            </div>
                            <div style={{fontSize:10.5, color:'#9CA3AF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{lead.address}</div>
                            <div style={{display:'flex', alignItems:'center', gap:8, marginTop:2}}>
                              <span style={{fontSize:14, fontWeight:700, color:'#059669', letterSpacing:'-0.02em'}}>{lead.offer}</span>
                              <span style={{fontSize:10, color:'#9CA3AF'}}>FICO {lead.fico}</span>
                              <span style={{fontSize:10, color:'#9CA3AF'}}>Equity {lead.equity}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Sticky re-run button */}
                  <div className="px-4 py-4 border-t border-gray-100 shrink-0 bg-white">
                    <button
                      onClick={() => { setShowingExistingLeads(false); setHouseholdPhase('list') }}
                      style={{width:'100%', padding:'10px', fontSize:13, fontWeight:700, background:'#254BCE', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.91"/></svg>
                      Adjust Filters & Re-run Prescreen
                    </button>
                  </div>
                </>
              )
            })()}

            {/* ── IDLE: no area drawn yet ── */}
            {!showingExistingLeads && householdPhase === 'idle' && (
              <>
                <div className="px-5 py-3 border-b border-gray-100 shrink-0">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Households</h3>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="border border-dashed border-gray-200 rounded-xl px-5 py-8 text-center mx-5">
                    <div className="text-2xl mb-2">🗺</div>
                    <p className="text-[12px] font-medium text-gray-500 mb-1">Define an area to get started</p>
                  </div>
                </div>
              </>
            )}

            {/* ── LOADING: retrieving households ── */}
            {!showingExistingLeads && householdPhase === 'loading' && (
              <>
                <div className="px-5 py-3 border-b border-gray-100 shrink-0 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin shrink-0" />
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Retrieving Households…</h3>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  {[92, 68, 75, 55, 80, 60, 70, 50, 85, 65].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded bg-gray-100 animate-pulse shrink-0" />
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="h-2.5 bg-gray-100 rounded animate-pulse" style={{width:`${w}%`}} />
                        <div className="h-2 bg-gray-100 rounded animate-pulse" style={{width:`${w * 0.6}%`}} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── LIST: select households ── */}
            {!showingExistingLeads && (householdPhase === 'list' || householdPhase === 'done') && (() => {
              // Stats for the top row.
              // The analytics endpoint sometimes returns 0 for qualifying even when
              // the loaded household list has rows — those rows ARE the qualifying
              // homeowners. Trust them as the source of truth, then fall back to
              // analytics, then to a rough 35% estimate.
              const homesCount = realPropertyCount
              const analyticsQual = realAnalytics
                ? (realAnalytics.count_of_qualifying_homeowners ?? realAnalytics.count_of_qualifying_households ?? null)
                : null
              const loadedRowsCount = Array.isArray(realProperties) && realProperties.length > 0 ? realProperties.length : null
              // Prescreen-derived counts (only meaningful after Run Prescreen)
              const prescreenedIds = Object.keys(prescreenResults)
              const prescreenQualified = prescreenedIds.filter(id => prescreenResults[id]?.qualified).length
              const isDone = householdPhase === 'done' && prescreenedIds.length > 0
              const qualifyingCount = isDone
                ? prescreenQualified
                : (loadedRowsCount != null && loadedRowsCount > 0) ? loadedRowsCount
                : (analyticsQual != null && analyticsQual > 0)   ? analyticsQual
                : (homesCount != null && !propertyCountLoading)  ? Math.round(homesCount * 0.35)
                : null
              const notQualified = isDone
                ? Math.max(0, prescreenedIds.length - prescreenQualified)
                : (homesCount != null && qualifyingCount != null) ? Math.max(0, homesCount - qualifyingCount) : null
              const medValue = realAnalytics?.median_home_value > 0 ? realAnalytics.median_home_value : null
              const medEquity = realAnalytics?.median_home_equity > 0 ? realAnalytics.median_home_equity : null
              return (
              <>
                {/* Top stats row */}
                <div className="px-6 pt-3 pb-3 relative shrink-0 flex items-start gap-8 flex-wrap">
                  {homesCount != null && (
                    <div className="flex flex-col">
                      <span className="text-[22px] font-bold tabular-nums leading-none" style={{color:'#001660', letterSpacing:'-0.03em'}}>
                        {homesCount.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-medium mt-1.5" style={{color:'rgba(0,22,96,0.55)'}}>Homes in area</span>
                    </div>
                  )}
                  {notQualified != null && (
                    <div className="flex flex-col">
                      <span className="text-[22px] font-bold tabular-nums leading-none" style={{color:'rgba(0,22,96,0.55)', letterSpacing:'-0.03em'}}>
                        {notQualified.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-medium mt-1.5" style={{color:'rgba(0,22,96,0.55)'}}>Not qualified</span>
                    </div>
                  )}
                  {qualifyingCount != null && (
                    <div className="flex flex-col">
                      <span className="text-[22px] font-bold tabular-nums leading-none" style={{color:'#059669', letterSpacing:'-0.03em'}}>
                        {qualifyingCount.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-semibold mt-1.5" style={{color:'#059669'}}>Qualifying</span>
                    </div>
                  )}
                  {medValue && (
                    <div className="flex flex-col">
                      <span className="text-[22px] font-bold tabular-nums leading-none" style={{color:'#001660', letterSpacing:'-0.03em'}}>
                        ${(medValue/1000).toFixed(0)}k
                      </span>
                      <span className="text-[11px] font-medium mt-1.5" style={{color:'rgba(0,22,96,0.55)'}}>Med. value</span>
                    </div>
                  )}
                  {medEquity && (
                    <div className="flex flex-col">
                      <span className="text-[22px] font-bold tabular-nums leading-none" style={{color:'#001660', letterSpacing:'-0.03em'}}>
                        ${(medEquity/1000).toFixed(0)}k
                      </span>
                      <span className="text-[11px] font-medium mt-1.5" style={{color:'rgba(0,22,96,0.55)'}}>Med. equity</span>
                    </div>
                  )}
                  {/* Updating pill — stays in the stats row */}
                  {propertyCountLoading && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                      style={{background:'#001660', color:'#fff', fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase'}}>
                      <span className="ff-pulse-dot" style={{width:6, height:6, borderRadius:999, background:'#93DDBA'}} />
                      Updating
                    </span>
                  )}
                  {/* Right-side action group: Save / Auto-save + Scan again + Run Prescreen */}
                  {shapeDrawn && mapShape?.latlngs?.length >= 3
                    && (householdPhase === 'list' || householdPhase === 'done')
                    && !realDataPending && (
                    <div className="ml-auto flex items-center gap-2" style={{marginTop: 14}}>
                      {!['triggering','polling','reading'].includes(livePrescreenStatus) && !shapeSavedId && (
                        <button
                          onClick={() => saveCurrentShapeAsCampaign()}
                          disabled={savingShape}
                          className="flex items-center justify-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-wait"
                          style={{background:'#fff', color:'#001660', border:'1px solid #E5E7EB', cursor: savingShape ? 'wait' : 'pointer'}}
                          onMouseOver={e => { if (!savingShape) e.currentTarget.style.background = '#F9FAFB' }}
                          onMouseOut={e => { e.currentTarget.style.background = '#fff' }}>
                          {savingShape ? (
                            <span style={{width:11, height:11, borderRadius:999, border:'2px solid rgba(0,22,96,0.18)', borderTopColor:'#001660', animation:'ff-spin 0.8s linear infinite'}} />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                            </svg>
                          )}
                          Save Campaign
                        </button>
                      )}
                      {!['triggering','polling','reading'].includes(livePrescreenStatus) && shapeSavedId && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold"
                          style={{background:'rgba(16,185,129,0.10)', color:'#047857', border:'1px solid rgba(16,185,129,0.30)'}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Saved
                        </span>
                      )}
                      {['triggering','polling','reading'].includes(livePrescreenStatus) && (
                        <button
                          onClick={() => { liveAbortRef.current.prescreen = true }}
                          className="flex items-center justify-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors"
                          style={{background:'#fff', color:'#DC2626', border:'1px solid rgba(220,38,38,0.4)', cursor:'pointer'}}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}
                          onMouseOut={e => e.currentTarget.style.background = '#fff'}
                          title="Stop the prescreen pipeline and use whatever results have arrived so far.">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                          </svg>
                          Cancel prescreen
                        </button>
                      )}
                      <span style={{display:'inline-block', width:1, height:24, background:'rgba(0,22,96,0.12)', margin:'0 4px'}} />
                      {(realHomes && realHomes.length > 0) && !['triggering','polling','reading'].includes(livePrescreenStatus) && (
                        <button
                          onClick={() => runLiveHouseholdsFetch()}
                          disabled={['saving','triggering','polling','reading'].includes(liveFetchStatus) || !mapShape || !mapShape.latlngs}
                          className="flex items-center justify-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{background:'#fff', color:'#001660', border:'1px solid #E5E7EB', cursor:'pointer'}}
                          title="Re-run the household scan with the current area + filters."
                          onMouseOver={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#F9FAFB' }}
                          onMouseOut={e => { e.currentTarget.style.background = '#fff' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path fill="currentColor" d="M12 22c-1.38335 0 -2.68335 -0.2625 -3.9 -0.7875 -1.21665 -0.525 -2.275 -1.2375 -3.175 -2.1375 -0.9 -0.9 -1.6125 -1.95835 -2.1375 -3.175C2.2625 14.68335 2 13.38335 2 12s0.2625 -2.68335 0.7875 -3.9c0.525 -1.21665 1.2375 -2.275 2.1375 -3.175 0.9 -0.9 1.95835 -1.6125 3.175 -2.1375C9.31665 2.2625 10.61665 2 12 2s2.68335 0.2625 3.9 0.7875c1.21665 0.525 2.275 1.2375 3.175 2.1375 0.9 0.9 1.6125 1.95835 2.1375 3.175C21.7375 9.31665 22 10.61665 22 12s-0.2625 2.68335 -0.7875 3.9c-0.525 1.21665 -1.2375 2.275 -2.1375 3.175 -0.9 0.9 -1.95835 1.6125 -3.175 2.1375C14.68335 21.7375 13.38335 22 12 22Zm0 -1.5c1.05 0 2.0375 -0.17085 2.9625 -0.5125 0.925 -0.34165 1.7625 -0.82915 2.5125 -1.4625l-1.8 -1.775c-0.51665 0.38335 -1.08335 0.6875 -1.7 0.9125 -0.61665 0.225 -1.275 0.3375 -1.975 0.3375 -1.66665 0 -3.08335 -0.58335 -4.25 -1.75 -1.16665 -1.16665 -1.75 -2.58335 -1.75 -4.25 0 -1.66665 0.58335 -3.08335 1.75 -4.25 1.16665 -1.16665 2.58335 -1.75 4.25 -1.75 1.66665 0 3.08335 0.58335 4.25 1.75 1.16665 1.16665 1.75 2.58335 1.75 4.25 0 0.7 -0.1125 1.35835 -0.3375 1.975 -0.225 0.61665 -0.52915 1.18335 -0.9125 1.7l1.775 1.775c0.61665 -0.75 1.1 -1.58335 1.45 -2.5 0.35 -0.91665 0.525 -1.9 0.525 -2.95 0 -2.36665 -0.825 -4.375 -2.475 -6.025C16.375 4.325 14.36665 3.5 12 3.5c-2.36665 0 -4.375 0.825 -6.025 2.475C4.325 7.625 3.5 9.63335 3.5 12c0 2.36665 0.825 4.375 2.475 6.025C7.625 19.675 9.63335 20.5 12 20.5Zm0 -4c0.48335 0 0.94585 -0.07085 1.3875 -0.2125s0.84585 -0.34585 1.2125 -0.6125l-1.85 -1.825c-0.11665 0.05 -0.2375 0.0875 -0.3625 0.1125 -0.125 0.025 -0.25415 0.0375 -0.3875 0.0375 -0.55 0 -1.02085 -0.19585 -1.4125 -0.5875C10.19585 13.02085 10 12.55 10 12s0.19585 -1.02085 0.5875 -1.4125C10.97915 10.19585 11.45 10 12 10s1.02085 0.19585 1.4125 0.5875C13.80415 10.97915 14 11.45 14 12c0 0.13335 -0.01665 0.26665 -0.05 0.4 -0.03335 0.13335 -0.075 0.26665 -0.125 0.4l1.85 1.8c0.26665 -0.36665 0.47085 -0.77085 0.6125 -1.2125 0.14165 -0.44165 0.2125 -0.90415 0.2125 -1.3875 0 -1.25 -0.4375 -2.3125 -1.3125 -3.1875S13.25 7.5 12 7.5s-2.3125 0.4375 -3.1875 1.3125S7.5 10.75 7.5 12s0.4375 2.3125 1.3125 3.1875S10.75 16.5 12 16.5Z"/>
                          </svg>
                          Scan again
                        </button>
                      )}
                      <button
                        disabled={
                          ['triggering','polling','reading'].includes(livePrescreenStatus)
                          || selectedHouseholds.size === 0
                          || !liveCampaignIdRef.current
                          || selectedHouseholds.size > QUOTA.user.monthlyRemaining
                          || selectedHouseholds.size > QUOTA.org.monthlyRemaining
                        }
                        onClick={runLivePrescreen}
                        className="flex items-center justify-center gap-2 text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{background:'#001660', color:'#fff', border:'none', cursor:'pointer'}}
                        onMouseOver={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#254BCE' }}
                        onMouseOut={e => { e.currentTarget.style.background = '#001660' }}
                        title={selectedHouseholds.size === 0 ? 'Select households first.' : !liveCampaignIdRef.current ? 'Run "Scan again" first.' : ''}>
                        {['triggering','polling','reading'].includes(livePrescreenStatus) ? (
                          <span style={{width:11, height:11, borderRadius:999, border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', animation:'ff-spin 0.8s linear infinite'}} />
                        ) : (
                          <svg width="13" height="13" viewBox="-1 -1 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13.928571428571429 26.785714285714285c7.100807142857143 0 12.857142857142858 -5.756335714285714 12.857142857142858 -12.857142857142858s-5.756335714285714 -12.857142857142858 -12.857142857142858 -12.857142857142858 -12.857142857142858 5.756335714285714 -12.857142857142858 12.857142857142858 5.756335714285714 12.857142857142858 12.857142857142858 12.857142857142858Z"/>
                            <path d="m23.014285714285712 23.014714285714284 5.914285714285714 5.914285714285714"/>
                            <path d="M8.571428571428571 9.107142857142858h10.714285714285714"/>
                            <path d="M8.571428571428571 13.928571428571429h10.714285714285714"/>
                            <path d="M8.571428571428571 18.75h8.571428571428571"/>
                          </svg>
                        )}
                        <span>
                          {livePrescreenStatus === 'triggering' ? 'Triggering…'
                            : livePrescreenStatus === 'polling'    ? 'Polling…'
                            : livePrescreenStatus === 'reading'    ? 'Reading…'
                            : livePrescreenStatus === 'done'       ? 'Prescreen — re-run'
                            : selectedHouseholds.size === 0     ? 'Run Prescreen'
                            : `Run Prescreen (${selectedHouseholds.size})`}
                        </span>
                      </button>
                    </div>
                  )}
                  {/* Hidden: legacy nested wrapper preserved for diff minimization */}
                  {false && (
                    <div className="ml-auto flex items-center gap-2">
                      {!shapeSavedId && (
                        <button
                          onClick={() => saveCurrentShapeAsCampaign()}
                          disabled={savingShape}
                          className="flex items-center justify-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors"
                          style={{background:'#001660', color:'#fff', border:'none', cursor: savingShape ? 'wait' : 'pointer', opacity: savingShape ? 0.7 : 1}}
                          onMouseOver={e => { if (!savingShape) e.currentTarget.style.background = '#254BCE' }}
                          onMouseOut={e => { if (!savingShape) e.currentTarget.style.background = '#001660' }}>
                          {savingShape ? (
                            <span style={{width:11, height:11, borderRadius:999, border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'#fff', animation:'ff-spin 0.8s linear infinite'}} />
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                            </svg>
                          )}
                          Save Campaign
                        </button>
                      )}
                      {shapeSavedId && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
                          style={{background:'rgba(16,185,129,0.10)', color:'#047857', border:'1px solid rgba(16,185,129,0.30)'}}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Saved
                        </span>
                      )}
                    </div>
                  )}
                </div>
                </>
                )
              })()}
            {!showingExistingLeads && (householdPhase === 'list' || householdPhase === 'done') && !drawerMinimized && (
              <>
                {/* Selection bar — replaces toolbar when one or more rows are selected (mirrors Pipeline) */}
                {selectedHouseholds.size > 0 && (() => {
                  const prescreenRunning = ['triggering','polling','reading'].includes(livePrescreenStatus)
                  const dimStyle = (extra={}) => ({
                    background:'#fff', border:'1px solid #E5E7EB', color:'#9CA3AF', cursor:'not-allowed', opacity:0.6, ...extra
                  })
                  return (
                  <div className="px-6 py-2.5 shrink-0 flex items-center gap-2" style={{borderBottom:'1px solid #F0F2F5', background:'#F8F9FB'}}>
                    <span className="text-[13px] font-semibold" style={{color:'#001660'}}>
                      {selectedHouseholds.size} selected
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (prescreenRunning) return
                          setHiddenHouseholds(prev => {
                            const next = new Set(prev)
                            selectedHouseholds.forEach(id => next.add(id))
                            return next
                          })
                          setSelectedHouseholds(new Set())
                        }}
                        disabled={prescreenRunning}
                        title={prescreenRunning ? 'Wait for prescreen to finish.' : ''}
                        className="text-[12px] font-semibold rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors"
                        style={prescreenRunning ? {background:'transparent', border:'none', color:'#9CA3AF', cursor:'not-allowed', opacity:0.6} : {background:'transparent', border:'none', color:'#DC2626', cursor:'pointer'}}
                        onMouseOver={e => { if (!prescreenRunning) e.currentTarget.style.background = '#FEF2F2' }}
                        onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          if (prescreenRunning) return
                          const ids = Array.from(selectedHouseholds)
                          const rows = filteredHouses.filter(h => ids.includes(h.id))
                          if (rows.length === 0) return
                          const headers = ['Address','Apt/Suite','City','State','Zip','Property Type','First Name','Last Name','Home Value','Available Equity','FICO','Months Owned']
                          const data = rows.map(h => [h.street||'', h.apt||'', h.city||'', h.state||'', h.zip||'', h.propertyType||'', h.ownerFirst||'', h.ownerLast||'', h.homeValue||'', h.equity||'', h.fico||'', h.yearsOwned ? Math.round(h.yearsOwned * 12) : ''])
                          const csv = [headers, ...data].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a'); a.href = url; a.download = `selected-${Date.now()}.csv`
                          document.body.appendChild(a); a.click(); document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        }}
                        disabled={prescreenRunning}
                        title={prescreenRunning ? 'Wait for prescreen to finish.' : ''}
                        className="text-[12px] font-semibold rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors"
                        style={prescreenRunning ? dimStyle() : {background:'#fff', border:'1px solid #E5E7EB', color:'#001660', cursor:'pointer'}}
                        onMouseOver={e => { if (!prescreenRunning) e.currentTarget.style.background = '#F9FAFB' }}
                        onMouseOut={e => { if (!prescreenRunning) e.currentTarget.style.background = '#fff' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Export
                      </button>
                      {(() => {
                        const allPrescreened = selectedHouseholds.size > 0 && Array.from(selectedHouseholds).every(id => prescreenResults[id])
                        const tip = allPrescreened ? '' : 'Run Prescreen on the selected leads first.'
                        const selectedIds = Array.from(selectedHouseholds)
                        const firstSelected = selectedIds.length ? filteredHouses.find(h => h.id === selectedIds[0]) : null
                        const ownerName = firstSelected ? (`${firstSelected.ownerFirst||''} ${firstSelected.ownerLast||''}`.trim() || 'Homeowner') : 'Homeowner'
                        const ownerFirst = firstSelected ? (firstSelected.ownerFirst || 'there') : 'there'
                        const propAddr = firstSelected ? (firstSelected.street || firstSelected.address || 'your property') : 'your property'
                        const propCity = firstSelected ? [firstSelected.city, firstSelected.state].filter(Boolean).join(', ') : ''
                        const baseBtn = (open) => ({
                          background: open ? '#F3F4F6' : '#fff',
                          border:'1px solid #E5E7EB',
                          color: allPrescreened ? '#001660' : '#9CA3AF',
                          cursor: allPrescreened ? 'pointer' : 'not-allowed',
                          opacity: allPrescreened ? 1 : 0.7,
                        })
                        const sendPostcard = () => {
                          if (!allPrescreened) return
                          setOutreachDone(prev => {
                            const next = {...prev}
                            selectedIds.forEach(id => { next[id] = {...(next[id]||{}), postcard: true} })
                            return next
                          })
                        }
                        const sendEmail = () => {
                          if (!allPrescreened) return
                          setOutreachDone(prev => {
                            const next = {...prev}
                            selectedIds.forEach(id => { next[id] = {...(next[id]||{}), mail: true} })
                            return next
                          })
                        }
                        const splitWrap = (open) => ({
                          display:'inline-flex', alignItems:'stretch',
                          background:'#fff',
                          border:'1px solid #E5E7EB',
                          borderRadius:8,
                          overflow:'hidden',
                          opacity: allPrescreened ? 1 : 0.7,
                        })
                        const segLeft = {
                          display:'inline-flex', alignItems:'center', gap:6,
                          padding:'8px 12px',
                          color: allPrescreened ? '#001660' : '#9CA3AF',
                          background:'transparent', border:'none',
                          fontSize:12, fontWeight:600,
                          cursor: allPrescreened ? 'pointer' : 'not-allowed',
                        }
                        const segDivider = { width:1, background:'#E5E7EB' }
                        const segRight = (open) => ({
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          padding:'8px 8px',
                          background: open ? '#F3F4F6' : 'transparent', border:'none',
                          color: allPrescreened ? '#001660' : '#9CA3AF',
                          cursor: allPrescreened ? 'pointer' : 'not-allowed',
                        })
                        return (<>
                          {/* Mail Postcard — split button */}
                          <div className="relative">
                            <div style={splitWrap(outreachMenuOpen === 'postcard')}>
                              <button
                                onClick={sendPostcard}
                                disabled={!allPrescreened}
                                title={tip || 'Mail postcard'}
                                style={segLeft}
                                onMouseOver={e => { if (allPrescreened) e.currentTarget.style.background = '#F9FAFB' }}
                                onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="2" y="6" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                                </svg>
                                Mail Postcard
                              </button>
                              <span style={segDivider} />
                              <button
                                onClick={() => { if (!allPrescreened) return; setOutreachMenuOpen(o => o === 'postcard' ? null : 'postcard') }}
                                disabled={!allPrescreened}
                                title={tip || 'Preview postcard'}
                                style={segRight(outreachMenuOpen === 'postcard')}
                                onMouseOver={e => { if (allPrescreened && outreachMenuOpen !== 'postcard') e.currentTarget.style.background = '#F9FAFB' }}
                                onMouseOut={e => { if (outreachMenuOpen !== 'postcard') e.currentTarget.style.background = 'transparent' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              </button>
                            </div>
                            {outreachMenuOpen === 'postcard' && (
                              <>
                                <div className="fixed inset-0 z-[1500]" onClick={() => setOutreachMenuOpen(null)} />
                                <div className="absolute right-0 top-full mt-2 rounded-lg overflow-hidden z-[1600] py-1"
                                  style={{background:'#fff', border:'1px solid rgba(0,22,96,0.10)', boxShadow:'0 12px 32px rgba(0,22,96,0.18)', minWidth: 180}}>
                                  <button
                                    onClick={() => {
                                      setOutreachMenuOpen(null)
                                      const homes = selectedIds.map(id => filteredHouses.find(h => h.id === id)).filter(h => h && prescreenResults[h.id])
                                      if (homes.length === 0) return
                                      const results = Object.fromEntries(homes.map(h => [h.id, prescreenResults[h.id]]))
                                      setMailPreview({ home: homes[0], result: results[homes[0].id], homes, results })
                                    }}
                                    className="w-full text-left text-[12px] font-medium flex items-center gap-2 px-3 py-2 transition-colors"
                                    style={{color:'#001660', background:'transparent', border:'none', cursor:'pointer'}}
                                    onMouseOver={e => e.currentTarget.style.background = '#F8F9FB'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    Postcard preview
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          {/* Send Email — split button */}
                          <div className="relative">
                            <div style={splitWrap(outreachMenuOpen === 'email')}>
                              <button
                                onClick={sendEmail}
                                disabled={!allPrescreened}
                                title={tip || 'Send email'}
                                style={segLeft}
                                onMouseOver={e => { if (allPrescreened) e.currentTarget.style.background = '#F9FAFB' }}
                                onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                                </svg>
                                Send Email
                              </button>
                              <span style={segDivider} />
                              <button
                                onClick={() => { if (!allPrescreened) return; setOutreachMenuOpen(o => o === 'email' ? null : 'email') }}
                                disabled={!allPrescreened}
                                title={tip || 'Preview email'}
                                style={segRight(outreachMenuOpen === 'email')}
                                onMouseOver={e => { if (allPrescreened && outreachMenuOpen !== 'email') e.currentTarget.style.background = '#F9FAFB' }}
                                onMouseOut={e => { if (outreachMenuOpen !== 'email') e.currentTarget.style.background = 'transparent' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              </button>
                            </div>
                            {outreachMenuOpen === 'email' && (
                              <>
                                <div className="fixed inset-0 z-[1500]" onClick={() => setOutreachMenuOpen(null)} />
                                <div className="absolute right-0 top-full mt-2 rounded-lg overflow-hidden z-[1600] py-1"
                                  style={{background:'#fff', border:'1px solid rgba(0,22,96,0.10)', boxShadow:'0 12px 32px rgba(0,22,96,0.18)', minWidth: 180}}>
                                  <button
                                    onClick={() => {
                                      setOutreachMenuOpen(null)
                                      const homes = selectedIds.map(id => filteredHouses.find(h => h.id === id)).filter(h => h && prescreenResults[h.id])
                                      if (homes.length === 0) return
                                      const results = Object.fromEntries(homes.map(h => [h.id, prescreenResults[h.id]]))
                                      setEmailPreview({ home: homes[0], result: results[homes[0].id], homes, results })
                                    }}
                                    className="w-full text-left text-[12px] font-medium flex items-center gap-2 px-3 py-2 transition-colors"
                                    style={{color:'#001660', background:'transparent', border:'none', cursor:'pointer'}}
                                    onMouseOver={e => e.currentTarget.style.background = '#F8F9FB'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    Email preview
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          {/* Add to CRM */}
                          <button
                            onClick={async () => {
                              if (!allPrescreened) return
                              if (selectedIds.some(id => outreachDone[id]?.crm === true)) return
                              const homes = selectedIds.map(id => filteredHouses.find(h => h.id === id)).filter(Boolean)
                              setOutreachDone(prev => {
                                const next = {...prev}
                                homes.forEach(h => { next[h.id] = {...(next[h.id]||{}), crm: 'pending'} })
                                return next
                              })
                              let lastLeadId = null
                              for (const h of homes) {
                                const result = prescreenResults[h.id]
                                if (!result) continue
                                const address = h.address || h.street || ''
                                const ownerFull = h.owner || `${h.ownerFirst||''} ${h.ownerLast||''}`.trim() || 'Homeowner'
                                const firstName = (ownerFull.split(' ')[0] || 'lead').toLowerCase()
                                try {
                                  const newLead = {
                                    status: 'qualified',
                                    name: ownerFull,
                                    location: address.split(',').slice(1).join(',').trim() || address,
                                    address,
                                    amount: `$${Number(result.loanAmt).toLocaleString()}`,
                                    product: 'HELOC',
                                    monthly: result.monthly,
                                    apr: `${result.apr}%`,
                                    fiveYear: Math.round(result.monthly * 60),
                                    portal: false, apply: false, days: 0,
                                    lastActivity: 'Just added · Geo prescreen',
                                    actions: ['Send Email','Send Postcard'],
                                    phone: '(555) 555-0100',
                                    email: `${firstName}@example.com`,
                                    offerDate: 'Today', offerStatus: 'active',
                                    propValue: h.homeValue ? `$${(h.homeValue/1000).toFixed(0)}k` : '—',
                                    equity:    h.equity    ? `$${(h.equity/1000).toFixed(0)}k`    : '—',
                                    cltv: (h.homeValue && h.equity) ? `${Math.round((h.homeValue - h.equity)/h.homeValue * 100)}%` : '—',
                                    fico: h.fico ? String(h.fico) : '—', dti: '—',
                                    portalFirst: null, portalLast: null, pagesViewed: 0, clickedApply: null, daysSince: 0,
                                    emailSent: null, postcardSent: null, lastContact: null,
                                    source: 'Geo Lead Search', createdBy: userInfo?.user_info?.full_name || 'Demo User', createdDate: 'Today',
                                    prescreenChecks: [
                                      { check: 'Address Verification', result: 'Pass', reason: null },
                                      { check: 'Max CLTV',             result: 'Pass', reason: null },
                                      { check: 'Credit check',         result: 'Pass', reason: null },
                                      { check: 'Loan Offer',           result: 'Generated', reason: null },
                                    ],
                                    timeline: [{ date: 'Today', event: 'Lead created via Geo Lead Search' }],
                                  }
                                  const newLeadId = await addLead(newLead)
                                  lastLeadId = newLeadId
                                  setOutreachDone(prev => ({...prev, [h.id]: {...(prev[h.id]||{}), crm: true}}))
                                } catch (err) {
                                  console.warn('[firestore] addLead failed', err)
                                  setOutreachDone(prev => ({...prev, [h.id]: {...(prev[h.id]||{}), crm: false}}))
                                }
                              }
                              setSelectedHouseholds(new Set())
                            }}
                            disabled={!allPrescreened || (() => selectedIds.some(id => outreachDone[id]?.crm === true))()}
                            title={
                              !allPrescreened ? (tip || 'Run Prescreen on the selected leads first.')
                              : (selectedIds.some(id => outreachDone[id]?.crm === true) ? 'One or more selected leads are already in the CRM.' : 'Add selected leads to CRM')
                            }
                            className="text-[12px] font-semibold rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors"
                            style={(() => {
                              const anyInCrm = selectedIds.some(id => outreachDone[id]?.crm === true)
                              const enabled = allPrescreened && !anyInCrm
                              return {background:'#fff', border:'1px solid #E5E7EB', color: enabled ? '#001660' : '#9CA3AF', cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.7}
                            })()}
                            onMouseOver={e => { if (allPrescreened && !selectedIds.some(id => outreachDone[id]?.crm === true)) e.currentTarget.style.background = '#F9FAFB' }}
                            onMouseOut={e => { e.currentTarget.style.background = '#fff' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                            </svg>
                            Add to CRM
                          </button>
                        </>)
                      })()}
                      <span style={{display:'inline-block', width:1, height:24, background:'rgba(0,22,96,0.12)', margin:'0 4px'}} />
                      <button
                        onClick={() => { if (!prescreenRunning) setSelectedHouseholds(new Set()) }}
                        disabled={prescreenRunning}
                        title={prescreenRunning ? 'Wait for prescreen to finish.' : ''}
                        className="text-[12px] font-semibold rounded-lg px-3 py-2 transition-colors"
                        style={prescreenRunning ? dimStyle() : {background:'#fff', border:'1px solid #E5E7EB', color:'#001660', cursor:'pointer'}}
                        onMouseOver={e => { if (!prescreenRunning) e.currentTarget.style.background = '#F9FAFB' }}
                        onMouseOut={e => { if (!prescreenRunning) e.currentTarget.style.background = '#fff' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                  )
                })()}
                {/* Toolbar row — selection + search + Get Households */}
                {selectedHouseholds.size === 0 && !realDataPending && (
                <div className="px-6 py-2.5 shrink-0 flex items-center gap-3 flex-wrap" style={{borderBottom:'1px solid #F0F2F5'}}>
                  {/* Search input — anchored left */}
                  <div className="relative" style={{width: 345}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{color:'#9CA3AF'}}>
                      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="17" y2="17"/>
                    </svg>
                    <input
                      type="text"
                      value={resultSearch}
                      onChange={e => setResultSearch(e.target.value)}
                      placeholder="Search by address, owner, or mailing address…"
                      className="w-full pl-9 pr-8 py-2 rounded-lg text-[12px] outline-none"
                      style={{background:'#fff', border:'1px solid #E5E7EB', color:'#001660'}}
                    />
                    {resultSearch && (
                      <button onClick={() => setResultSearch('')}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{background:'#001660', color:'#fff', border:'none', cursor:'pointer', padding:0}}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                          <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {/* Bulk actions — only after prescreen completes; download CSV, send emails, send postcards */}
                  {householdPhase === 'done' && Object.keys(prescreenResults).length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          const qualified = filteredHouses.filter(h => prescreenResults[h.id]?.qualified)
                          if (qualified.length === 0) return
                          const headers = ['Address','Apt/Suite','City','State','Zip','Property Type','First Name','Last Name','Home Value','Available Equity','Offer Amount','Offer APR']
                          const rows = qualified.map(h => {
                            const r = prescreenResults[h.id] || {}
                            return [h.street||'', h.apt||'', h.city||'', h.state||'', h.zip||'', h.propertyType||'', h.ownerFirst||'', h.ownerLast||'', h.homeValue||'', h.equity||'', r.loanAmt||'', r.apr||'']
                          })
                          const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = `prescreen-results-${Date.now()}.csv`
                          document.body.appendChild(a); a.click(); document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        }}
                        className="text-[12px] font-medium rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                        style={{background:'#fff', border:'1px solid #E5E7EB', color:'#001660', cursor:'pointer'}}
                        onMouseOver={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                      </button>
                      <button
                        onClick={() => {
                          const ids = filteredHouses.filter(h => prescreenResults[h.id]?.qualified).map(h => h.id)
                          setOutreachDone(prev => {
                            const next = {...prev}
                            ids.forEach(id => { next[id] = {...(next[id]||{}), mail: true} })
                            return next
                          })
                        }}
                        className="text-[12px] font-medium rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                        style={{background:'#fff', border:'1px solid #E5E7EB', color:'#001660', cursor:'pointer'}}
                        onMouseOver={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                        </svg>
                        Email all
                      </button>
                      <button
                        onClick={() => {
                          const ids = filteredHouses.filter(h => prescreenResults[h.id]?.qualified).map(h => h.id)
                          setOutreachDone(prev => {
                            const next = {...prev}
                            ids.forEach(id => { next[id] = {...(next[id]||{}), postcard: true} })
                            return next
                          })
                        }}
                        className="text-[12px] font-medium rounded-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
                        style={{background:'#001660', border:'none', color:'#fff', cursor:'pointer'}}
                        onMouseOver={e => e.currentTarget.style.background = '#254BCE'}
                        onMouseOut={e => e.currentTarget.style.background = '#001660'}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="6" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                        </svg>
                        Postcards all
                      </button>
                    </div>
                  )}
                  {/* Selection counter — pushed all the way to the right */}
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-semibold" style={{color:'#001660'}}>
                      {selectedHouseholds.size} selected
                    </span>
                    {selectedHouseholds.size > 0 && (
                      <button onClick={() => setSelectedHouseholds(new Set())}
                        className="text-[12px] font-medium" style={{color:'#6B7280', background:'transparent', border:'none', cursor:'pointer'}}>
                        | Clear
                      </button>
                    )}
                  </div>
                </div>
                )}
                {/* In-progress status row removed — the radar animation + pending state in the table already communicate that work is happening. */}

                {/* Household rows — table layout to match CRM Pipeline */}
                <div className="flex-1 overflow-auto">
                  {realDataPending ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <span style={{
                        width: 22, height: 22, borderRadius: 999,
                        border: '2.5px solid rgba(0,22,96,0.15)',
                        borderTopColor: '#001660',
                        animation: 'ff-spin 0.8s linear infinite',
                      }} />
                      <div className="text-[12px] font-medium" style={{color:'rgba(0,22,96,0.55)'}}>
                        Scanning area for homeowners…
                      </div>
                    </div>
                  ) : realDataEmpty ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'rgba(0,22,96,0.05)'}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#001660" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <line x1="3" y1="3" x2="21" y2="21" stroke="#9CA3AF" strokeWidth="1.6"/>
                        </svg>
                      </div>
                      <div className="text-[13px] font-semibold" style={{color:'#001660'}}>No homeowners in this area</div>
                      <div className="text-[11.5px] max-w-md" style={{color:'rgba(0,22,96,0.55)'}}>
                        Try a different area or relax your filters to see more results.
                      </div>
                    </div>
                  ) : filteredHouses.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[11px] text-gray-300">No households match current filters</div>
                  ) : (() => {
                    // Apply search across the relevant text fields.
                    const q = resultSearch.trim().toLowerCase()
                    let rows = q
                      ? filteredHouses.filter(h =>
                          (h.address || '').toLowerCase().includes(q) ||
                          (h.owner   || '').toLowerCase().includes(q) ||
                          (h.ownerFirst || '').toLowerCase().includes(q) ||
                          (h.ownerLast  || '').toLowerCase().includes(q) ||
                          (h.city    || '').toLowerCase().includes(q) ||
                          (h.zip     || '').toLowerCase().includes(q))
                      : filteredHouses
                    const toggleSort = (key) => setResultSort(prev =>
                      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }
                    )
                    const ResizeGrip = ({col}) => (
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault(); e.stopPropagation()
                          resizingColRef.current = { col, startX: e.clientX, startWidth: resultColWidths[col] }
                          document.body.style.cursor = 'col-resize'
                        }}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{zIndex: 5}}
                      />
                    )
                    const SortIcon = ({col}) => (
                      <span className="inline-flex flex-col gap-px shrink-0">
                        <span style={{fontSize:'7px', lineHeight:1, color: resultSort.key === col && resultSort.dir === 'asc'  ? '#001660' : 'rgba(0,22,96,0.2)'}}>▲</span>
                        <span style={{fontSize:'7px', lineHeight:1, color: resultSort.key === col && resultSort.dir === 'desc' ? '#001660' : 'rgba(0,22,96,0.2)'}}>▼</span>
                      </span>
                    )
                    // Column config — the full breakdown matches the production
                    // GreenLyne UI: address, owner, finance, prescreen result,
                    // preview actions, and the solar-roof signals.
                    const fmtCurrency = v => v == null ? '—' : `$${Number(v).toLocaleString()}`
                    const fmtNumber   = v => v == null ? '—' : Number(v).toLocaleString()
                    const fmtPct      = v => v == null ? '—' : `${Number(v).toFixed(2)}%`
                    const EmailIcon = ({onClick}) => (
                      <button onClick={(e) => { e.stopPropagation(); onClick?.() }}
                        title="Email offer preview"
                        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                        style={{background:'transparent', border:'none', color:'#059669', cursor:'pointer'}}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(5,150,105,0.08)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                      </button>
                    )
                    const PdfIcon = ({onClick}) => (
                      <button onClick={(e) => { e.stopPropagation(); onClick?.() }}
                        title="Postcard preview"
                        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                        style={{background:'transparent', border:'none', color:'#059669', cursor:'pointer'}}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(5,150,105,0.08)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <svg width="14" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <text x="12" y="18" fontSize="6" fontWeight="700" textAnchor="middle" stroke="none" fill="currentColor">PDF</text>
                        </svg>
                      </button>
                    )
                    const PRE_SCREEN_STATUS_COL = {
                      key: 'preScreenStatus', label: 'Pre-screen Status',
                      sortValue: h => {
                        const r = prescreenResults[h.id]
                        if (r) return r.qualified ? 0 : 2
                        const flag = h.qualifies ?? h.is_qualified
                        if (flag === true) return 1
                        if (flag === false) return 2
                        return 3
                      },
                      render: h => {
                        const r = prescreenResults[h.id]
                        let label, bg, color, dotColor
                        if (r) {
                          if (r.qualified) { label = 'Pre-screened'; bg = 'rgba(16,185,129,0.14)'; color = '#047857'; dotColor = '#10B981' }
                          else { label = 'Not Qualified'; bg = 'rgba(107,114,128,0.14)'; color = '#4B5563'; dotColor = '#9CA3AF' }
                        } else {
                          const flag = h.qualifies ?? h.is_qualified
                          if (flag === true)       { label = 'Needs Review';     bg = 'rgba(245,158,11,0.16)'; color = '#B45309';        dotColor = '#F59E0B' }
                          else if (flag === false) { label = 'Not Qualified';    bg = 'rgba(107,114,128,0.14)'; color = '#4B5563';       dotColor = '#9CA3AF' }
                          else                     { label = 'Not Pre-screened'; bg = 'rgba(0,22,96,0.06)';    color = 'rgba(0,22,96,0.55)'; dotColor = 'rgba(0,22,96,0.30)' }
                        }
                        const prefix = label === 'Pre-screened' ? (
                          <span className="inline-flex items-center justify-center" style={{width:13, height:13, borderRadius:999, background:'#10B981', color:'#fff'}}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </span>
                        ) : (
                          <span style={{display:'inline-block', width:7, height:7, borderRadius:999, background: dotColor}} />
                        )
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                            style={{background: bg, color, border: 'none'}}>
                            {prefix}{label}
                          </span>
                        )
                      }
                    }
                    const COLUMNS = [
                      PRE_SCREEN_STATUS_COL,
                      { key: 'crm', label: 'CRM', sortable: true,
                        sortValue: h => outreachDone[h.id]?.crm === true ? 0 : 1,
                        render: h => {
                          const inCrm = outreachDone[h.id]?.crm === true
                          if (!inCrm) return <span style={{color:'rgba(0,22,96,0.25)'}}>—</span>
                          return (
                            <span title="Added to CRM" className="inline-flex items-center justify-center" style={{width:18, height:18, borderRadius:999, background:'#10B981', color:'#fff'}}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </span>
                          )
                        }
                      },
                      { key: 'address', label: 'Property Address', sortKey: 'street',
                        sortValue: h => h.street || h.address || '',
                        render: h => <span style={{color:'#001660', fontWeight:600}}>{h.street || h.address || '—'}</span>
                      },
                      { key: 'apt',          label: 'Apt/Suite',                 render: h => h.apt || '—' },
                      { key: 'city',         label: 'City',                      sortValue: h => h.city || '', render: h => h.city || '—' },
                      { key: 'state',        label: 'State',                     sortValue: h => h.state || '', render: h => h.state || '—' },
                      { key: 'zip',          label: 'Zip Code',                  sortValue: h => h.zip || '', render: h => h.zip || '—' },
                      { key: 'propertyType', label: 'Property Type',             sortValue: h => h.propertyType || '', render: h => h.propertyType || '—' },
                      { key: 'ownerFirst',   label: 'Owner First Name',          sortValue: h => h.ownerFirst || '', render: h => h.ownerFirst || '—' },
                      { key: 'ownerLast',    label: 'Owner Last Name',           sortValue: h => h.ownerLast || '', render: h => h.ownerLast || '—' },
                      { key: 'homeValue',    label: 'Home Value ($)',            sortValue: h => h.homeValue || 0,
                        render: h => h.homeValue ? <span style={{color:'#001660', fontWeight:600}}>{fmtCurrency(h.homeValue)}</span> : '—' },
                      { key: 'equity',       label: 'Available Equity ($)',      sortValue: h => h.equity || 0,
                        render: h => h.equity ? <span style={{color:'#016163', fontWeight:600}}>{fmtCurrency(h.equity)}</span> : '—' },
                      { key: 'offerAmt',     label: 'Pre Screened Offer Amount ($)', sortValue: h => prescreenResults[h.id]?.loanAmt || 0,
                        render: h => { const r = prescreenResults[h.id]; return r?.loanAmt ? fmtCurrency(r.loanAmt) : '—' } },
                      { key: 'offerApr',     label: 'Pre Screened APR (%)',      sortValue: h => prescreenResults[h.id]?.apr || 0,
                        render: h => { const r = prescreenResults[h.id]; return r?.apr ? fmtPct(r.apr) : '—' } },
                      { key: 'emailPreview', label: 'Email Offer Preview',       sortable: false,
                        render: h => { const r = prescreenResults[h.id]; return r?.qualified ? <EmailIcon onClick={() => setEmailPreview({home: h, result: r})} /> : '—' } },
                      { key: 'postcardPreview', label: 'Postcard Preview',       sortable: false,
                        render: h => { const r = prescreenResults[h.id]; return r?.qualified ? <PdfIcon onClick={() => setMailPreview({home: h, result: r})} /> : '—' } },
                      { key: 'roofSize',         label: 'Roof Size (sq m)',                  sortValue: h => h.roofSize || 0,        render: h => fmtNumber(h.roofSize) },
                      { key: 'arrayCoverage',    label: 'Array Coverage Size (sq m)',        sortValue: h => h.arrayCoverage || 0,   render: h => fmtNumber(h.arrayCoverage) },
                      { key: 'maxSunshine',      label: 'Max Annual Sunshine',               sortValue: h => h.maxSunshine || 0,     render: h => fmtNumber(h.maxSunshine) },
                      { key: 'propertyAge',      label: 'Property Age',                      sortValue: h => h.propertyAge || 0,     render: h => h.propertyAge != null ? String(h.propertyAge) : '—' },
                      { key: 'estProjectCost',   label: 'Est. Project Cost ($)',             sortValue: h => h.estProjectCost || 0,  render: h => fmtCurrency(h.estProjectCost) },
                      { key: 'maxAnnualDemand',  label: 'Estimated Maximum Annual Demand',   sortValue: h => h.maxAnnualDemand || 0, render: h => fmtNumber(h.maxAnnualDemand) },
                      { key: 'minAnnualDemand',  label: 'Estimated Minimum Annual Demand',   sortValue: h => h.minAnnualDemand || 0, render: h => fmtNumber(h.minAnnualDemand) },
                      { key: 'maxSolarPanels',   label: 'Max Solar Panel Count',             sortValue: h => h.maxSolarPanels || 0,  render: h => fmtNumber(h.maxSolarPanels) },
                      { key: 'minSolarPanels',   label: 'Min Solar Panel Count',             sortValue: h => h.minSolarPanels || 0,  render: h => fmtNumber(h.minSolarPanels) },
                      { key: 'monthlyBill',      label: 'Monthly Electricity Bill ($)',      sortValue: h => h.monthlyBill || 0,     render: h => fmtCurrency(h.monthlyBill) },
                      { key: 'avgMonthlyElec',   label: 'Average Monthly Electricity',       sortValue: h => h.avgMonthlyElec || 0,  render: h => fmtNumber(h.avgMonthlyElec) },
                    ]
                    // Apply chosen sort using the column's sortValue if available.
                    if (resultSort.key) {
                      const col = COLUMNS.find(c => c.sortKey === resultSort.key || c.key === resultSort.key)
                      if (col && col.sortValue) {
                        const dir = resultSort.dir === 'asc' ? 1 : -1
                        rows = [...rows].sort((a, b) => {
                          const av = col.sortValue(a), bv = col.sortValue(b)
                          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
                          return String(av || '').localeCompare(String(bv || '')) * dir
                        })
                      }
                    }
                    return (
                    <table className="text-sm" style={{borderCollapse:'separate', borderSpacing:0, tableLayout:'fixed'}}>
                      <thead className="sticky top-0 z-10" style={{background:'#F8F9FB'}}>
                        <tr style={{borderBottom:'1px solid #E5E8EB'}}>
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest" style={{color:'rgba(0,22,96,0.45)', width:42, minWidth:42, position:'sticky', left:0, background:'#F8F9FB', zIndex:11}}>
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded cursor-pointer"
                              style={{accentColor:'#001660'}}
                              checked={rows.length > 0 && rows.every(h => selectedHouseholds.has(h.id))}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedHouseholds(new Set(rows.map(h => h.id)))
                                else setSelectedHouseholds(new Set())
                              }}
                              onClick={e => e.stopPropagation()}
                              title="Select all visible rows"
                            />
                          </th>
                          {COLUMNS.map((col, idx) => {
                            const sortable = col.sortable !== false && col.sortValue
                            const sortKey  = col.sortKey || col.key
                            const w = resultColWidths[col.key] || 140
                            return (
                              <th key={col.key}
                                className={`relative px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest group select-none ${sortable ? 'cursor-pointer' : ''}`}
                                style={{color:'rgba(0,22,96,0.45)', width:w, minWidth:w}}
                                onClick={sortable ? () => toggleSort(sortKey) : undefined}>
                                <span className="inline-flex items-center gap-1.5 truncate">{col.label}{sortable && <SortIcon col={sortKey} />}</span>
                                <ResizeGrip col={col.key} />
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((h, i) => {
                          const sel = selectedHouseholds.has(h.id)
                          const hot = h.id === highlightedHomeId
                          const mapHover = h.id === mapHoveredHomeId
                          const bg = sel ? 'rgba(5,150,105,0.06)'
                                  : hot ? 'rgba(245,158,11,0.07)'
                                  : mapHover ? '#EEF2FF'
                                  : i % 2 !== 0 ? '#FAFBFC'
                                  : '#fff'
                          return (
                            <tr
                              key={h.id}
                              ref={el => { if (el) householdRowsRef.current[h.id] = el; else delete householdRowsRef.current[h.id] }}
                              onClick={() => { toggleHousehold(h.id); setHighlightedHomeId(h.id) }}
                              className="group cursor-pointer"
                              style={{
                                borderBottom: '1px solid #F0F2F5',
                                background: bg,
                                boxShadow: hot ? 'inset 3px 0 0 #F59E0B' : mapHover ? 'inset 3px 0 0 #4F46E5' : 'none',
                                transition: 'background 0.15s, box-shadow 0.15s',
                              }}
                              onMouseOver={e => { if (!sel && !hot && !mapHover) e.currentTarget.style.background = '#F4F6F9' }}
                              onMouseOut={e => { if (!sel && !hot && !mapHover) e.currentTarget.style.background = i % 2 !== 0 ? '#FAFBFC' : '#fff' }}
                            >
                              <td className="px-4 py-3" onClick={e => e.stopPropagation()} style={{width:42, position:'sticky', left:0, background: bg, zIndex:1}}>
                                <input
                                  type="checkbox"
                                  checked={sel}
                                  onChange={() => toggleHousehold(h.id)}
                                  className={`w-3.5 h-3.5 rounded cursor-pointer transition-opacity ${sel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                  style={{accentColor:'#001660'}}
                                />
                              </td>
                              {COLUMNS.map((col) => (
                                <td key={col.key} className="px-4 py-3 text-[12px] whitespace-nowrap truncate" style={{color:'rgba(0,22,96,0.7)'}}>
                                  {col.render(h)}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    )
                  })()}
                </div>

              </>
            )}

            {/* ── PRESCREENING: running ── */}
            {!showingExistingLeads && householdPhase === 'prescreening' && (
              <>
                <div className="px-5 py-3 border-b border-gray-100 shrink-0">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Running Prescreen</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">{prescreenedHomes.length} household{prescreenedHomes.length !== 1 ? 's' : ''} being evaluated</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
                  <div className="w-full flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>Processing…</span>
                      <span className="font-semibold text-gray-900">{prescreenProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full transition-all duration-150"
                        style={{width: `${prescreenProgress}%`}}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <p className="text-[12px] text-gray-500">Checking equity, FICO, DTI,<br/>and CLTV for each household</p>
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                      <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      <span className="text-[10px] text-gray-500">
                        Using <span className="font-semibold text-gray-700">{prescreenedHomes.length}</span> of your{' '}
                        <span className="font-semibold text-gray-700">{QUOTA.user.monthlyRemaining}</span> remaining credits
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── DONE: results + outreach actions ── */}
            {false && !showingExistingLeads && householdPhase === 'done' && (() => {
              const qualifiedHomes = prescreenedHomes.filter(h => prescreenResults[h.id]?.qualified)
              const notQualified   = prescreenedHomes.length - qualifiedCount
              const avgLoan        = qualifiedCount > 0
                ? Math.round(qualifiedHomes.reduce((s, h) => s + (prescreenResults[h.id]?.loanAmt || 0), 0) / qualifiedCount / 1000)
                : 0
              const totalPipeline  = qualifiedHomes.reduce((s, h) => s + (prescreenResults[h.id]?.loanAmt || 0), 0)
              return (
              <>
                {/* Summary header */}
                <div className="px-5 pt-4 pb-3 border-b border-gray-100 shrink-0" style={{background:'#fff'}}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prescreen Results</span>
                    <span className="text-[10px] text-gray-400">{prescreenedHomes.length} screened</span>
                  </div>

                  {/* Big stat row */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div style={{background:'rgba(5,150,105,0.07)', borderRadius:10, padding:'8px 10px', border:'1px solid rgba(5,150,105,0.15)'}}>
                      <div style={{fontSize:22, fontWeight:700, color:'#059669', lineHeight:1, letterSpacing:'-0.03em'}}>{qualifiedCount}</div>
                      <div style={{fontSize:10, color:'#6EE7B7', fontWeight:600, marginTop:2}}>Qualified</div>
                    </div>
                    <div style={{background:'#F9FAFB', borderRadius:10, padding:'8px 10px', border:'1px solid #F3F4F6'}}>
                      <div style={{fontSize:22, fontWeight:700, color:'#374151', lineHeight:1, letterSpacing:'-0.03em'}}>{notQualified}</div>
                      <div style={{fontSize:10, color:'#9CA3AF', fontWeight:600, marginTop:2}}>Not qual.</div>
                    </div>
                    <div style={{background:'rgba(37,75,206,0.06)', borderRadius:10, padding:'8px 10px', border:'1px solid rgba(37,75,206,0.12)'}}>
                      <div style={{fontSize:22, fontWeight:700, color:'#254BCE', lineHeight:1, letterSpacing:'-0.03em'}}>${avgLoan}k</div>
                      <div style={{fontSize:10, color:'#93C5FD', fontWeight:600, marginTop:2}}>Avg loan</div>
                    </div>
                  </div>

                  {/* Total pipeline bar */}
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', background:'#F8FAFF', borderRadius:8, border:'1px solid rgba(37,75,206,0.08)'}}>
                    <span style={{fontSize:11, color:'#6B7280'}}>Total pipeline value</span>
                    <span style={{fontSize:13, fontWeight:700, color:'#001660', letterSpacing:'-0.02em'}}>${(totalPipeline/1000000).toFixed(1)}M</span>
                  </div>
                </div>

                {/* Lead list */}
                <div className="flex-1 overflow-y-auto" style={{background:'#FAFAFA'}}>
                  {prescreenedHomes.map((h, idx) => {
                    const result = prescreenResults[h.id]
                    const done   = outreachDone[h.id] || {}
                    const qual   = result?.qualified
                    const hot    = h.id === highlightedHomeId
                    return (
                      <div key={h.id}
                        ref={el => { if (el) householdRowsRef.current[h.id] = el; else delete householdRowsRef.current[h.id] }}
                        onClick={() => setHighlightedHomeId(h.id)}
                        style={{
                          cursor:'pointer',
                          margin:'8px 10px',
                          borderRadius:12,
                          background: hot ? '#FFFBEB' : (qual ? '#fff' : 'rgba(0,0,0,0.02)'),
                          border: hot ? '1px solid #F59E0B' : (qual ? '1px solid rgba(5,150,105,0.15)' : '1px solid #F3F4F6'),
                          boxShadow: hot ? '0 0 0 2px rgba(245,158,11,0.18)' : 'none',
                          overflow:'hidden',
                          transition:'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                        }}>
                        {/* Top row */}
                        <div style={{padding:'10px 12px', display:'flex', alignItems:'flex-start', gap:8}}>
                          {/* Status dot */}
                          <div style={{
                            width:6, height:6, borderRadius:'50%', marginTop:5, flexShrink:0,
                            background: qual ? '#10B981' : '#D1D5DB',
                          }} />

                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontSize:11.5, fontWeight:500, color: qual ? '#111827' : '#9CA3AF', marginBottom: qual ? 4 : 0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                              {h.address}
                            </div>
                            {qual ? (
                              <div style={{display:'flex', alignItems:'baseline', gap:6}}>
                                <span style={{fontSize:18, fontWeight:700, color:'#059669', letterSpacing:'-0.03em', lineHeight:1}}>
                                  ${(result.loanAmt/1000).toFixed(0)}k
                                </span>
                                <span style={{fontSize:10, color:'#6B7280'}}>
                                  {result.apr}% APR · <span style={{fontWeight:600, color:'#374151'}}>${result.monthly}/mo</span>
                                </span>
                              </div>
                            ) : (
                              <span style={{fontSize:10, color:'#D1D5DB'}}>Does not qualify</span>
                            )}
                          </div>
                        </div>

                        {/* Outreach actions */}
                        {qual && (
                          <div style={{padding:'6px 12px 10px', display:'flex', gap:6, borderTop:'1px solid rgba(5,150,105,0.08)'}}>
                            {done.crm ? (
                              <span style={{fontSize:10, color:'#059669', background:'rgba(5,150,105,0.08)', padding:'3px 8px', borderRadius:100, fontWeight:600}}>✓ In CRM</span>
                            ) : (
                              <button
                                onClick={async () => {
                                  setOutreachDone(prev => ({...prev, [h.id]: {...(prev[h.id]||{}), crm: 'pending'}}))
                                  try {
                                    const newLead = {
                                      status: 'qualified',
                                      name: h.owner,
                                      location: h.address.split(',').slice(1).join(',').trim() || h.address,
                                      address: h.address,
                                      amount: `$${Number(result.loanAmt).toLocaleString()}`,
                                      product: 'HELOC',
                                      monthly: result.monthly,
                                      apr: `${result.apr}%`,
                                      fiveYear: Math.round(result.monthly * 60),
                                      portal: false, apply: false, days: 0,
                                      lastActivity: 'Just added · Geo prescreen',
                                      actions: ['Send Email','Send Postcard'],
                                      phone: '(555) 555-0100',
                                      email: `${h.owner.split(' ')[0].toLowerCase()}@example.com`,
                                      offerDate: 'Today', offerStatus: 'active',
                                      propValue: `$${(h.homeValue/1000).toFixed(0)}k`,
                                      equity:    `$${(h.equity/1000).toFixed(0)}k`,
                                      cltv: `${Math.round((h.homeValue - h.equity)/h.homeValue * 100)}%`,
                                      fico: String(h.fico), dti: '—',
                                      portalFirst: null, portalLast: null, pagesViewed: 0, clickedApply: null, daysSince: 0,
                                      emailSent: null, postcardSent: null, lastContact: null,
                                      source: 'Geo Lead Search', createdBy: userInfo?.user_info?.full_name || 'Demo User', createdDate: 'Today',
                                      prescreenChecks: [
                                        { check: 'Address Verification', result: 'Pass', reason: null },
                                        { check: 'Max CLTV',             result: 'Pass', reason: null },
                                        { check: 'Credit check',         result: 'Pass', reason: null },
                                        { check: 'Loan Offer',           result: 'Generated', reason: null },
                                      ],
                                      timeline: [{ date: 'Today', event: 'Lead created via Geo Lead Search' }],
                                    }
                                    const newLeadId = await addLead(newLead)
                                    setOutreachDone(prev => ({...prev, [h.id]: {...(prev[h.id]||{}), crm: true}}))
                                    // Hand off to Pipeline so it highlights the new lead on arrival.
                                    try {
                                      sessionStorage.setItem('pipeline_freshly_added', String(newLeadId))
                                      sessionStorage.setItem('pipeline_freshly_added_at', String(Date.now()))
                                    } catch {}
                                    navigate('/pipeline')
                                  } catch (err) {
                                    console.warn('[firestore] addLead failed', err)
                                    setOutreachDone(prev => ({...prev, [h.id]: {...(prev[h.id]||{}), crm: false}}))
                                  }
                                }}
                                disabled={done.crm === 'pending'}
                                style={{fontSize:10, padding:'3px 10px', background:'#001660', color:'#fff', border:'none', borderRadius:100, cursor: done.crm === 'pending' ? 'wait' : 'pointer', fontWeight:600, opacity: done.crm === 'pending' ? 0.7 : 1}}>
                                {done.crm === 'pending' ? 'Adding…' : '+ CRM'}
                              </button>
                            )}
                            {done.mail ? (
                              <button
                                onClick={() => setEmailPreview({ home: h, result })}
                                style={{fontSize:10, color:'#059669', background:'rgba(5,150,105,0.08)', padding:'3px 8px', borderRadius:100, fontWeight:600, border:'none', cursor:'pointer'}}>✓ Email</button>
                            ) : (
                              <button
                                onClick={() => setEmailPreview({ home: h, result })}
                                style={{fontSize:10, padding:'3px 10px', background:'transparent', color:'#6B7280', border:'1px solid #E5E7EB', borderRadius:100, cursor:'pointer'}}>
                                Preview Email
                              </button>
                            )}
                            {done.postcard ? (
                              <button
                                onClick={() => setMailPreview({ home: h, result, kind: 'postcard' })}
                                style={{fontSize:10, color:'#059669', background:'rgba(5,150,105,0.08)', padding:'3px 8px', borderRadius:100, fontWeight:600, border:'none', cursor:'pointer'}}>✓ Postcard</button>
                            ) : (
                              <button
                                onClick={() => setMailPreview({ home: h, result, kind: 'postcard' })}
                                style={{fontSize:10, padding:'3px 10px', background:'transparent', color:'#6B7280', border:'1px solid #E5E7EB', borderRadius:100, cursor:'pointer'}}>
                                Postcard
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Launch CTA */}
                <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-2 shrink-0" style={{background:'#fff'}}>
                  <button
                    onClick={() => leadSearchMode ? onCancel() : setStep(3)}
                    style={{width:'100%', padding:'10px', fontSize:13, fontWeight:700, background:'#001660', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', letterSpacing:'-0.01em'}}>
                    {leadSearchMode ? 'Done — back to Pipeline' : 'Launch Campaign →'}
                  </button>
                  <button
                    onClick={() => { setHouseholdPhase('list'); setPrescreenResults({}); setOutreachDone({}) }}
                    style={{width:'100%', padding:'8px', fontSize:12, color:'#9CA3AF', background:'transparent', border:'none', cursor:'pointer'}}>
                    ← Back to selection
                  </button>
                </div>
              </>
              )
            })()}

          </div>
          )}

        </div>
        </div>
        </div>
      )}

      {/* Step 1 / Step 3 layout — centered content (not the map split view) */}
      {step !== 2 && (
        <div className="flex-1 flex items-start justify-center px-8 pt-8 pb-6 overflow-auto">
          <div className="w-full max-w-xl flex flex-col gap-6">

            {step === 3 && (
              <div className="flex flex-col items-center gap-6 text-center w-full">
                {/* Hero image */}
                <div className="w-full rounded-2xl overflow-hidden relative" style={{height: 200}}>
                  <img
                    src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=400&fit=crop&auto=format"
                    alt="City aerial"
                    className="w-full h-full object-cover"
                    style={{filter:'brightness(0.7)'}}
                  />
                  <div className="absolute inset-0" style={{background:'linear-gradient(180deg, rgba(0,22,96,0.3) 0%, rgba(0,22,96,0.65) 100%)'}} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="text-4xl">🚀</div>
                    <h2 className="text-xl font-bold text-white leading-snug px-4">{campaignName}</h2>
                    <p className="text-white/70 text-sm">is launching now</p>
                  </div>
                </div>

                {/* Status card */}
                <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm text-[13px]">
                  <div className="px-6 py-5 border-b border-gray-100 flex flex-col gap-3 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Households prescreened</span>
                      <span className="text-gray-900 font-semibold">{prescreenedHomes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Qualified</span>
                      <span className="text-emerald-700 font-semibold">{qualifiedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Target area</span>
                      <span className="text-gray-900">SW Miami · 12.4 sq mi</span>
                    </div>
                  </div>
                  <div className="px-6 py-4 flex flex-col gap-1.5 text-gray-400 text-[13px] text-center">
                    <p>Launching outreach for <span className="text-gray-900 font-semibold">{qualifiedCount} qualified homeowners</span>.</p>
                    <p className="text-[12px]">You'll be notified when results are ready.</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Fixed bottom nav — step 3 (launched) only */}
      {step === 3 && (
        <div className="fixed bottom-0 left-0 right-0 px-8 py-5 flex items-center justify-end z-50"
          style={{background: dark ? '#172340' : '#fff', borderTop:`1px solid ${dark ? 'rgba(99,140,255,0.12)' : '#F3F4F6'}`}}>
          <button
            onClick={() => onLaunch(campaignName, estQualify)}
            className="pl-btn-primary">
            Go back to Campaigns
          </button>
        </div>
      )}

      {searchModalOpen && (
        <SearchAddressModal
          step={searchStep}
          query={searchQuery}
          setQuery={setSearchQuery}
          loading={searchLoading}
          results={searchResults}
          selected={searchSelected}
          setSelected={setSearchSelected}
          radiusMi={searchRadiusMi}
          setRadiusMi={setSearchRadiusMi}
          onClose={() => setSearchModalOpen(false)}
          onSearch={async () => {
            const q = searchQuery.trim()
            if (!q) return
            setSearchLoading(true); setSearchResults([]); setSearchSelected(null)
            try {
              const list = await geocodeAddress(q)
              setSearchResults(Array.isArray(list) ? list : [])
              if (Array.isArray(list) && list.length > 0) setSearchSelected(list[0])
            } catch (e) {
              console.warn('[geo-search] geocode', e)
              setSearchResults([])
            } finally {
              setSearchLoading(false)
            }
          }}
          onNext={() => setSearchStep(2)}
          onBack={() => setSearchStep(1)}
          onConfirm={() => {
            if (!searchSelected) return
            const center = [searchSelected.lat, searchSelected.lng]
            const radiusMeters = searchRadiusMi * 1609.34
            const latlngs = circleRingLatLngs(center, radiusMeters, 64)
            const bbox = bboxFromLatLngs(latlngs)
            // Zoom in proportional to radius
            const zoom = searchRadiusMi <= 0.25 ? 15
              : searchRadiusMi <= 0.5 ? 14
              : searchRadiusMi <= 1   ? 13
              : searchRadiusMi <= 2   ? 12 : 11
            setMapFlyTo([center[0], center[1], zoom])
            setSearchModalOpen(false)
            // Treat as a freshly-drawn polygon (downstream code handles polygons cleanly,
            // and a 64-segment ring renders as a circle on the map).
            const newShape = {
              kind: 'polygon',
              latlngs,
              bbox,
              areaKm2: Math.PI * (radiusMeters / 1000) ** 2,
              center,
              radius: radiusMeters,
            }
            activateShapeFromCampaign(newShape)
            // Auto-fire live pipeline for address-search drops too.
            setTimeout(() => runLiveHouseholdsFetch(newShape), 1200)
          }}
        />
      )}
      {emailPreview && (
        <EmailPreviewModal
          home={emailPreview.home}
          result={emailPreview.result}
          homes={emailPreview.homes}
          results={emailPreview.results}
          bankName={userInfo?.bank_info?.bank_display_name || userInfo?.bank_info?.display_name || 'Greenlyne Bank'}
          onClose={() => setEmailPreview(null)}
          onSend={(home) => {
            const id = (home || emailPreview.home).id
            setOutreachDone(prev => ({...prev, [id]: {...(prev[id]||{}), mail: true}}))
            setEmailPreview(null)
          }}
        />
      )}
      {mailPreview && (
        <PostcardPreviewModal
          home={mailPreview.home}
          result={mailPreview.result}
          homes={mailPreview.homes}
          results={mailPreview.results}
          bankName={userInfo?.bank_info?.bank_display_name || userInfo?.bank_info?.display_name || 'Greenlyne Bank'}
          onClose={() => setMailPreview(null)}
          onSend={(home) => {
            const id = (home || mailPreview.home).id
            setOutreachDone(prev => ({...prev, [id]: {...(prev[id]||{}), postcard: true}}))
            setMailPreview(null)
          }}
        />
      )}

    </div>
  )
}

/** Build a closed ring of [lat,lng] points approximating a circle of radius meters
 * around center [lat, lng]. Uses an equirectangular approximation — fine for the
 * radii we use (≤ a few miles) and renders smoothly with 64 segments. */
function circleRingLatLngs(center, radiusMeters, segments = 64) {
  const [lat0, lng0] = center
  const latRad = lat0 * Math.PI / 180
  const dLat = radiusMeters / 111_320                          // ~meters per degree latitude
  const dLng = radiusMeters / (111_320 * Math.cos(latRad))     // accounting for cos(lat)
  const ring = []
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * 2 * Math.PI
    ring.push([lat0 + dLat * Math.sin(t), lng0 + dLng * Math.cos(t)])
  }
  ring.push(ring[0])
  return ring
}

function SearchAddressModal({ step, query, setQuery, loading, results, selected, setSelected, radiusMi, setRadiusMi, onClose, onSearch, onNext, onBack, onConfirm }) {
  const stepLabel = `Step ${step} of 2`
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6" style={{background:'rgba(0,22,96,0.45)', backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="rounded-2xl overflow-hidden flex flex-col" style={{width:'min(720px, 100%)', maxHeight:'90vh', background:'#fff', boxShadow:'0 24px 80px rgba(0,22,96,0.35)'}}>
        <div className="px-6 py-4 flex items-center justify-between" style={{borderBottom:'1px solid #F3F4F6', background:'#FAFBFD'}}>
          <div className="flex items-center gap-3">
            <span className="text-gray-300 text-lg leading-none cursor-grab select-none">⋮⋮</span>
            <div className="text-[18px] font-bold tracking-tight" style={{color:'#1F2937'}}>
              {step === 1 ? 'Search Address' : 'Set Radius'} <span className="text-[14px] font-medium" style={{color:'#6B7280'}}>({stepLabel})</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-7 py-6 overflow-y-auto" style={{minHeight:280}}>
          {step === 1 ? (
            <>
              <p className="text-[13.5px] leading-relaxed mb-5" style={{color:'#4B5563'}}>
                Search for an address to draw a circle around. Enter an address and click search to see available options.
              </p>
              <label className="block text-[13px] mb-2" style={{color:'#4B5563'}}>Enter Address or Zip code</label>
              <div className="flex gap-2 mb-5">
                <input
                  type="text" autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') onSearch() }}
                  placeholder="e.g., 123 Main St, New York, NY"
                  className="flex-1 px-4 py-2.5 text-[13.5px] outline-none rounded-md"
                  style={{background:'#fff', border:'1.5px solid #93C5FD', color:'#111827'}}
                />
                <button onClick={onSearch} disabled={loading || !query.trim()}
                  className="text-[13.5px] font-semibold px-6 py-2.5 rounded-md"
                  style={{background:'#10B981', color:'#fff', border:'none', cursor: loading ? 'wait' : 'pointer', opacity: (loading || !query.trim()) ? 0.7 : 1}}>
                  {loading ? 'Searching…' : 'Search'}
                </button>
              </div>

              {results.length > 0 && (
                <>
                  <div className="text-[13px] mb-2" style={{color:'#4B5563'}}>Select an address:</div>
                  <div className="flex flex-col gap-2">
                    {results.map((r, i) => {
                      const isSel = selected && selected.lat === r.lat && selected.lng === r.lng
                      return (
                        <button key={i} onClick={() => setSelected(r)}
                          className="text-left rounded-md px-4 py-3 transition-colors"
                          style={{
                            background: isSel ? '#10B981' : '#F3F4F6',
                            color: isSel ? '#fff' : '#111827',
                            border: `1px solid ${isSel ? '#10B981' : 'transparent'}`,
                          }}>
                          <div className="text-[14px] font-bold">{r.label}</div>
                          <div className="text-[12px] mt-0.5" style={{opacity: 0.85}}>
                            Lat: {r.lat.toFixed(6)}, Lng: {r.lng.toFixed(6)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
              {!loading && query && results.length === 0 && (
                <div className="text-[12.5px]" style={{color:'#9CA3AF'}}>No results yet — click Search.</div>
              )}
            </>
          ) : (
            <>
              <p className="text-[13.5px] leading-relaxed mb-5" style={{color:'#4B5563'}}>
                Choose how wide a radius to capture around <strong style={{color:'#111827'}}>{selected?.label}</strong>.
              </p>
              <div className="rounded-xl px-5 py-5" style={{background:'#F8FAFF', border:'1px solid rgba(37,75,206,0.12)'}}>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-[12px] font-semibold uppercase tracking-widest" style={{color:'rgba(0,22,96,0.6)'}}>Radius</span>
                  <span className="text-[26px] font-bold" style={{color:'#001660', letterSpacing:'-0.02em'}}>
                    {radiusMi < 1 ? `${(radiusMi * 5280).toFixed(0)} ft` : `${radiusMi} mi`}
                  </span>
                </div>
                <input type="range" min="0.1" max="5" step="0.1" value={radiusMi}
                  onChange={e => setRadiusMi(Number(e.target.value))}
                  className="w-full" style={{accentColor:'#001660'}} />
                <div className="flex justify-between text-[10.5px] mt-1.5" style={{color:'#9CA3AF'}}>
                  <span>0.1 mi</span><span>1 mi</span><span>2.5 mi</span><span>5 mi</span>
                </div>
                <div className="flex gap-2 mt-4">
                  {[0.25, 0.5, 1, 2, 5].map(r => (
                    <button key={r} onClick={() => setRadiusMi(r)}
                      className="flex-1 text-[11.5px] font-semibold py-1.5 rounded-md transition-colors"
                      style={{
                        background: radiusMi === r ? '#001660' : '#fff',
                        color: radiusMi === r ? '#fff' : '#374151',
                        border: `1px solid ${radiusMi === r ? '#001660' : '#E5E7EB'}`,
                      }}>
                      {r < 1 ? `${(r * 5280).toFixed(0)} ft` : `${r} mi`}
                    </button>
                  ))}
                </div>
                <div className="text-[11.5px] mt-4" style={{color:'#6B7280'}}>
                  Coverage area: <strong style={{color:'#111827'}}>{(Math.PI * radiusMi * radiusMi).toFixed(2)} sq mi</strong>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-2" style={{borderTop:'1px solid #F3F4F6'}}>
          {step === 2 && (
            <button onClick={onBack} className="text-[13px] px-4 py-2 rounded-md font-medium" style={{color:'#6B7280', background:'transparent', border:'1px solid #E5E7EB'}}>← Back</button>
          )}
          <button onClick={onClose} className="text-[13px] px-5 py-2 rounded-md font-semibold" style={{background:'#1F2937', color:'#fff', border:'none'}}>Cancel</button>
          {step === 1 ? (
            <button onClick={onNext} disabled={!selected}
              className="text-[13px] px-5 py-2 rounded-md font-semibold"
              style={{background:'#10B981', color:'#fff', border:'none', opacity: selected ? 1 : 0.55, cursor: selected ? 'pointer' : 'not-allowed'}}>
              Next: Set Radius
            </button>
          ) : (
            <button onClick={onConfirm}
              className="text-[13px] px-5 py-2 rounded-md font-semibold"
              style={{background:'#10B981', color:'#fff', border:'none'}}>
              Drop Circle
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmailPreviewModal({ home, result, homes, results, bankName, onClose, onSend }) {
  const list = (homes && homes.length > 0) ? homes : [home]
  const startIdx = Math.max(0, list.findIndex(h => h.id === home.id))
  const [idx, setIdx] = useState(startIdx === -1 ? 0 : startIdx)
  const current = list[idx] || home
  const currentResult = results ? results[current.id] : result
  const multi = list.length > 1
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" style={{background:'rgba(0,22,96,0.45)', backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="rounded-2xl overflow-hidden flex flex-col relative" style={{width:'min(740px, 100%)', height:'min(960px, 92vh)', background:'#fff', boxShadow:'0 24px 80px rgba(0,22,96,0.35)'}}>
        <div className="shrink-0 px-5 py-3 flex items-center justify-between gap-3" style={{borderBottom:'1px solid #F0F2F5', background:'#fff'}}>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{color:'rgba(0,22,96,0.55)'}}>Email Preview{multi ? ` · Lead ${idx + 1} of ${list.length}` : ''}</div>
            <div className="text-[14px] font-semibold mt-0.5 truncate" style={{color:'#001660'}}>{current.address || current.street || 'Selected lead'}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {multi && (
              <div className="flex items-center gap-1 mr-1">
                <button onClick={() => setIdx(i => (i - 1 + list.length) % list.length)} aria-label="Previous lead"
                  className="rounded-lg w-8 h-8 flex items-center justify-center"
                  style={{background:'#fff', border:'1px solid #E5E7EB', color:'#001660', cursor:'pointer'}}
                  onMouseOver={e => e.currentTarget.style.background='#F9FAFB'} onMouseOut={e => e.currentTarget.style.background='#fff'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button onClick={() => setIdx(i => (i + 1) % list.length)} aria-label="Next lead"
                  className="rounded-lg w-8 h-8 flex items-center justify-center"
                  style={{background:'#fff', border:'1px solid #E5E7EB', color:'#001660', cursor:'pointer'}}
                  onMouseOver={e => e.currentTarget.style.background='#F9FAFB'} onMouseOut={e => e.currentTarget.style.background='#fff'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}
            <button onClick={() => onSend(current)}
              className="text-[12px] font-semibold rounded-lg px-3 py-1.5"
              style={{background:'#001660', border:'none', color:'#fff', cursor:'pointer'}}>
              Send email
            </button>
            <button onClick={onClose} aria-label="Close"
              className="rounded-lg w-8 h-8 flex items-center justify-center"
              style={{background:'#fff', border:'1px solid #E5E7EB', color:'#6B7280', cursor:'pointer'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div key={current.id} className="flex-1 overflow-y-auto">
          <EmailPreviewPage
            loanAmountOverride={currentResult?.loanAmt}
            recipient={(() => {
              const ownerFull = current.owner || `${current.ownerFirst||''} ${current.ownerLast||''}`.trim() || 'Homeowner'
              const parts = ownerFull.split(/\s+/)
              const fn = current.ownerFirst || parts[0] || 'Homeowner'
              const ln = current.ownerLast  || parts.slice(1).join(' ') || ''
              const emailLocal = `${(fn || 'lead').toLowerCase().replace(/[^a-z0-9]+/g,'')}.${(ln || '').toLowerCase().replace(/[^a-z0-9]+/g,'')}`.replace(/\.$/,'')
              const streetOnly = (current.street || current.address || '').split(',')[0].trim()
              const mortgageBal = current.homeValue && current.equity ? Math.max(0, Number(current.homeValue) - Number(current.equity)) : undefined
              return {
                firstName: fn,
                lastName: ln,
                email: emailLocal ? `${emailLocal}@example.com` : undefined,
                address: streetOnly || undefined,
                city: current.city || undefined,
                state: current.state || undefined,
                fico: current.fico || undefined,
                propValue: current.homeValue || undefined,
                mortgageBal,
                loanAmount: currentResult?.loanAmt,
              }
            })()}
          />
        </div>
      </div>
    </div>
  )
}

function PostcardPreviewModal({ home, result, homes, results, bankName, onClose, onSend }) {
  const list = (homes && homes.length > 0) ? homes : [home]
  const startIdx = Math.max(0, list.findIndex(h => h.id === home.id))
  const [idx, setIdx] = useState(startIdx === -1 ? 0 : startIdx)
  const current = list[idx] || home
  const currentResult = (results ? results[current.id] : result) || result
  const multi = list.length > 1
  const loanK = `$${(currentResult.loanAmt/1000).toFixed(0)}k`
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6" style={{background:'rgba(0,22,96,0.45)', backdropFilter:'blur(4px)'}} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="rounded-2xl overflow-hidden flex flex-col" style={{width:'min(640px, 100%)', maxHeight:'90vh', background:'#fff', boxShadow:'0 24px 80px rgba(0,22,96,0.35)'}}>
        <div className="px-6 py-4 flex items-center justify-between gap-3" style={{borderBottom:'1px solid #F3F4F6'}}>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{color:'rgba(0,22,96,0.55)'}}>Postcard Preview{multi ? ` · Lead ${idx + 1} of ${list.length}` : ''}</div>
            <div className="text-[15px] font-semibold mt-0.5 truncate" style={{color:'#001660'}}>{current.address || current.street}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {multi && (<>
              <button onClick={() => setIdx(i => (i - 1 + list.length) % list.length)} aria-label="Previous lead"
                className="rounded-lg w-8 h-8 flex items-center justify-center"
                style={{background:'#fff', border:'1px solid #E5E7EB', color:'#001660', cursor:'pointer'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button onClick={() => setIdx(i => (i + 1) % list.length)} aria-label="Next lead"
                className="rounded-lg w-8 h-8 flex items-center justify-center"
                style={{background:'#fff', border:'1px solid #E5E7EB', color:'#001660', cursor:'pointer'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </>)}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-1">×</button>
          </div>
        </div>
        <div className="px-6 py-6 overflow-y-auto" style={{background:'#F8FAFF'}}>
          <div className="rounded-xl overflow-hidden mx-auto" style={{width:'min(520px,100%)', aspectRatio:'5/3.5', background:'linear-gradient(135deg, #001660 0%, #254BCE 100%)', color:'#fff', boxShadow:'0 12px 40px rgba(0,22,96,0.25)', position:'relative'}}>
            <div className="p-6 h-full flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-85">{bankName}</div>
                <div className="mt-3 text-[26px] font-bold tracking-tight leading-tight">You're pre-approved<br/>for up to <span style={{color:'#A5F3D0'}}>{loanK}</span></div>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="text-[11px] opacity-90 leading-snug" style={{maxWidth:'60%'}}>
                  <div className="font-semibold opacity-100">{current.owner || `${current.ownerFirst||''} ${current.ownerLast||''}`.trim()}</div>
                  <div>{current.address || current.street}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-widest opacity-70">Estimated</div>
                  <div className="text-[14px] font-bold">${currentResult.monthly}/mo</div>
                  <div className="text-[10px] opacity-80">{currentResult.apr}% APR</div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center text-[11px] mt-5" style={{color:'#6B7280'}}>5×7 full-color postcard · USPS first-class · 2–4 day delivery</div>
        </div>
        <div className="px-6 py-4 flex items-center justify-end gap-2" style={{borderTop:'1px solid #F3F4F6'}}>
          <button onClick={onClose} className="text-[12px] px-4 py-2 rounded-md" style={{color:'#6B7280', background:'transparent', border:'1px solid #E5E7EB'}}>Cancel</button>
          <button onClick={() => onSend(current)} className="text-[12px] px-4 py-2 rounded-md font-semibold" style={{background:'#059669', color:'#fff', border:'none'}}>Queue for print &amp; mail</button>
        </div>
      </div>
    </div>
  )
}

export default function GeoCampaigns() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { dark } = useTheme()
  const isMobile = useIsMobile(768)
  const [showNew, setShowNew] = useState(false)
  const [namingModal, setNamingModal] = useState(false)
  const [pendingName, setPendingName] = useState('')
  const [showBrowseMap, setShowBrowseMap] = useState(() => searchParams.get('view') === 'map')
  const fromPipeline = searchParams.get('from') === 'pipeline'
  const [editingCampaign, setEditingCampaign] = useState(null) // campaign to edit
  const [viewingCampaign, setViewingCampaign] = useState(null) // campaign to view on map
  const [selectedCampaignLead, setSelectedCampaignLead] = useState(null)
  const [campaigns, setCampaigns] = useState(CAMPAIGNS_BASE)
  const [landingLoading, setLandingLoading] = useState(true)
  const [processingInfo, setProcessingInfo] = useState(null) // { id, name, qualify }
  const [processingProgress, setProcessingProgress] = useState(0)
  const [toast, setToast] = useState(null) // { name, qualify }
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')        // 'grid' | 'list'
  const [sortBy, setSortBy] = useState('newest')          // 'newest' | 'qualified' | 'targeted' | 'name'
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'paused' | 'draft'

  // Dark mode tokens
  const D = {
    pageBg:    dark ? '#0F172A' : '#F8F9FB',
    cardBg:    dark ? '#172340' : '#fff',
    cardBorder: dark ? 'rgba(99,140,255,0.12)' : 'rgba(0,22,96,0.08)',
    text:      dark ? '#E8EEF8' : '#001660',
    textMuted: dark ? 'rgba(232,238,248,0.45)' : 'rgba(0,22,96,0.4)',
    divider:   dark ? 'rgba(99,140,255,0.10)' : 'rgba(0,22,96,0.06)',
    metricBg1: dark ? 'rgba(37,75,206,0.15)' : 'rgba(37,75,206,0.05)',
    metricBg2: dark ? 'rgba(1,97,99,0.18)' : 'rgba(1,97,99,0.05)',
    searchBg:  dark ? '#172340' : '#fff',
    searchBorder: dark ? 'rgba(99,140,255,0.2)' : '#E5E7EB',
    listRowBg: dark ? '#172340' : '#fff',
    listRowBorder: dark ? 'rgba(99,140,255,0.12)' : '#E5E8EB',
    labelColor: dark ? 'rgba(232,238,248,0.35)' : 'rgba(0,22,96,0.35)',
    secondaryBtn: dark ? 'rgba(232,238,248,0.08)' : 'transparent',
    secondaryBtnBorder: dark ? 'rgba(232,238,248,0.15)' : 'rgba(0,22,96,0.18)',
    secondaryBtnText: dark ? '#E8EEF8' : '#001660',
    secondaryBtnHover: dark ? 'rgba(232,238,248,0.12)' : 'rgba(0,22,96,0.04)',
  }
  const secBtn = dark ? { background: 'rgba(232,238,248,0.08)', color: '#E8EEF8', borderColor: 'rgba(232,238,248,0.15)' } : {}

  /** Delete a saved campaign from the backend. Live cards expose backendId
   * via _live=true; demo CAMPAIGNS_BASE entries are mock-only and just removed
   * from local state. */
  async function handleDeleteLandingCampaign(c) {
    if (!c) return
    const ok = typeof window !== 'undefined'
      ? window.confirm(`Delete campaign "${c.name}"?\n\n${c._live ? 'This permanently removes it from the backend.' : 'This is a demo card — it will only be hidden locally.'}`)
      : true
    if (!ok) return
    if (c._live && c.backendId != null) {
      try {
        await deleteSavedCampaign(c.backendId)
      } catch (e) {
        console.warn('[geo] delete landing campaign', e)
        window.alert(`Delete failed: ${e?.message || 'unknown error'}`)
        return
      }
    }
    setCampaigns(prev => prev.filter(x => x.id !== c.id))
  }

  function handleLaunch(name, qualify) {
    setShowNew(false)
    setEditingCampaign(null)
    const newId = Date.now()
    setCampaigns(prev => [{
      id: newId, name, status: 'processing', launched: 'just now',
      type: 'Mail campaign', targeted: 2400, qualified: qualify ?? 0,
      contacted: 0, engaged: 0, hot: 0, medianEquity: '$142k', avgFico: 714,
      cityImg: cityPhotoFor('Miami, FL'),
      cityLabel: 'Miami, FL',
      lat: 25.7617, lng: -80.1918, zoom: 12,
    }, ...prev])
    setProcessingInfo({ id: newId, name, qualify })
    setProcessingProgress(0)
  }

  useEffect(() => {
    if (!processingInfo) return
    const { id, name } = processingInfo
    const start = Date.now()
    const DURATION = 3800
    const TARGET = 680

    const progTimer = setInterval(() => {
      const prog = Math.min(TARGET, Math.round(((Date.now() - start) / DURATION) * TARGET))
      setProcessingProgress(prog)
      if (Date.now() - start >= DURATION) clearInterval(progTimer)
    }, 80)

    const completeTimer = setTimeout(() => {
      clearInterval(progTimer)
      setProcessingProgress(TARGET)
      setProcessingInfo(null)
      setCampaigns(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'active', qualified: 847, contacted: 0, engaged: 0, hot: 0 } : c
      ))
      setToast({ name })
    }, 4500)

    return () => { clearInterval(progTimer); clearTimeout(completeTimer) }
  }, [processingInfo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  /** Pull the live tenant's campaigns from the backend and merge them into
   * the cards list so saved campaigns appear alongside the demo CAMPAIGNS_BASE.
   * Re-runs every time the user comes back from the map view. */
  useEffect(() => {
    if (showBrowseMap) return
    let cancelled = false
    setLandingLoading(true)
    listSavedCampaigns()
      .then(data => {
        if (cancelled) return
        const arr = data?.results || data || []
        const realCards = arr.map(c => {
          const created = c.created_at ? new Date(c.created_at) : null
          const launched = created ? created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
          const period   = created ? created.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''
          const targeted = Number(c.total_property_count ?? c.selected_households ?? 0)
          const qualified = Number(c.qualifying_homeowners ?? c.qualifying_households ?? 0)
          const status = (c.status && c.status !== 'Saved') ? 'active' : 'draft'
          return {
            id: `live-${c.id}`,
            backendId: c.id,
            name: c.name || `Campaign #${c.id}`,
            period,
            status,
            launched,
            type: c.campaign_type === 'social-media' ? 'Social Media Campaign' : 'Mail Campaign',
            targeted, qualified,
            contacted: 0, engaged: 0, hot: 0,
            medianEquity: '—',
            avgFico: '—',
            cityLabel: c.organization_name || '',
            cityImg: cityPhotoFor(c.organization_name || c.name || ''),
            ...(cityCoordsFor(c.organization_name, c.name) || {}),
            createdBy: c.created_by_name || '',
            backendStatus: c.status || 'Saved',
            _live: true,
            _createdAt: created ? created.getTime() : 0,
          }
        })
        // Newest live cards first so a just-created campaign lands at index 0.
        realCards.sort((a, b) => (b._createdAt || 0) - (a._createdAt || 0))
        // Stage the new list internally but don't reveal until all polygon
        // fetches complete — avoids the "city photo → map snippet" flash.
        const staged = [...realCards, ...CAMPAIGNS_BASE]
        // Lazy-fetch each live campaign's polygon so we can render a real map
        // snippet (centroid + polygon overlay) on the card. Once everything is
        // ready we flip `landingLoading` off in one go.
        ;(async () => {
          const need = realCards.filter(rc => rc.backendId != null)
          const CONCURRENCY = 4
          const patches = new Map()
          let i = 0
          async function worker() {
            while (!cancelled && i < need.length) {
              const rc = need[i++]
              try {
                const detail = await getSavedCampaignDetail(rc.backendId)
                const r = Array.isArray(detail?.results) && detail.results[0] ? detail.results[0] : null
                const poly = r?.polygon_coordinates
                if (!Array.isArray(poly) || poly.length < 3) continue
                const latlngs = poly.map(([lng, lat]) => [lat, lng])
                let sLat = 0, sLng = 0
                for (const [la, ln] of latlngs) { sLat += la; sLng += ln }
                patches.set(rc.id, { lat: sLat / latlngs.length, lng: sLng / latlngs.length, zoom: 12, polygon: latlngs })
              } catch (err) {
                // Silent — falls back to city photo.
              }
            }
          }
          await Promise.all(Array.from({ length: CONCURRENCY }, worker))
          if (cancelled) return
          // Single state flush: enriched list goes live in one frame, then we
          // drop the loading skeleton.
          const final = staged.map(c => patches.has(c.id) ? { ...c, ...patches.get(c.id) } : c)
          setCampaigns(final)
          setLandingLoading(false)
        })()
      })
      .catch(e => { console.warn('[geo] list campaigns', e); if (!cancelled) setLandingLoading(false) })
    return () => { cancelled = true }
  }, [showBrowseMap])

  if (showNew || editingCampaign) {
    return (
      <NewCampaignFlow
        onCancel={() => { setShowNew(false); setEditingCampaign(null) }}
        onLaunch={handleLaunch}
        initialData={editingCampaign}
        initialName={pendingName}
      />
    )
  }

  if (showBrowseMap) {
    const exit = () => {
      if (fromPipeline) {
        navigate('/pipeline')
      } else {
        setShowBrowseMap(false)
        setPendingName('')
        setSearchParams({}, { replace: true })
      }
    }
    const loadCampaignId = searchParams.get('load') || ''
    if (isMobile) {
      return (
        <GeoMapMobile
          onBack={exit}
          onOpenCampaigns={() => {
            setShowBrowseMap(false)
            setSearchParams({}, { replace: true })
          }}
        />
      )
    }
    return (
      <NewCampaignFlow
        leadSearchMode
        fromPipeline={fromPipeline}
        initialName={pendingName}
        loadCampaignId={loadCampaignId}
        onCancel={exit}
        onLaunch={exit}
      />
    )
  }

  if (viewingCampaign) {
    const c = viewingCampaign
    return (
      <div className="flex flex-col overflow-hidden bg-gray-50" style={{height:'calc(100vh - 3.5rem)'}}>
        {/* Header */}
        <div className="h-14 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
          <button
            onClick={() => setViewingCampaign(null)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
            ← Campaigns
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-2 flex-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'active' ? 'bg-green-500' : 'bg-yellow-400'}`} />
            <span className="text-sm font-semibold text-gray-900 truncate">{c.name}</span>
            <span className="text-xs text-gray-400 shrink-0">{c.type} · Launched {c.launched}</span>
          </div>
          <button
            onClick={() => {
              setViewingCampaign(null)
              const loadId = c.backendId ?? (typeof c.id === 'string' && c.id.startsWith('live-') ? c.id.slice(5) : c.id)
              setSearchParams({ view: 'map', load: String(loadId) })
              setShowBrowseMap(true)
            }}
            className="px-4 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
            Edit Campaign
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: campaign stats */}
          <div className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Campaign Stats</h3>
            </div>
            <div className="\1ext-[12px] flex flex-col divide-y divide-gray-50">
              <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-emerald-700 font-semibold text-[20px]">{c.qualified.toLocaleString()}</span>
                  <span className="text-gray-400 text-[11px]">qualified homeowners</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-900 font-semibold text-[16px]">{c.targeted.toLocaleString()}</span>
                  <span className="text-gray-400 text-[11px]">targeted in area</span>
                </div>
              </div>
              <div className="px-5 py-4 flex flex-col gap-2.5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Funnel</span>
                {[
                  { label: 'Contacted',  value: c.contacted > 0 ? c.contacted.toLocaleString() : '—' },
                  { label: 'Engaged',   value: c.engaged   > 0 ? c.engaged.toLocaleString()   : '—' },
                  { label: 'Hot leads', value: c.hot       > 0 ? c.hot.toLocaleString()       : '—', hot: c.hot > 0 },
                ].map(({ label, value, hot }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className={`font-semibold ${hot ? 'text-orange-500' : 'text-gray-900'}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 flex flex-col gap-2.5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Area Metrics</span>
                {[
                  { label: 'Median equity', value: c.medianEquity },
                  { label: 'Avg FICO',      value: c.avgFico.toString() },
                  { label: 'Median home value', value: '$385,000' },
                  { label: 'Avg CLTV',      value: '63%' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-900 font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Map */}
          <div className="flex-1 flex items-center justify-center p-5 overflow-hidden" style={{background:'#F0F2F5'}}>
            <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{boxShadow:'0 2px 16px rgba(0,22,96,0.10), 0 1px 4px rgba(0,0,0,0.06)', border:'1px solid rgba(0,22,96,0.08)'}}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice">
                <rect width="900" height="600" fill="#ede8de"/>
                <polygon points="740,0 900,0 900,600 700,600 630,480 680,300 650,120" fill="#c2d9ee" opacity="0.85"/>
                <rect x="110" y="170" width="90" height="65" rx="3" fill="#c6d9b0"/>
                <rect x="390" y="350" width="65" height="45" rx="3" fill="#c6d9b0"/>
                <rect x="540" y="160" width="50" height="70" rx="3" fill="#c6d9b0"/>
                {[120,240,360,480].map(y => <line key={y} x1="0" y1={y} x2="740" y2={y} stroke="#ccc4b4" strokeWidth="3.5"/>)}
                {[130,260,390,520,650].map(x => <line key={x} x1={x} y1="0" x2={x} y2="600" stroke="#ccc4b4" strokeWidth="3.5"/>)}
                {[60,180,300,420,540].map(y => <line key={`sy${y}`} x1="0" y1={y} x2="740" y2={y} stroke="#d8d2c6" strokeWidth="1.5"/>)}
                {[65,195,325,455,585].map(x => <line key={`sx${x}`} x1={x} y1="0" x2={x} y2="600" stroke="#d8d2c6" strokeWidth="1.5"/>)}
                {/* Campaign polygon */}
                <polygon points="155,125 430,105 475,270 390,355 135,335 95,220" fill="#16a34a" opacity="0.15"/>
                <polygon points="155,125 430,105 475,270 390,355 135,335 95,220" fill="none" stroke="#16a34a" strokeWidth="1.5" opacity="0.8"/>
                {[[155,125],[430,105],[475,270],[390,355],[135,335],[95,220]].map(([x,y],i) => (
                  <circle key={i} cx={x} cy={y} r="5" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
                ))}
                {/* Callout */}
                <rect x="185" y="185" width="265" height="54" rx="10" fill="white"
                  style={{filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.16))'}}/>
                <text x="317" y="207" textAnchor="middle" fontFamily="PostGrotesk, sans-serif" fontSize="12" fill="#111827" fontWeight="600">
                  ~{c.targeted.toLocaleString()} homeowners in area
                </text>
                <text x="317" y="226" textAnchor="middle" fontFamily="PostGrotesk, sans-serif" fontSize="12" fill="#15803d" fontWeight="600">
                  ~{c.qualified.toLocaleString()} qualified
                </text>
              </svg>

              {/* Area label chip */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 border border-gray-200 rounded-lg px-3 py-1.5 text-[11px]  text-gray-500 shadow-sm">
                SW Miami · 12.4 sq miles
              </div>
            </div>
          </div>

          {/* Right: screened leads list */}
          {(() => {
            const leads = CAMPAIGN_LEADS[c.id] || []
            return (
              <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
                {/* Panel header */}
                <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Screened Leads</h3>
                    <span className="text-[11px] text-gray-500 font-medium">{leads.length} homeowners qualified</span>
                  </div>
                  <button
                    onClick={() => navigate('/pipeline')}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors"
                    style={{background:'rgba(37,75,206,0.08)', color:'#254BCE'}}
                  >
                    View in CRM →
                  </button>
                </div>

                {/* Leads list */}
                <div className="flex-1 overflow-y-auto">
                  {leads.map((lead, i) => {
                    const sm = STATUS_META[lead.status] || STATUS_META.qualified
                    return (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedCampaignLead(lead)}
                        className="px-4 py-3 flex flex-col gap-1.5 transition-colors hover:bg-gray-50/80 cursor-pointer"
                        style={{borderBottom:'1px solid rgba(0,0,0,0.04)'}}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-gray-900 truncate">{lead.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                            style={{background: sm.bg, color: sm.color}}>
                            {sm.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{lead.address}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[12px] font-bold" style={{color:'#016163'}}>{lead.offer}</span>
                          <span className="text-[11px] text-gray-400">FICO {lead.fico}</span>
                          <span className="text-[11px] text-gray-400">Equity {lead.equity}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Campaign Lead Modal ── */}
        {selectedCampaignLead && (() => {
          const lead = selectedCampaignLead
          const sm = STATUS_META[lead.status] || STATUS_META.qualified
          const initials = lead.name.split(' ').map(n => n[0]).join('')
          const statusHeaderColor = { hot:'#DC2626', engaged:'#D97706', contacted:'#2563EB', qualified:'#016163' }
          return (
            <>
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedCampaignLead(null)} />
              <div className="fixed top-0 right-0 h-full w-[460px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="px-6 pt-5 pb-[17px] shrink-0 flex flex-col gap-[7px]" style={{background:'#001660'}}>
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="text-[18px] font-bold text-white leading-[22.5px]">{lead.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{background:'#60a5fa'}} />
                        <span className="text-[12px] font-medium" style={{color:'rgba(255,255,255,0.65)'}}>{sm.label}</span>
                        <span className="text-[12px]" style={{color:'rgba(255,255,255,0.3)'}}>·</span>
                        <span className="text-[12px]" style={{color:'rgba(255,255,255,0.5)'}}>{lead.address}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelectedCampaignLead(null)}
                      className="p-1.5 rounded-lg transition-colors shrink-0" style={{color:'rgba(255,255,255,0.5)'}}
                      onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
                      onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px]" style={{color:'rgba(255,255,255,0.45)'}}>{lead.phone || '(512) 555-0182'}</span>
                    <span className="text-[12px]" style={{color:'rgba(255,255,255,0.45)'}}>·</span>
                    <span className="text-[12px]" style={{color:'rgba(255,255,255,0.45)'}}>{lead.email || 'sarah.johnson@email.com'}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-5 py-4 border-b border-gray-100 shrink-0" style={{background:'#F8F9FC'}}>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: 'Send Email', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>, primary: true },
                      { label: 'Send Postcard', icon: <PostcardIcon size={18} />, primary: true },
                      { label: 'Call Lead', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 4.46h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 12a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
                      { label: 'View in CRM', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> },
                    ].map(({ label, icon, primary }) => (
                      <button key={label} className="flex flex-col items-center justify-center gap-2 transition-all"
                        style={{
                          height: 75, borderRadius: 6,
                          border: primary ? '0.8px solid #254BCE' : '0.8px solid rgba(0,22,96,0.1)',
                          background: primary ? '#254BCE' : '#fff',
                          padding: '16.8px 0.8px',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = primary ? '#1e3fa8' : '#F8F9FC' }}
                        onMouseOut={e => { e.currentTarget.style.background = primary ? '#254BCE' : '#fff' }}
                      >
                        <span style={{color: primary ? '#fff' : '#254BCE', display:'flex', alignItems:'center', justifyContent:'center', width:24, height:24}}>{icon}</span>
                        <span style={{fontSize:11, fontWeight:600, fontFamily:"'PostGrotesk', sans-serif", lineHeight:'13.75px', color: primary ? '#fff' : '#374151', whiteSpace:'nowrap'}}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto">

                  {/* Offer hero */}
                  <div className="px-6 py-6 border-b border-gray-100">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">The Offer</div>
                    <div className="flex items-end justify-between mb-5">
                      <div>
                        <div className="text-5xl font-bold tracking-tight" style={{color:'#001660'}}>{lead.offer}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg" style={{background:'rgba(37,75,206,0.1)', color:'#254BCE'}}>HELOC / HELOAN</span>
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700">✓ Active Offer</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Home Equity', value: lead.equity, highlight: true },
                        { label: 'FICO Score',  value: lead.fico,   highlight: true },
                        { label: 'Status',      value: sm.label },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className="rounded-xl py-3 px-3 text-center"
                          style={{background: highlight ? 'rgba(37,75,206,0.06)' : '#F8F9FC', border: highlight ? '1px solid rgba(37,75,206,0.12)' : '1px solid rgba(0,22,96,0.06)'}}>
                          <div className="text-sm font-bold" style={highlight ? {color:'#254BCE'} : {color:'#111'}}>{value}</div>
                          <div className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 mt-1">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Property info */}
                  <div className="px-6 py-5 border-b border-gray-100">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Property</div>
                    <div className="flex items-start gap-3">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="text-sm text-gray-700">{lead.address}</span>
                    </div>
                  </div>

                  {/* Prescreen checks */}
                  <div className="px-6 py-5 border-b border-gray-100">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Prescreen Checks</div>
                    <div className="flex flex-col gap-2">
                      {['Address Verification','Max CLTV','Credit / DTI','Loan Offer'].map(check => (
                        <div key={check} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                          <span className="text-xs text-gray-700">{check}</span>
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Pass
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Source */}
                  <div className="px-6 py-5">
                    <div className="flex gap-6">
                      <div><span className="text-[10px] text-gray-400 uppercase tracking-wide">Source</span><div className="text-xs font-medium text-gray-700 mt-0.5">{c.name}</div></div>
                      <div><span className="text-[10px] text-gray-400 uppercase tracking-wide">Campaign Type</span><div className="text-xs font-medium text-gray-700 mt-0.5">Mail · Postcards + Email</div></div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )
        })()}
      </div>
    )
  }

  const filteredCampaigns = (() => {
    let list = campaigns.filter(c => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    })
    const dateValue = c => {
      if (c._createdAt) return c._createdAt
      // Mock CAMPAIGNS_BASE: parse 'Mar 2' style assuming 2026.
      if (c.launched && c.launched !== '—') {
        const t = new Date(`${c.launched} 2026`).getTime()
        if (!Number.isNaN(t)) return t
      }
      return 0
    }
    if (sortBy === 'newest') {
      list = [...list].sort((a, b) => {
        // Live campaigns always above mock ones in 'newest'.
        if (a._live && !b._live) return -1
        if (!a._live && b._live) return 1
        return dateValue(b) - dateValue(a)
      })
    } else if (sortBy === 'qualified') {
      list = [...list].sort((a, b) => (b.qualified || 0) - (a.qualified || 0))
    } else if (sortBy === 'targeted') {
      list = [...list].sort((a, b) => (b.targeted || 0) - (a.targeted || 0))
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }
    // Pin the most recently created campaign to position 0 regardless of sort.
    let newestIdx = -1, newestTs = -Infinity
    for (let i = 0; i < list.length; i++) {
      const ts = dateValue(list[i])
      if (ts > newestTs) { newestTs = ts; newestIdx = i }
    }
    if (newestIdx > 0) {
      const [item] = list.splice(newestIdx, 1)
      list = [item, ...list]
    }
    return list
  })()

  if (isMobile) {
    return (
      <CampaignsMobile
        campaigns={campaigns}
        loading={landingLoading}
        getCover={campaignCover}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filteredCampaigns={filteredCampaigns}
        onNewCampaign={() => { setPendingName(''); setNamingModal(true) }}
        onOpenCampaign={(c) => {
          const loadId = c.backendId ?? (typeof c.id === 'string' && c.id.startsWith('live-') ? c.id.slice(5) : c.id)
          setSearchParams({ view: 'map', load: String(loadId) })
          setShowBrowseMap(true)
        }}
        onEditCampaign={(c) => {
          const loadId = c.backendId ?? (typeof c.id === 'string' && c.id.startsWith('live-') ? c.id.slice(5) : c.id)
          setSearchParams({ view: 'map', load: String(loadId) })
          setShowBrowseMap(true)
        }}
        onBrowseMap={() => { setSearchParams({ view: 'map' }); setShowBrowseMap(true) }}
        onOpenCrm={() => navigate('/pipeline')}
      />
    )
  }

  return (
    <div className="p-8" style={{background: D.pageBg, minHeight: '100%'}}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold" style={{color: D.text}}>Campaigns</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowBrowseMap(true); setSearchParams({ view: 'map' }, { replace: true }) }}
            className="pl-btn-secondary"
            style={secBtn}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Browse Map
          </button>
          <button
            onClick={() => { setPendingName(''); setNamingModal(true) }}
            className="pl-btn-royal"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Campaign
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative" style={{width: 280}}>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? 'rgba(232,238,248,0.4)' : '#9CA3AF'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search campaigns…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', paddingLeft: 32, paddingRight: searchQuery ? 32 : 12, paddingTop: 8, paddingBottom: 8,
              fontSize: 14, border: `1px solid ${D.searchBorder}`, borderRadius: 8,
              background: D.searchBg, color: D.text, outline: 'none',
              fontFamily: "'PostGrotesk', sans-serif",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color: dark ? 'rgba(232,238,248,0.4)' : '#9CA3AF', background:'none', border:'none', cursor:'pointer', fontSize:12, lineHeight:1}}>
              ✕
            </button>
          )}
        </div>

        {/* Result count */}
        <span className="text-xs" style={{color: D.textMuted}}>
          {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
        </span>

        {/* Status filter chips */}
        <div className="flex items-center gap-1" style={{padding:2, borderRadius:8, border:`1px solid ${D.searchBorder}`, background: D.searchBg}}>
          {[
            { id: 'all',    label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'paused', label: 'Paused' },
            { id: 'draft',  label: 'Draft' },
          ].map(opt => {
            const on = statusFilter === opt.id
            return (
              <button key={opt.id} onClick={() => setStatusFilter(opt.id)}
                className="text-[11px] font-semibold transition-colors"
                style={{
                  padding:'4px 10px', borderRadius:6, border:'none', cursor:'pointer',
                  background: on ? '#001660' : 'transparent',
                  color:      on ? '#fff'    : (dark ? 'rgba(232,238,248,0.55)' : 'rgba(0,22,96,0.55)'),
                }}>
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-[11px] font-semibold appearance-none cursor-pointer"
            style={{
              padding:'6px 26px 6px 10px', borderRadius:8,
              border:`1px solid ${D.searchBorder}`, background: D.searchBg, color: D.text,
              outline:'none', fontFamily:"'PostGrotesk', sans-serif",
            }}>
            <option value="newest">Sort: Newest</option>
            <option value="qualified">Sort: Most qualified</option>
            <option value="targeted">Sort: Most targeted</option>
            <option value="name">Sort: A–Z</option>
          </select>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{color: D.textMuted}}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        <div className="ml-auto" />

        {/* View toggle */}
        <div className="flex items-center overflow-hidden shrink-0" style={{border:`1px solid ${D.searchBorder}`, borderRadius:6}}>
          <button
            onClick={() => setViewMode('grid')}
            className="px-2.5 py-1.5 transition-colors"
            style={{background: viewMode === 'grid' ? '#001660' : D.searchBg, color: viewMode === 'grid' ? '#fff' : (dark ? 'rgba(232,238,248,0.4)' : '#9CA3AF')}}
            title="Grid view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="px-2.5 py-1.5 transition-colors"
            style={{background: viewMode === 'list' ? '#001660' : D.searchBg, color: viewMode === 'list' ? '#fff' : (dark ? 'rgba(232,238,248,0.4)' : '#9CA3AF'), borderLeft:`1px solid ${D.searchBorder}`}}
            title="List view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Campaign tiles grid / list */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-3 2xl:grid-cols-4 gap-5' : 'flex flex-col gap-2'}>
        {landingLoading ? (
          Array.from({ length: viewMode === 'grid' ? 9 : 6 }).map((_, i) => {
            const shimmerBg = dark
              ? 'linear-gradient(110deg, #1a2949 8%, #283b6e 18%, #1a2949 33%)'
              : 'linear-gradient(110deg, #EEF2F7 8%, #F7FAFD 18%, #EEF2F7 33%)'
            const block = (style) => (
              <div style={{
                background: shimmerBg,
                backgroundSize: '200% 100%',
                animation: `ff-shimmer 1.6s linear infinite`,
                animationDelay: `${(i % 3) * 0.1}s`,
                borderRadius: 6,
                ...style,
              }} />
            )
            return (
              <div key={`sk-${i}`} className="flex flex-col" style={{
                borderRadius: 20,
                background: D.cardBg,
                border: `1px solid ${D.cardBorder}`,
                boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.30)' : '0 2px 12px rgba(0,22,96,0.06), 0 1px 3px rgba(0,22,96,0.04)',
                overflow: 'hidden',
              }}>
                {/* Thumbnail */}
                {block({ height: 160, borderRadius: 0 })}
                {/* Body */}
                <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {block({ height: 14, width: '62%' })}
                  {block({ height: 10, width: '42%' })}
                  <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {block({ height: 56, borderRadius: 10 })}
                    {block({ height: 56, borderRadius: 10 })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {block({ height: 38, borderRadius: 8 })}
                    {block({ height: 38, borderRadius: 8 })}
                    {block({ height: 38, borderRadius: 8 })}
                    {block({ height: 38, borderRadius: 8 })}
                  </div>
                </div>
              </div>
            )
          })
        ) : filteredCampaigns.length === 0 ? (
          <div className="col-span-3 py-16 flex flex-col items-center gap-2" style={{color: D.textMuted}}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="text-sm">No campaigns found</span>
            <button onClick={() => setSearchQuery('')}
              className="text-xs underline mt-1" style={{color: D.textMuted}}>Clear search</button>
          </div>
        ) : filteredCampaigns.map(c => c.status === 'processing' ? (
          <div key={c.id} className="bg-white rounded-lg border border-dashed border-gray-300 p-5 flex flex-col gap-4">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-900 leading-snug">{c.name}</div>
                <div className="text-xs text-gray-400 mt-1">Launched just now · {c.type}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                <span style={{ display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>⟳</span>
                <span>Processing</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px]  text-gray-400">
                <span>Prescreening homeowners…</span>
                <span>{processingProgress.toLocaleString()} / 2,400</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-800 rounded-full" style={{ width: `${(processingProgress / 2400) * 100}%`, transition: 'width 80ms linear' }} />
              </div>
            </div>
            <div className="text-xs text-gray-400 ">~{c.qualified?.toLocaleString()} estimated to qualify when complete</div>
          </div>
        ) : viewMode === 'list' ? (
          // ── LIST ROW ──
          <div
            key={c.id}
            className="rounded-lg flex items-center gap-4 px-5 py-4 transition-all hover:shadow-sm"
            style={{background: D.listRowBg, border:`1px solid ${D.listRowBorder}`}}
          >
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-md overflow-hidden shrink-0">
              <img src={campaignCover(c)} alt={c.cityLabel} className="w-full h-full object-cover"
                style={{filter: c.status === 'paused' ? 'grayscale(60%) brightness(0.85)' : 'brightness(0.9)'}} />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold leading-tight truncate" style={{color: D.text}}>{c.name}</span>
                {c.status === 'active'
                  ? <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:'rgba(16,185,129,0.12)', color:'#10B981'}}>Active</span>
                  : <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:'#FEF9C3', color:'#92400E'}}>Paused</span>
                }
              </div>
              <div className="text-[11px] mt-0.5" style={{color: D.textMuted}}>{c.cityLabel} · {c.period} · {c.type}</div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 shrink-0">
              {[
                { label: 'Targeted',  value: c.targeted.toLocaleString(), color: '#374151' },
                { label: 'Qualified', value: (c.qualified ?? 0).toLocaleString(), color: '#254BCE' },
                { label: 'Engaged',   value: c.engaged > 0 ? c.engaged : '—', color: c.engaged > 0 ? '#D97706' : '#D1D5DB' },
                { label: 'Hot',       value: c.hot > 0 ? c.hot : '—', color: c.hot > 0 ? '#F97316' : '#D1D5DB' },
                { label: 'Equity',    value: c.medianEquity, color: '#254BCE' },
                { label: 'FICO',      value: c.avgFico, color: '#10B981' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <span className="text-[13px] font-bold tabular-nums" style={{color}}>{value}</span>
                  <span className="text-[9px] font-medium uppercase tracking-wide" style={{color: D.textMuted}}>{label}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setViewingCampaign(c)}
                className="pl-btn-secondary" style={{height:30, fontSize:11, padding:'0 12px', ...secBtn}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Map
              </button>
              <button onClick={() => {
                const loadId = c.backendId ?? (typeof c.id === 'string' && c.id.startsWith('live-') ? c.id.slice(5) : c.id)
                setSearchParams({ view: 'map', load: String(loadId) })
                setShowBrowseMap(true)
              }}
                className="pl-btn-secondary" style={{height:30, fontSize:11, padding:'0 12px', ...secBtn}}>
                Edit
              </button>
              <button onClick={() => navigate('/pipeline')}
                className="pl-btn-secondary" style={{height:30, fontSize:11, padding:'0 12px', ...secBtn}}>
                CRM
              </button>
              <button onClick={() => handleDeleteLandingCampaign(c)}
                title="Delete this campaign"
                className="pl-btn-secondary"
                style={{height:30, width:30, padding:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#9CA3AF', ...secBtn}}
                onMouseOver={e => { e.currentTarget.style.color='#DC2626'; e.currentTarget.style.borderColor='rgba(220,38,38,0.4)' }}
                onMouseOut={e => { e.currentTarget.style.color='#9CA3AF'; e.currentTarget.style.borderColor=secBtn.borderColor || 'rgba(0,22,96,0.18)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          // ── GRID CARD ──
          <div
            key={c.id}
            className="campaign-tile overflow-hidden flex flex-col"
            style={{
              borderRadius: 20,
              background: D.cardBg,
              border: `1px solid ${D.cardBorder}`,
              boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,22,96,0.06), 0 1px 3px rgba(0,22,96,0.04)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            {/* City image */}
            <div className="campaign-tile-img relative overflow-hidden shrink-0" style={{height: 160, borderRadius:'19px 19px 0 0'}}>
              <img
                src={campaignCover(c)}
                alt={c.cityLabel}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: 'center 40%',
                  filter: c.status === 'paused' ? 'grayscale(60%) brightness(0.85)' : 'brightness(0.95)',
                  transition: 'transform 0.5s ease',
                }}
              />
              {/* Status badge */}
              <div className="absolute top-3 right-3">
                {c.status === 'active' ? (
                  <span className="flex items-center gap-1.5" style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 100,
                    padding: '4px 10px 4px 7px',
                    fontSize: 10, fontWeight: 700,
                    color: '#016163',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontFamily: "'PostGrotesk', sans-serif",
                  }}>
                    <span style={{width:6, height:6, borderRadius:'50%', background:'#016163', flexShrink:0, display:'inline-block'}} />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5" style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 100,
                    padding: '4px 10px 4px 7px',
                    fontSize: 10, fontWeight: 700,
                    color: '#92400E',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontFamily: "'PostGrotesk', sans-serif",
                  }}>
                    <span style={{width:6, height:6, borderRadius:'50%', background:'#F59E0B', flexShrink:0, display:'inline-block'}} />
                    Paused
                  </span>
                )}
              </div>
            </div>

            {/* Card body */}
            <div className="flex flex-col flex-1" style={{padding:'16px 18px 18px'}}>
              {/* Title + meta */}
              <div style={{fontFamily:"'PostGrotesk', sans-serif", fontSize:16, fontWeight:700, color: D.text, lineHeight:1.2, letterSpacing:'-0.01em', marginBottom:3}}>
                {c.name}
              </div>
              <div style={{fontFamily:"'PostGrotesk', sans-serif", fontSize:11, color: D.textMuted, fontWeight:400, marginBottom:14}}>
                {c.period} · {c.type} · Launched {c.launched}
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-2" style={{marginBottom:14}}>
                <div style={{background: dark ? 'transparent' : '#fff', border:'none', borderRadius:10, padding:'10px 0'}}>
                  <div style={{fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: D.labelColor, marginBottom:5, fontFamily:"'PostGrotesk', sans-serif"}}>Median Equity</div>
                  <div style={{fontFamily:"'PostGrotesk', sans-serif", fontSize:20, fontWeight:700, color:'#254BCE', lineHeight:1, letterSpacing:'-0.02em'}}>
                    {c.medianEquity}
                  </div>
                </div>
                <div style={{background: dark ? 'transparent' : '#fff', border:'none', borderRadius:10, padding:'10px 0'}}>
                  <div style={{fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: D.labelColor, marginBottom:5, fontFamily:"'PostGrotesk', sans-serif"}}>Avg FICO</div>
                  <div style={{fontFamily:"'PostGrotesk', sans-serif", fontSize:20, fontWeight:700, color:'#016163', lineHeight:1, letterSpacing:'-0.02em'}}>
                    {c.avgFico}
                  </div>
                </div>
              </div>

              {/* Funnel stats */}
              <div className="grid grid-cols-4 text-center" style={{marginBottom:10, padding:'8px 0', borderTop:`1px solid ${D.divider}`, borderBottom:`1px solid ${D.divider}`}}>
                {[
                  { label:'Targeted',  value: (c.targeted ?? 0).toLocaleString(),  color:'#001660' },
                  { label:'Qualified', value: (c.qualified ?? 0).toLocaleString(), color:'#254BCE' },
                  { label:'Engaged',   value: c.engaged > 0 ? c.engaged.toLocaleString() : '—', color: c.engaged > 0 ? '#016163' : 'rgba(0,22,96,0.2)' },
                  { label:'Hot',       value: c.hot > 0 ? c.hot.toLocaleString() : '—', color: c.hot > 0 ? '#DC2626' : 'rgba(0,22,96,0.2)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{padding:'4px 2px'}}>
                    <div style={{fontFamily:"'PostGrotesk', sans-serif", fontSize:15, fontWeight:700, color, lineHeight:1, letterSpacing:'-0.02em', marginBottom:3}}>
                      {value}
                    </div>
                    <div style={{fontFamily:"'PostGrotesk', sans-serif", fontSize:8.5, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color: D.labelColor}}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewingCampaign(c)}
                  className="pl-btn-secondary"
                  style={{flex:1, height:34, fontSize:12, gap:5, fontFamily:"'PostGrotesk', sans-serif", ...secBtn}}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  Map
                </button>
                <button
                  onClick={() => {
                const loadId = c.backendId ?? (typeof c.id === 'string' && c.id.startsWith('live-') ? c.id.slice(5) : c.id)
                setSearchParams({ view: 'map', load: String(loadId) })
                setShowBrowseMap(true)
              }}
                  className="pl-btn-secondary"
                  style={{flex:1, height:34, fontSize:12, gap:5, fontFamily:"'PostGrotesk', sans-serif", ...secBtn}}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button
                  onClick={() => navigate('/pipeline')}
                  className="pl-btn-secondary"
                  style={{flex:1, height:34, fontSize:12, gap:5, fontFamily:"'PostGrotesk', sans-serif", ...secBtn}}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                  CRM
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toast notification */}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white rounded-xl shadow-xl px-5 py-4 flex flex-col gap-2  text-[13px] max-w-sm"
          style={{ animation: 'slideUp 0.3s ease-out' }}>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">✅</span>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className="font-semibold leading-snug">{toast.name} is ready</span>
              <span className="text-gray-400 text-[12px]">847 homeowners qualified for an offer</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-500 hover:text-gray-300 text-[10px] shrink-0 mt-0.5">
              ✕
            </button>
          </div>
          <button className="ml-8 text-left text-[12px] text-gray-300 hover:text-white transition-colors">
            [ View Campaign ]
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes ff-flash {
          0%   { background-color: rgba(37,75,206,0.30); }
          60%  { background-color: rgba(37,75,206,0.15); }
          100% { background-color: rgba(37,75,206,0.06); }
        }
        @keyframes ff-shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>

      {/* ── Naming modal ─────────────────────────────────────────────────── */}
      {namingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)'}}>
          <div className="w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden"
            style={{background: dark ? '#172340' : '#fff', border: `1px solid ${dark ? 'rgba(99,140,255,0.2)' : 'rgba(0,22,96,0.08)'}`}}>
            <div className="px-7 pt-7 pb-2">
              <h2 className="text-[17px] font-semibold" style={{color: dark ? '#E8EEF8' : '#111827'}}>New Campaign</h2>
              <p className="text-[13px] mt-1" style={{color: dark ? 'rgba(232,238,248,0.45)' : '#9CA3AF'}}>Give your campaign a name to get started.</p>
            </div>
            <div className="px-7 py-5">
              <input
                type="text"
                value={pendingName}
                onChange={e => setPendingName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && pendingName.trim()) { setNamingModal(false); setShowBrowseMap(true) } if (e.key === 'Escape') setNamingModal(false) }}
                className="w-full outline-none rounded-lg px-4 py-3 text-[14px] font-medium transition-colors"
                style={{background: dark ? 'rgba(232,238,248,0.05)' : '#F8F9FB', border:`1px solid ${dark ? 'rgba(99,140,255,0.2)' : '#E5E7EB'}`, color: dark ? '#E8EEF8' : '#111827'}}
                placeholder="e.g. Miami Westside — March 2026"
                autoFocus
              />
            </div>
            <div className="px-7 pb-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setNamingModal(false)}
                className="px-5 py-2.5 text-[13px] font-medium rounded-lg transition-colors"
                style={{color: dark ? 'rgba(232,238,248,0.5)' : '#6B7280'}}
                onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F3F4F6'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                Cancel
              </button>
              <button
                disabled={!pendingName.trim()}
                onClick={() => { setNamingModal(false); setShowBrowseMap(true) }}
                className="pl-btn-primary">
                Create Campaign →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
