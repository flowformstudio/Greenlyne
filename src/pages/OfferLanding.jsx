import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import WesthavenHeader from '../components/WesthavenHeader'

const C = {
  navy:      '#001660',
  blue:      '#254BCE',
  teal:      '#016163',
  green:     '#93DDBA',
  greenDark: '#1a7a50',
  bg:        '#F5F1EE',
  white:     '#ffffff',
  border:    '#D1D1D1',
  muted:     '#6B7280',
  text:      '#111827',
}

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire',
  'New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia',
  'Wisconsin','Wyoming',
]

const INCOME_SOURCES = [
  'Employed full-time','Employed part-time','Self-employed','Retired','Other',
]

// Step 1 = RefineStep
// Step 2 = PropertyStep
// Step 3 = PersonalStep
// Step 4 = IncomeStep
// Step 5 = ProjectStep
// Step 6 = ProcessingScreen

const STEP_TITLES = [
  null,                             // step 1 — own header
  'Property Information',
  'Personal Information',
  'What is your annual income?',
  'Project Cost',
]

function calcSavings(bill) {
  const solar = Math.round(bill * 0.75)
  return { bill, solar, saves: bill - solar }
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px', fontSize: 15,
  border: `1.5px solid ${C.border}`, borderRadius: 8,
  background: C.white, color: C.text,
  outline: 'none',
}

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 36,
  cursor: 'pointer',
}

function FieldLabel({ children, required }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
      {children}{required && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
    </div>
  )
}

function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 800, color: C.blue,
      textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: 16, marginTop: 8,
    }}>
      {children}
    </div>
  )
}

