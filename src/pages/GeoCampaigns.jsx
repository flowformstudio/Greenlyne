import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QUOTA } from '../lib/quota'
import { useTheme } from '../lib/theme'

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
  },
]

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
    onCoreChange?.({ equity, fico, monthsOwned, income, poolFilter })
  }, [equity, fico, monthsOwned, income, poolFilter]) // eslint-disable-line

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
          ✕ Cancel
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
      <div className="absolute top-4 left-4 z-20 w-60 flex flex-col rounded-2xl overflow-hidden"
        style={{background:'#fff', border:'1px solid rgba(0,0,0,0.09)', boxShadow:'0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)', maxHeight:'calc(100% - 2rem)'}}
        onClick={e => e.stopPropagation()}>
        <FiltersPanel floatMode />
      </div>

      {/* Right floating panel — multi-select + prescreen */}
      <div className="absolute top-4 right-4 bottom-4 z-20 w-80 flex flex-col rounded-2xl overflow-hidden"
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

function NewCampaignFlow({ onCancel, onLaunch, initialData, initialName = '' }) {
  const { dark } = useTheme()
  const isEdit = !!initialData
  const [step, setStep]               = useState(2)
  const [campaignName, setCampaignName] = useState(initialData?.name ?? initialName ?? 'Miami Westside — March 2026')
  const [campaignType, setCampaignType] = useState('mail')

  // Step 2 state
  const [drawMode, setDrawMode]       = useState(null)
  const [shapeDrawn, setShapeDrawn]   = useState(isEdit)
  const [projectCost, setProjectCost] = useState('')
  const [addressQuery, setAddressQuery] = useState('')
  const [addressFocused, setAddresseFocused] = useState(false)

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

  // Core filter values — managed by FiltersPanel, surfaced here for estimates
  const [filterVals, setFilterVals] = useState({ equity: 50, fico: 660, monthsOwned: 24, income: 50, poolFilter: 'any' })

  // Household selection + prescreen state
  const [selectedHouseholds, setSelectedHouseholds] = useState(new Set())
  const [householdPhase, setHouseholdPhase] = useState('idle') // 'idle'|'loading'|'list'|'prescreening'|'done'
  const [prescreenProgress, setPrescreenProgress] = useState(0)
  const [prescreenResults, setPrescreenResults] = useState({}) // id -> { qualified, loanAmt, apr, monthly }
  const [outreachDone, setOutreachDone] = useState({}) // id -> { crm, mail, postcard }

  // Live estimates (reactive to filters)
  const { equity, fico, monthsOwned, poolFilter, income } = filterVals
  const equityFactor = equity <= 50  ? 1 : Math.max(0.15, 1 - (equity - 50)  / 950)
  const ficoFactor   = fico   <= 660 ? 1 : Math.max(0.25, 1 - (fico   - 660) / 190)
  const poolFactor   = poolFilter === 'with' ? 0.15 : 1
  const ownerFactor  = monthsOwned >= 24 ? 1 : Math.max(0.5, monthsOwned / 48)
  const estQualify = shapeDrawn
    ? Math.max(40, Math.round(2400 * 0.283 * equityFactor * ficoFactor * poolFactor * ownerFactor))
    : null

  // Households filtered by left-panel values
  const filteredHouses = BROWSE_HOUSES.filter(h =>
    h.equity >= equity * 1000 &&
    h.fico >= fico &&
    h.yearsOwned >= monthsOwned / 12
  )

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
    BROWSE_HOUSES.filter(h => selectedHouseholds.has(h.id)).forEach(h => {
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
  const prescreenedHomes = BROWSE_HOUSES.filter(h => selectedHouseholds.has(h.id))
  const estimatedCost    = (selectedHouseholds.size * 0.18).toFixed(2)

  const stepSubtitle =
    householdPhase === 'idle'         ? 'Draw an area on the map to find homeowners'
    : householdPhase === 'loading'    ? 'Retrieving households…'
    : householdPhase === 'list'       ? `${selectedHouseholds.size} of ${filteredHouses.length} households selected`
    : householdPhase === 'prescreening' ? 'Running prescreen…'
    : `Prescreen complete — ${qualifiedCount} of ${prescreenedHomes.length} qualified`

  return (
    <div className="flex flex-col overflow-hidden" style={{height:'calc(100vh - 3.5rem)', background: dark ? '#0F172A' : '#F8F9FB'}}>

      {/* Top bar */}
      <div className="px-8 py-4 flex items-center justify-between shrink-0"
        style={{background: dark ? '#172340' : '#fff', borderBottom: `1px solid ${dark ? 'rgba(99,140,255,0.12)' : '#F3F4F6'}`}}>
        <div>
          <h1 className="text-lg font-semibold" style={{color: dark ? '#E8EEF8' : '#111827'}}>{campaignName || (initialData ? 'Edit Campaign' : 'New Campaign')}</h1>
          <p className="text-sm mt-0.5" style={{color: dark ? 'rgba(232,238,248,0.4)' : '#9CA3AF'}}>{stepSubtitle}</p>
        </div>
        <button onClick={onCancel} className="text-sm transition-colors" style={{color: dark ? 'rgba(232,238,248,0.4)' : '#9CA3AF'}}>
          ✕ Cancel
        </button>
      </div>


      {/* Content — step 2: full-bleed map with floating panels */}
      {step === 2 ? (
        <div className="flex-1 relative overflow-hidden">

          {/* Map area — fills entire content area */}
          <div
            className={`absolute inset-0 overflow-hidden ${drawMode ? 'cursor-crosshair' : 'cursor-default'}`}
              onClick={() => {
                if (step === 2 && drawMode) {
                  setDrawMode(null)
                  setEstimatesLoading(true)
                  setHouseholdPhase('loading')
                  setSelectedHouseholds(new Set())
                  setTimeout(() => {
                    setShapeDrawn(true)
                    setEstimatesLoading(false)
                    setHouseholdPhase('list')
                  }, 1600)
                }
              }}
            >
              {/* Right-side vertical tools — zoom + draw */}
              {step === 2 && (
                <div className="absolute top-4 right-[340px] z-10 flex flex-col gap-2"
                  onClick={e => e.stopPropagation()}>
                  {/* Zoom controls */}
                  <div className="flex flex-col rounded-lg shadow-md overflow-hidden"
                    style={{background: dark ? '#172340' : '#fff', border:`1px solid ${dark ? 'rgba(99,140,255,0.2)' : '#E5E7EB'}`}}>
                    <button className="w-8 h-8 flex items-center justify-center transition-colors text-lg font-light"
                      style={{color: dark ? 'rgba(232,238,248,0.6)' : '#4B5563', borderBottom:`1px solid ${dark ? 'rgba(99,140,255,0.12)' : '#F3F4F6'}`}}
                      onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F3F4F6'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>+</button>
                    <button className="w-8 h-8 flex items-center justify-center transition-colors text-lg font-light"
                      style={{color: dark ? 'rgba(232,238,248,0.6)' : '#4B5563'}}
                      onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.06)' : '#F3F4F6'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>−</button>
                  </div>
                  {/* Draw tools */}
                  <div className="flex flex-col rounded-lg shadow-md overflow-hidden"
                    style={{background: dark ? '#172340' : '#fff', border:`1px solid ${dark ? 'rgba(99,140,255,0.2)' : '#E5E7EB'}`}}>
                    {[
                      { key: 'polygon', icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 22 19 2 19"/>
                        </svg>
                      ), label: 'Draw polygon area' },
                      { key: 'circle', icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      ), label: 'Circle / radius' },
                      { key: 'census', icon: (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                        </svg>
                      ), label: 'Census tract' },
                    ].map(({ key, icon, label }, idx, arr) => (
                      <button key={key}
                        title={label}
                        onClick={() => setDrawMode(drawMode === key ? null : key)}
                        style={{
                          width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.1s',
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
                  {/* Clear selection — only visible when a shape is drawn */}
                  {shapeDrawn && (
                    <button
                      title="Clear selected area"
                      onClick={() => {
                        setShapeDrawn(false)
                        setDrawMode(null)
                        setHouseholdPhase('idle')
                        setSelectedHouseholds(new Set())
                        setPrescreenResults({})
                        setOutreachDone({})
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg shadow-md transition-colors"
                      style={{background: dark ? '#172340' : '#fff', border:`1px solid ${dark ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.2)'}`, color:'#DC2626'}}
                      onMouseOver={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.5)' }}
                      onMouseOut={e => { e.currentTarget.style.background = dark ? '#172340' : '#fff'; e.currentTarget.style.borderColor = dark ? 'rgba(220,38,38,0.3)' : 'rgba(220,38,38,0.2)' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Map SVG */}
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
                <line x1="0" y1="600" x2="450" y2="0" stroke="#ccc4b4" strokeWidth="1.5" opacity="0.6"/>
                <polygon points="70,110 270,90 310,250 220,310 55,270" fill="#6366f1" opacity="0.10"/>
                <polygon points="70,110 270,90 310,250 220,310 55,270" fill="none" stroke="#6366f1" strokeWidth="1.5" opacity="0.3" strokeDasharray="5,4"/>
                <text x="165" y="200" textAnchor="middle" fontFamily="PostGrotesk, sans-serif" fontSize="10" fill="#6366f1" opacity="0.45" fontWeight="500">Miami Westside</text>
                <polygon points="370,300 530,285 555,430 360,455" fill="#f59e0b" opacity="0.08"/>
                <polygon points="370,300 530,285 555,430 360,455" fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.25" strokeDasharray="5,4"/>
                <text x="460" y="375" textAnchor="middle" fontFamily="PostGrotesk, sans-serif" fontSize="10" fill="#b45309" opacity="0.4" fontWeight="500">Brickell</text>
                {shapeDrawn && <>
                  <polygon points="155,125 430,105 475,270 390,355 135,335 95,220" fill="#16a34a" opacity="0.15"/>
                  <polygon points="155,125 430,105 475,270 390,355 135,335 95,220" fill="none" stroke="#16a34a" strokeWidth="1.5" opacity="0.75"/>
                  {[[155,125],[430,105],[475,270],[390,355],[135,335],[95,220]].map(([x,y],i) => (
                    <circle key={i} cx={x} cy={y} r="5" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
                  ))}
                </>}
                {/* Live callout */}
                {shapeDrawn && <>
                  <rect x="185" y="185" width="265" height="54" rx="10" fill="white"
                    style={{filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.16))'}}/>
                  <text x="317" y="207" textAnchor="middle" fontFamily="PostGrotesk, sans-serif" fontSize="12" fill="#111827" fontWeight="600">
                    ~2,400 homeowners in area
                  </text>
                  <text x="317" y="226" textAnchor="middle" fontFamily="PostGrotesk, sans-serif" fontSize="12" fill="#15803d" fontWeight="600">
                    ~{estQualify?.toLocaleString()} estimated to qualify
                  </text>
                </>}
              </svg>

              {/* Draw hints — step 2 only */}
              {step === 2 && drawMode && !shapeDrawn && (
                <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
                  <div className="bg-gray-900/80 text-white text-sm  px-5 py-2.5 rounded-xl backdrop-blur-sm">
                    {drawMode === 'polygon' && 'Click to place points — click first point to close shape'}
                    {drawMode === 'circle'  && 'Click on the map to set the center of your radius'}
                    {drawMode === 'census'  && 'Click census tracts to select entire neighborhoods'}
                  </div>
                </div>
              )}
              {step === 2 && !drawMode && !shapeDrawn && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-gray-400 bg-white/80 px-3 py-1.5 rounded-lg border border-gray-200 whitespace-nowrap">
                  Use a drawing tool to select an area
                </div>
              )}
          </div>

          {/* Center top — address search bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-80"
            onClick={e => e.stopPropagation()}>
            <div className="relative">
              <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 h-11"
                style={{background: dark ? '#172340' : '#fff', border:`1px solid ${dark ? 'rgba(99,140,255,0.2)' : 'rgba(0,0,0,0.08)'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.1)'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dark ? 'rgba(232,238,248,0.35)' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={addressQuery}
                  onChange={e => setAddressQuery(e.target.value)}
                  onFocus={() => setAddresseFocused(true)}
                  onBlur={() => setTimeout(() => setAddresseFocused(false), 150)}
                  placeholder="Search address or ZIP code…"
                  className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{color: dark ? '#E8EEF8' : '#1F2937'}}
                />
                {addressQuery && (
                  <button onClick={() => setAddressQuery('')} className="text-[11px]" style={{color: dark ? 'rgba(232,238,248,0.3)' : '#D1D5DB'}}>✕</button>
                )}
              </div>
              {addressFocused && addressSuggestions.length > 0 && (
                <div className="absolute top-full mt-1.5 left-0 right-0 rounded-2xl overflow-hidden z-30"
                  style={{background: dark ? '#172340' : '#fff', border:`1px solid ${dark ? 'rgba(99,140,255,0.2)' : 'rgba(0,0,0,0.08)'}`, boxShadow:'0 8px 24px rgba(0,0,0,0.15)'}}>
                  {addressSuggestions.map((s, i) => (
                    <button key={i}
                      onMouseDown={() => {
                        setAddressQuery(s.label)
                        setAddresseFocused(false)
                        setEstimatesLoading(true)
                        setHouseholdPhase('loading')
                        setSelectedHouseholds(new Set())
                        setTimeout(() => {
                          setShapeDrawn(true)
                          setEstimatesLoading(false)
                          setHouseholdPhase('list')
                        }, 1600)
                      }}
                      className="w-full px-4 py-2.5 text-left text-[12px] flex items-center gap-2.5"
                      style={{color: dark ? 'rgba(232,238,248,0.7)' : '#374151', borderBottom:`1px solid ${dark ? 'rgba(99,140,255,0.08)' : '#F3F4F6'}`}}
                      onMouseOver={e => e.currentTarget.style.background = dark ? 'rgba(232,238,248,0.05)' : '#F9FAFB'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{color: dark ? 'rgba(232,238,248,0.25)' : '#9CA3AF'}} className="text-[11px]">📍</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Left floating panel — filters */}
          <div className="absolute top-4 left-4 z-20 w-64 flex flex-col rounded-2xl overflow-hidden"
            style={{background: dark ? '#172340' : '#fff', border: `1px solid ${dark ? 'rgba(99,140,255,0.2)' : 'rgba(0,0,0,0.09)'}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)', maxHeight:'calc(100% - 2rem)'}}
            onClick={e => e.stopPropagation()}>
            <FiltersPanel onCoreChange={setFilterVals} floatMode />
          </div>

          {/* Right floating panel — household selection + prescreen */}
          <div className="absolute top-4 right-4 bottom-4 z-20 w-80 flex flex-col rounded-2xl overflow-hidden"
            style={{background: dark ? '#172340' : '#fff', border: `1px solid ${dark ? 'rgba(99,140,255,0.2)' : 'rgba(0,0,0,0.08)'}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)'}}>

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
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Households</h3>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="border border-dashed border-gray-200 rounded-xl px-5 py-8 text-center mx-5">
                    <div className="text-2xl mb-2">🗺</div>
                    <p className="text-[12px] font-medium text-gray-500 mb-1">Draw an area to get started</p>
                    <p className="text-[11px] text-gray-300 leading-relaxed">Use the polygon, radius, or census tract tool on the map. We'll retrieve all households in your selected area.</p>
                  </div>
                </div>
                <div className="px-4 py-4 border-t border-gray-100 shrink-0">
                  <button disabled className="w-full px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-xl opacity-25 cursor-not-allowed">
                    Run Prescreen
                  </button>
                </div>
              </>
            )}

            {/* ── LOADING: retrieving households ── */}
            {!showingExistingLeads && householdPhase === 'loading' && (
              <>
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0 flex items-center gap-2">
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
            {!showingExistingLeads && householdPhase === 'list' && (
              <>
                {/* Header */}
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Households</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedHouseholds(new Set(filteredHouses.map(h => h.id)))}
                        className="text-[10px] px-2 py-0.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-colors">
                        All
                      </button>
                      <button
                        onClick={() => setSelectedHouseholds(new Set())}
                        className="text-[10px] px-2 py-0.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-colors">
                        None
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    <span className="font-semibold text-gray-900">{selectedHouseholds.size}</span> selected ·{' '}
                    <span className="text-emerald-700 font-semibold">{filteredHouses.length}</span> shown of ~{estQualify?.toLocaleString() ?? '—'} qualifying
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Adjust filters on the left to narrow results</p>
                </div>

                {/* Household rows */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                  {filteredHouses.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[11px] text-gray-300">No households match current filters</div>
                  ) : filteredHouses.map(h => {
                    const sel = selectedHouseholds.has(h.id)
                    return (
                      <div
                        key={h.id}
                        onClick={() => toggleHousehold(h.id)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${sel ? 'bg-emerald-50/60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggleHousehold(h.id)}
                          onClick={e => e.stopPropagation()}
                          className="mt-0.5 w-3.5 h-3.5 rounded accent-gray-900 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-gray-800 leading-snug truncate">{h.address}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 truncate">{h.owner}</div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] ">
                            <span className="text-emerald-700 font-semibold">${(h.equity/1000).toFixed(0)}k eq</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-gray-500">FICO {h.fico}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-gray-500">{h.yearsOwned}yr</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* CTA */}
                <div className="px-4 py-4 border-t border-gray-100 flex flex-col gap-2.5 shrink-0">
                  {/* Quota widget */}
                  {selectedHouseholds.size > 0 ? (() => {
                    const n        = selectedHouseholds.size
                    const after    = QUOTA.user.monthlyRemaining - n
                    const overOrg  = n > QUOTA.org.monthlyRemaining
                    const overUser = after < 0
                    const warn     = overOrg || overUser
                    return (
                      <div className={`rounded-lg border px-3 py-2.5 flex flex-col gap-2 ${warn ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <svg className={`w-3 h-3 ${warn ? 'text-amber-500' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                            </svg>
                            <span className={`text-[11px] font-medium ${warn ? 'text-amber-700' : 'text-gray-600'}`}>
                              {warn ? 'Insufficient credits' : `${n} credit${n !== 1 ? 's' : ''} required`}
                            </span>
                          </div>
                          <span className={`text-[11px] font-semibold  ${warn ? 'text-amber-700' : 'text-gray-700'}`}>
                            {warn ? '—' : `${after} remaining`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <div className="flex-1 flex flex-col gap-0.5">
                            <div className="flex justify-between text-gray-400">
                              <span>Your balance</span><span>{QUOTA.user.monthlyRemaining} / {QUOTA.user.monthlyTotal}</span>
                            </div>
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${overUser ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{width:`${Math.round((QUOTA.user.monthlyRemaining/QUOTA.user.monthlyTotal)*100)}%`}} />
                            </div>
                          </div>
                          <div className="w-px h-5 bg-gray-200" />
                          <div className="flex-1 flex flex-col gap-0.5">
                            <div className="flex justify-between text-gray-400">
                              <span>Org balance</span><span>{QUOTA.org.monthlyRemaining} / {QUOTA.org.monthlyTotal}</span>
                            </div>
                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${overOrg ? 'bg-amber-400' : 'bg-gray-600'}`}
                                style={{width:`${Math.round((QUOTA.org.monthlyRemaining/QUOTA.org.monthlyTotal)*100)}%`}} />
                            </div>
                          </div>
                        </div>
                        {warn && (
                          <p className="text-[10px] text-amber-600">
                            {overUser ? `You need ${n - QUOTA.user.monthlyRemaining} more credits. Contact your admin.` : `Org quota insufficient. Contact your admin.`}
                          </p>
                        )}
                      </div>
                    )
                  })() : (
                    <div className="flex items-center gap-2 px-1">
                      <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      <span className="text-[10px] text-gray-400">
                        You have <span className="font-semibold text-gray-600">{QUOTA.user.monthlyRemaining}</span> credits available · 1 credit per prescreen
                      </span>
                    </div>
                  )}
                  <button
                    disabled={selectedHouseholds.size === 0 || selectedHouseholds.size > QUOTA.user.monthlyRemaining || selectedHouseholds.size > QUOTA.org.monthlyRemaining}
                    onClick={runPrescreens}
                    className="w-full px-4 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {selectedHouseholds.size === 0
                      ? 'Select households to prescreen'
                      : `Run Prescreen on ${selectedHouseholds.size} household${selectedHouseholds.size !== 1 ? 's' : ''} →`}
                  </button>
                </div>
              </>
            )}

            {/* ── PRESCREENING: running ── */}
            {!showingExistingLeads && householdPhase === 'prescreening' && (
              <>
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0">
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
            {!showingExistingLeads && householdPhase === 'done' && (() => {
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
                    return (
                      <div key={h.id} style={{
                        margin:'8px 10px',
                        borderRadius:12,
                        background: qual ? '#fff' : 'rgba(0,0,0,0.02)',
                        border: qual ? '1px solid rgba(5,150,105,0.15)' : '1px solid #F3F4F6',
                        overflow:'hidden',
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
                                onClick={() => setOutreachDone(prev => ({...prev, [h.id]: {...(prev[h.id]||{}), crm: true}}))}
                                style={{fontSize:10, padding:'3px 10px', background:'#001660', color:'#fff', border:'none', borderRadius:100, cursor:'pointer', fontWeight:600}}>
                                + CRM
                              </button>
                            )}
                            {done.mail ? (
                              <span style={{fontSize:10, color:'#059669', background:'rgba(5,150,105,0.08)', padding:'3px 8px', borderRadius:100, fontWeight:600}}>✓ Mail</span>
                            ) : (
                              <button
                                onClick={() => setOutreachDone(prev => ({...prev, [h.id]: {...(prev[h.id]||{}), mail: true}}))}
                                style={{fontSize:10, padding:'3px 10px', background:'transparent', color:'#6B7280', border:'1px solid #E5E7EB', borderRadius:100, cursor:'pointer'}}>
                                Mail
                              </button>
                            )}
                            {done.postcard ? (
                              <span style={{fontSize:10, color:'#059669', background:'rgba(5,150,105,0.08)', padding:'3px 8px', borderRadius:100, fontWeight:600}}>✓ Postcard</span>
                            ) : (
                              <button
                                onClick={() => setOutreachDone(prev => ({...prev, [h.id]: {...(prev[h.id]||{}), postcard: true}}))}
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
                    onClick={() => setStep(3)}
                    style={{width:'100%', padding:'10px', fontSize:13, fontWeight:700, background:'#001660', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', letterSpacing:'-0.01em'}}>
                    Launch Campaign →
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

        </div>
      ) : (
        <div className="flex-1 flex items-start justify-center px-8 pt-8 pb-6 overflow-auto">
          <div className="w-full max-w-xl flex flex-col gap-6">

            {step === 3 && (
              <div className="flex flex-col items-center gap-6 text-center w-full">
                {/* Icon + title */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl">
                    🚀
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 leading-snug">{campaignName}</h2>
                    <p className="text-gray-400 text-sm mt-0.5">is launching now</p>
                  </div>
                </div>

                {/* Status card */}
                <div className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm  text-[13px]">
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
                    {singleCostMode === 'fixed' && singleFixedCost && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Project cost</span>
                        <span className="text-gray-900">${Number(singleFixedCost).toLocaleString()}</span>
                      </div>
                    )}
                    {singleCostMode === 'per_area' && singleCostPerArea && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cost per m²</span>
                        <span className="text-gray-900">${singleCostPerArea}/m²</span>
                      </div>
                    )}
                  </div>
                  <div className="px-6 py-5 flex flex-col gap-2 text-gray-400 text-[13px] text-center">
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

    </div>
  )
}

export default function GeoCampaigns() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { dark } = useTheme()
  const [showNew, setShowNew] = useState(false)
  const [namingModal, setNamingModal] = useState(false)
  const [pendingName, setPendingName] = useState('')
  const [showBrowseMap, setShowBrowseMap] = useState(() => searchParams.get('view') === 'map')
  const [editingCampaign, setEditingCampaign] = useState(null) // campaign to edit
  const [viewingCampaign, setViewingCampaign] = useState(null) // campaign to view on map
  const [selectedCampaignLead, setSelectedCampaignLead] = useState(null)
  const [campaigns, setCampaigns] = useState(CAMPAIGNS_BASE)
  const [processingInfo, setProcessingInfo] = useState(null) // { id, name, qualify }
  const [processingProgress, setProcessingProgress] = useState(0)
  const [toast, setToast] = useState(null) // { name, qualify }
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')        // 'grid' | 'list'

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

  function handleLaunch(name, qualify) {
    setShowNew(false)
    setEditingCampaign(null)
    const newId = Date.now()
    setCampaigns(prev => [{
      id: newId, name, status: 'processing', launched: 'just now',
      type: 'Mail campaign', targeted: 2400, qualified: qualify,
      contacted: 0, engaged: 0, hot: 0, medianEquity: '$142k', avgFico: 714,
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
    return <BrowseMapView onClose={() => setShowBrowseMap(false)} />
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
            onClick={() => { setViewingCampaign(null); setEditingCampaign(c) }}
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
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0 flex items-center justify-between">
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

  const filteredCampaigns = campaigns.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-8" style={{background: D.pageBg, minHeight: '100%'}}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold" style={{color: D.text}}>Campaigns</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBrowseMap(true)}
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
        {filteredCampaigns.length === 0 ? (
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
              <img src={c.cityImg} alt={c.cityLabel} className="w-full h-full object-cover"
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
                { label: 'Qualified', value: c.qualified.toLocaleString(), color: '#254BCE' },
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
              <button onClick={() => setEditingCampaign(c)}
                className="pl-btn-secondary" style={{height:30, fontSize:11, padding:'0 12px', ...secBtn}}>
                Edit
              </button>
              <button onClick={() => navigate('/pipeline')}
                className="pl-btn-secondary" style={{height:30, fontSize:11, padding:'0 12px', ...secBtn}}>
                CRM
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
                src={c.cityImg}
                alt={c.cityLabel}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: 'center 40%',
                  filter: c.status === 'paused' ? 'grayscale(60%) brightness(0.85)' : 'brightness(0.95)',
                  transition: 'transform 0.5s ease',
                }}
              />
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,22,96,0.55) 100%)',
              }} />
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
              {/* Location */}
              <div className="absolute bottom-3 left-4 flex items-center gap-1.5" style={{color:'rgba(255,255,255,0.95)', fontSize:12, fontWeight:600, fontFamily:"'PostGrotesk', sans-serif"}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.8}}>
                  <path d="M12 22s-8-7.3-8-12a8 8 0 1 1 16 0c0 4.7-8 12-8 12z"/>
                  <circle cx="12" cy="10" r="2.5" fill="currentColor" stroke="none"/>
                </svg>
                {c.cityLabel}
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
                <div style={{background: D.metricBg1, border:`1px solid ${dark ? 'rgba(37,75,206,0.25)' : 'rgba(37,75,206,0.1)'}`, borderRadius:10, padding:'10px 12px'}}>
                  <div style={{fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: D.labelColor, marginBottom:5, fontFamily:"'PostGrotesk', sans-serif"}}>Median Equity</div>
                  <div style={{fontFamily:"'PostGrotesk', sans-serif", fontSize:20, fontWeight:700, color:'#254BCE', lineHeight:1, letterSpacing:'-0.02em'}}>
                    {c.medianEquity}
                  </div>
                </div>
                <div style={{background: D.metricBg2, border:`1px solid ${dark ? 'rgba(1,97,99,0.3)' : 'rgba(1,97,99,0.12)'}`, borderRadius:10, padding:'10px 12px'}}>
                  <div style={{fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color: D.labelColor, marginBottom:5, fontFamily:"'PostGrotesk', sans-serif"}}>Avg FICO</div>
                  <div style={{fontFamily:"'PostGrotesk', sans-serif", fontSize:20, fontWeight:700, color:'#016163', lineHeight:1, letterSpacing:'-0.02em'}}>
                    {c.avgFico}
                  </div>
                </div>
              </div>

              {/* Funnel stats */}
              <div className="grid grid-cols-4 text-center" style={{marginBottom:10, padding:'8px 0', borderTop:`1px solid ${D.divider}`, borderBottom:`1px solid ${D.divider}`}}>
                {[
                  { label:'Targeted',  value: c.targeted.toLocaleString(),  color:'#001660' },
                  { label:'Qualified', value: c.qualified.toLocaleString(), color:'#254BCE' },
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
                  onClick={() => setEditingCampaign(c)}
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
                onKeyDown={e => { if (e.key === 'Enter' && pendingName.trim()) { setNamingModal(false); setShowNew(true) } if (e.key === 'Escape') setNamingModal(false) }}
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
                onClick={() => { setNamingModal(false); setShowNew(true) }}
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