export default function OfferLanding() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state || {}

  const [step, setStep] = useState(state.showHub ? 7 : 1)
  const TOTAL_STEPS = 5

  // Step 1 — Refine estimate
  const [billAmount, setBillAmount]     = useState(220)
  const [singleFamily, setSingleFamily] = useState(true)
  const [goodRoof, setGoodRoof]         = useState(false)

  // Step 2 — Property
  const [address, setAddress]           = useState(state.address || '1482 Sunridge Drive')
  const [apt, setApt]                   = useState('')
  const [city, setCity]                 = useState(state.city || 'Sacramento')
  const [propState, setPropState]       = useState(state.state || 'California')
  const [zip, setZip]                   = useState('95814')
  const [occupancy, setOccupancy]       = useState('primary')
  const [forSale, setForSale]           = useState(false)

  // Step 3 — Personal
  const [firstName, setFirstName]       = useState('Alex')
  const [middleInitial, setMiddleInitial] = useState('')
  const [lastName, setLastName]         = useState('Rivera')
  const [dob, setDob]                   = useState('03/14/1982')

  // Step 4 — Income
  const [annualIncome, setAnnualIncome] = useState('$200,000')
  const [otherIncome, setOtherIncome]   = useState('')
  const [incomeSource, setIncomeSource] = useState('Employed full-time')

  // Step 5 — Project
  const [projectCost, setProjectCost]   = useState('$50,000')

  function handleNext() {
    if (step < TOTAL_STEPS) { setStep(s => s + 1); window.scrollTo(0, 0) }
    else { setStep(7); window.scrollTo(0, 0) }
  }

  function handleBack() {
    if (step > 1) { setStep(s => s - 1); window.scrollTo(0, 0) }
    else navigate('/email')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      <WesthavenHeader lender="grand-bank" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: step === 1 ? 'stretch' : 'center', padding: step === 1 ? '0 0 48px' : '0 16px 48px' }}>
        <div style={{ width: '100%', maxWidth: step === 1 ? '100%' : 560, marginTop: step === 1 ? 0 : 32 }}>

          {/* Processing screen */}
          {step === 7 && (
            <ProcessingScreen
              onDone={() => navigate('/pre-qualified', { state })}
              onEdgeCase={(s) => navigate('/qualification', { state: { ...state, scenario: s } })}
              initialShowHub={!!state.showHub}
            />
          )}

          {step <= TOTAL_STEPS && <>

            {/* Progress bar (hidden on step 1) */}
            {step > 1 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Step {step - 1} of {TOTAL_STEPS - 1}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)}% complete</span>
                </div>
                <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`,
                    background: C.blue, transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Step 1: Refine estimate */}
            {step === 1 && (
              <RefineStep
                billAmount={billAmount} setBillAmount={setBillAmount}
                singleFamily={singleFamily} setSingleFamily={setSingleFamily}
                goodRoof={goodRoof} setGoodRoof={setGoodRoof}
                address={address} setAddress={setAddress}
              />
            )}

            {/* Steps 2–5: info collection */}
            {step > 1 && (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, margin: '0 0 4px', letterSpacing: '0em' }}>
                  Hi Alex, let&apos;s check your eligibility
                </h1>
                <p style={{ fontSize: 14, color: C.muted, margin: '0 0 28px' }}>
                  {step === 2 && "Tell us about the property you\u2019d like to use for your HELOC."}
                  {step === 3 && 'For verification purposes, please provide your legal name as it appears on your government-issued ID.'}
                  {step === 4 && 'This helps us determine your loan eligibility.'}
                  {step === 5 && 'Help us size your HELOC to match your project.'}
                </p>
                <div style={{ background: C.white, borderRadius: 16, border: `1.5px solid ${C.border}`, padding: '24px 24px 28px' }}>
                  <SectionHeader>{STEP_TITLES[step - 1]}</SectionHeader>
                  {step === 2 && (
                    <PropertyStep
                      address={address} setAddress={setAddress}
                      apt={apt} setApt={setApt}
                      city={city} setCity={setCity}
                      propState={propState} setPropState={setPropState}
                      zip={zip} setZip={setZip}
                      occupancy={occupancy} setOccupancy={setOccupancy}
                      forSale={forSale} setForSale={setForSale}
                      singleFamily={singleFamily} setSingleFamily={setSingleFamily}
                      goodRoof={goodRoof} setGoodRoof={setGoodRoof}
                    />
                  )}
                  {step === 3 && (
                    <PersonalStep
                      firstName={firstName} setFirstName={setFirstName}
                      middleInitial={middleInitial} setMiddleInitial={setMiddleInitial}
                      lastName={lastName} setLastName={setLastName}
                      dob={dob} setDob={setDob}
                    />
                  )}
                  {step === 4 && (
                    <IncomeStep
                      annualIncome={annualIncome} setAnnualIncome={setAnnualIncome}
                      otherIncome={otherIncome} setOtherIncome={setOtherIncome}
                      incomeSource={incomeSource} setIncomeSource={setIncomeSource}
                    />
                  )}
                  {step === 5 && (
                    <ProjectStep projectCost={projectCost} setProjectCost={setProjectCost} />
                  )}
                </div>
              </>
            )}

            {/* Navigation */}
            <div style={{ maxWidth: step === 1 ? 560 : '100%', width: '100%', margin: '0 auto', padding: step === 1 ? '0 16px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                <button onClick={handleBack} style={{
                  background: 'none', border: `1.5px solid ${C.border}`, borderRadius: 12,
                  padding: '11px 20px', fontSize: 14, fontWeight: 600, color: C.navy, cursor: 'pointer',
                }}>
                  ← Back
                </button>
                <button onClick={handleNext} style={{
                  background: C.blue, border: 'none', borderRadius: 12,
                  padding: '12px 28px', fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer',
                }}>
                  {step === 1 ? 'See plans that fit your budget →' : step === TOTAL_STEPS ? 'Check My Eligibility →' : 'Continue →'}
                </button>
              </div>

              {step === 1 && (
                <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 10 }}>
                  Takes ~2 minutes • No obligation
                </p>
              )}
            </div>

            {step === TOTAL_STEPS && (
              <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 12 }}>
                This is a soft credit check and will not affect your credit score.
              </p>
            )}
          </>}
        </div>
      </div>
    </div>
  )
}


// ── ORIGINAL STEPS ────────────────────────────────────────────────────────────


function RefineStep({ billAmount, setBillAmount, singleFamily, setSingleFamily, goodRoof, setGoodRoof, address, setAddress }) {
  const { bill, solar, saves } = calcSavings(billAmount)
  const systemKw     = Math.round((billAmount / 150) * 5 * 10) / 10
  const projectCost  = Math.round(systemKw * 3.2 * 1000)
  const savings20yr  = Math.round(saves * 12 * 20 * 2.7 / 1000) * 1000

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── FULL-BLEED HERO MAP ───────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 320,
        overflow: 'hidden',
        marginBottom: 0,
      }}>
        {/* Satellite image */}
        <img
          src="/solar-map.jpg"
          alt="Aerial satellite view"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 40%',
            display: 'block',
          }}
        />

        {/* Solar heat overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 34% 22% at 50% 44%, rgba(255,224,51,0.55) 0%, rgba(255,130,0,0.38) 40%, rgba(180,30,0,0.18) 75%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Top-left: Analysis complete badge */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)',
          borderRadius: 20, padding: '5px 13px',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 700, color: '#93DDBA',
        }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M1 5L4 8L9 2" stroke="#93DDBA" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          </svg>
          Analysis complete
        </div>

        {/* Top-right: address badge */}
        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(8px)',
          borderRadius: 20, padding: '5px 13px',
          fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.88)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          📍 {address || '1482 Sunridge Drive'}
        </div>


      </div>

      {/* ── CONTENT BELOW MAP (centered, padded) ─────────────────────── */}
      <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '0 16px' }}>

      {/* Heading */}
      <div style={{ padding: '24px 0 16px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: C.navy, margin: 0, letterSpacing: '0em', lineHeight: 1.2 }}>
          Hi Alex, Your roof looks great for solar!&nbsp; Now let&apos;s refine your estimate
        </h1>
      </div>

      {/* ── 3 STAT TILES ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {/* Sunlight */}
        <div style={{
          background: C.white, border: `1.5px solid ${C.border}`,
          borderRadius: 14, padding: '15px 11px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.navy, letterSpacing: '0em', lineHeight: 1 }}>1,804</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 5, lineHeight: 1.4 }}>
            hrs/yr<br/>usable sunlight
          </div>
        </div>

        {/* Sq ft */}
        <div style={{
          background: C.white, border: `1.5px solid ${C.border}`,
          borderRadius: 14, padding: '15px 11px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.navy, letterSpacing: '0em', lineHeight: 1 }}>1,226</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 5, lineHeight: 1.4 }}>
            sq ft<br/>available
          </div>
        </div>

        {/* 20yr savings */}
        <div style={{
          background: C.navy, borderRadius: 14, padding: '14px 11px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: savings20yr >= 100000 ? 14 : 18, fontWeight: 900, color: C.green, letterSpacing: '0em', lineHeight: 1 }}>
            ${savings20yr.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 5, lineHeight: 1.4 }}>
            savings over<br/>20 years
          </div>
        </div>
      </div>

      {/* ── COMBINED SAVINGS + SCRUBBER CARD ─────────────────────────── */}
      <div style={{ background: C.navy, borderRadius: 16, marginBottom: 14, overflow: 'hidden' }}>

        {/* Savings section */}
        <div style={{ padding: '18px 20px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(147,221,186,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Estimated monthly savings
          </div>

          {/* Address input inside tile */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
              Your home address
            </div>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '11px 14px', fontSize: 15,
                border: 'none', borderRadius: 10,
                background: 'rgba(255,255,255,0.1)',
                color: C.white, outline: 'none',
                caretColor: C.green,
              }}
              onFocus={e => e.target.style.background = 'rgba(255,255,255,0.15)'}
              onBlur={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Current bill</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.white, letterSpacing: '0em' }}>~${bill}/mo</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>With solar</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.green, letterSpacing: '0em' }}>~${solar}/mo</div>
            </div>
          </div>
          <div style={{
            background: 'rgba(147,221,186,0.15)', border: '1px solid rgba(147,221,186,0.3)',
            borderRadius: 12, padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(147,221,186,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                Estimated monthly savings
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Based on your current bill</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: C.green, letterSpacing: '-1px', lineHeight: 1 }}>
              ~${saves}<span style={{ fontSize: 16, fontWeight: 700 }}>/mo</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Est. system size</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.white }}>{systemKw} kW</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>Est. project cost</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.white }}>${projectCost.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Scrubber section */}
        <div style={{ padding: '14px 20px 18px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 12 }}>
            What&apos;s your average monthly electric bill?
          </div>
          <input type="range" min={50} max={500} step={5} value={billAmount}
            onChange={e => setBillAmount(Number(e.target.value))}
            style={{ width: '100%', accentColor: C.green, height: 4, cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>$50</span>
            <span style={{ fontSize: 13, color: C.green, fontWeight: 800, letterSpacing: '0em' }}>${billAmount}/mo</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>$500</span>
          </div>
        </div>
      </div>

      {/* ── WHAT HAPPENS NEXT ────────────────────────────────────────── */}
      <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>What happens next</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 8px' }}>A solar specialist will:</p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['Confirm your setup', 'Walk you through your exact plan', 'Answer any questions'].map(item => (
            <li key={item} style={{ fontSize: 14, color: C.muted }}>{item}</li>
          ))}
        </ul>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>🕐</span> Takes ~10 minutes
        </div>
      </div>

      </div>{/* end centered content wrapper */}
    </div>
  )
}


function PropertyStep({ address, setAddress, apt, setApt, city, setCity, propState, setPropState, zip, setZip, occupancy, setOccupancy, forSale, setForSale, singleFamily, setSingleFamily, goodRoof, setGoodRoof }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Home type toggles */}
      <div>
        <FieldLabel>Home type &amp; condition</FieldLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Single family home', val: singleFamily, set: setSingleFamily, req: true },
            { label: 'Good roof condition', val: goodRoof,    set: setGoodRoof,    req: false },
          ].map(({ label, val, set, req }) => (
            <button key={label} onClick={() => !req && set(!val)} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px',
              background: val ? '#F0FDF4' : C.white,
              border: `1.5px solid ${val ? C.teal : C.border}`,
              borderRadius: 10, cursor: req ? 'default' : 'pointer', textAlign: 'left',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: val ? C.teal : C.white,
                border: `2px solid ${val ? C.teal : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {val && (
                  <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
        <div>
          <FieldLabel required>Address</FieldLabel>
          <input value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} placeholder="Street address" />
        </div>
        <div style={{ width: 140 }}>
          <FieldLabel>Apt/Suite</FieldLabel>
          <input value={apt} onChange={e => setApt(e.target.value)} style={inputStyle} placeholder="Apt 8" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <FieldLabel required>City</FieldLabel>
          <input value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <FieldLabel required>State</FieldLabel>
          <select value={propState} onChange={e => setPropState(e.target.value)} style={selectStyle}>
            {US_STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel required>Zipcode</FieldLabel>
          <input value={zip} onChange={e => setZip(e.target.value)} style={inputStyle} maxLength={5} />
        </div>
      </div>
      <div>
        <FieldLabel required>Occupancy Type</FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 6 }}>
          {[
            { value: 'primary', label: 'Primary property', icon: '🏠' },
            { value: 'secondary', label: 'Secondary property', icon: '🏢' },
          ].map(opt => {
            const active = occupancy === opt.value
            return (
              <button key={opt.value} onClick={() => setOccupancy(opt.value)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${active ? C.teal : C.border}`,
                background: active ? 'rgba(1,97,99,0.05)' : C.white,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <span style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? C.teal : C.text }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>* Investment properties are not eligible.</p>
      </div>
      <div>
        <FieldLabel>Is this property currently for sale?</FieldLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          {[true, false].map(val => (
            <button key={String(val)} onClick={() => setForSale(val)} style={{
              padding: '10px 28px', borderRadius: 24, cursor: 'pointer', fontSize: 14, fontWeight: 600,
              border: `1.5px solid ${forSale === val ? C.navy : C.border}`,
              background: forSale === val ? C.navy : C.white,
              color: forSale === val ? C.white : C.text,
              transition: 'all 0.15s',
            }}>
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: C.muted, margin: '8px 0 0' }}>
          * If you have purchased your home in the last 90 days or if the title was transferred to you in the last 90 days, you are not eligible for a Guaranteed Rate, Inc dba Owning Home Equity Line of Credit.
        </p>
      </div>
    </div>
  )
}

function PersonalStep({ firstName, setFirstName, middleInitial, setMiddleInitial, lastName, setLastName, dob, setDob }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 12 }}>
        <div>
          <FieldLabel required>First Name</FieldLabel>
          <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Mid. Initial</FieldLabel>
          <input value={middleInitial} onChange={e => setMiddleInitial(e.target.value)} style={inputStyle} maxLength={1} placeholder="D" />
        </div>
        <div>
          <FieldLabel required>Last Name</FieldLabel>
          <input value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div>
        <FieldLabel required>Date of Birth</FieldLabel>
        <input value={dob} onChange={e => setDob(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} placeholder="MM/DD/YYYY" />
      </div>
    </div>
  )
}

function IncomeStep({ annualIncome, setAnnualIncome, otherIncome, setOtherIncome, incomeSource, setIncomeSource }) {
  const hasIncome = annualIncome.replace(/[^0-9]/g, '').length > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <FieldLabel required>Annual pre-tax income</FieldLabel>
          <input value={annualIncome} onChange={e => setAnnualIncome(e.target.value)} style={inputStyle} placeholder="$" />
          <p style={{ fontSize: 11, color: C.muted, margin: '5px 0 0' }}>Include bonus and all jobs</p>
        </div>
        <div>
          <FieldLabel>Other income <span style={{ fontSize: 11, fontWeight: 400 }}>(optional) **</span></FieldLabel>
          <input value={otherIncome} onChange={e => setOtherIncome(e.target.value)} style={inputStyle} placeholder="$" />
          <p style={{ fontSize: 11, color: C.muted, margin: '5px 0 0' }}>Rental, investment, retirement, etc.</p>
        </div>
      </div>
      {hasIncome && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#F0FDF4', border: '1px solid #86EFAC',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}>Annual pre-tax income confirmed</span>
        </div>
      )}
      <div>
        <FieldLabel required>Primary source of annual income</FieldLabel>
        <select value={incomeSource} onChange={e => setIncomeSource(e.target.value)} style={selectStyle}>
          {INCOME_SOURCES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>* You may include income that is considered community or marital income in your state.</p>
        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>** Disclosure of alimony, child support, or separate maintenance payments is not required unless you would like us to consider this income for qualification purposes.</p>
      </div>
    </div>
  )
}

function ProjectStep({ projectCost, setProjectCost }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <FieldLabel required>Estimated Project Cost</FieldLabel>
        <input value={projectCost} onChange={e => setProjectCost(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }} placeholder="$" />
      </div>
      <div style={{ background: '#F8F9FC', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>What this covers</div>
        <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {['Solar panel installation', 'Permits & inspection fees', 'Battery storage (optional)', 'Any remaining home improvement'].map(item => (
            <li key={item} style={{ fontSize: 13, color: C.muted }}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const CHECKS = [
  'Retrieving Property Value...',
  'Retrieving Credit Information (soft credit pull)...',
  'Checking Property Title & Ownership...',
  'Optimizing Loan Offer...',
  'Personalizing Max Loan Amount...',
  'Configuring Loan APR...',
  'Configuring Loan Insurance...',
]

const EDGE_CASE_SCENARIOS = [
  { id: 'happy',  emoji: '✅', label: 'Happy Path',             desc: 'All checks pass → Pre-approved',                 color: '#166534', bg: '#F0FDF4', border: '#86EFAC' },
  { id: 'ec1',    emoji: '🪪', label: 'Identity Challenge',     desc: 'Fuzzy name match → pick the right name',         color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
  { id: 'ec2',    emoji: '🏠', label: 'Property Not Qualified', desc: 'Insufficient equity / CLTV too high',            color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5' },
  { id: 'ec3',    emoji: '📍', label: 'Address Challenge',      desc: 'Credit found via past address → verify',         color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'ec4',    emoji: '👥', label: 'Add Spouse Income',      desc: 'DTI too high alone → add co-borrower',          color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'ec5',    emoji: '💳', label: 'Debt Consolidation',     desc: 'Use HELOC to retire debts and lower DTI',        color: '#5B21B6', bg: '#F5F3FF', border: '#DDD6FE' },
  { id: 'ec6',    emoji: '❌', label: 'Full Decline',           desc: 'DTI too far out of range → refer to officer',   color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5' },
]

function ProcessingScreen({ onDone, onEdgeCase, initialShowHub }) {
  const [completed, setCompleted] = useState(initialShowHub ? CHECKS.length : 0)
  const [showHub, setShowHub]     = useState(initialShowHub || false)
  const done = completed >= CHECKS.length

  useEffect(() => {
    if (initialShowHub) return  // skip animation when returning from edge case
    if (done) {
      const t = setTimeout(() => setShowHub(true), 800)
      return () => clearTimeout(t)
    }
    const delay = completed < 2 ? 700 : 900
    const t = setTimeout(() => setCompleted(c => c + 1), delay)
    return () => clearTimeout(t)
  }, [completed, done, initialShowHub])

  const progress = completed / CHECKS.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0 20px' }}>
      {/* Spinner card */}
      <div style={{
        width: '100%', background: C.white,
        borderRadius: 16, border: `1.5px solid ${C.border}`,
        padding: '40px 36px 36px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={done ? C.teal : C.teal} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress)}`}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            {done ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="26" viewBox="0 0 32 26" fill="none">
                  <path d="M2 13L12 23L30 3" stroke={C.teal} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            ) : (
              <div style={{ position: 'absolute', inset: 0, animation: 'spin 1.4s linear infinite' }}>
                <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: C.navy }} />
              </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {CHECKS.map((label, i) => {
            const isDone   = i < completed
            const isActive = i === completed
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {isDone ? (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : isActive ? (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.white }} />
                  </div>
                ) : (
                  <div style={{ width: 28, height: 28, flexShrink: 0 }} />
                )}
                <span style={{ fontSize: 16, fontWeight: isDone ? 500 : isActive ? 700 : 400, color: isDone || isActive ? C.text : '#C4C9D4' }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Demo hub — appears after checks complete */}
      {showHub && (
        <div style={{
          width: '100%', marginTop: 24,
          animation: 'slideUp 0.4s ease',
        }}>
          <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>
          <div style={{
            background: C.navy, borderRadius: 16, padding: '22px 24px 24px',
            border: `1.5px solid rgba(255,255,255,0.08)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EAB308', flexShrink: 0 }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: 4 }}>
                Demo Mode
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 4 }}>
              Jump to any qualification outcome
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
              This panel is only visible in demo mode
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {EDGE_CASE_SCENARIOS.map(({ id, emoji, label, desc, color, bg, border }) => (
                <button
                  key={id}
                  onClick={() => id === 'happy' ? onDone() : onEdgeCase(id)}
                  style={{
                    background: bg, border: `1.5px solid ${border}`,
                    borderRadius: 12, padding: '12px 14px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = ''}
                >
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 3, lineHeight: 1.3 }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
