import { useNavigate } from 'react-router-dom'

const CTA_ROUTE = '/offer'

// ─── Subject / Preheader options (for reference) ──────────────────────────
// Subject A:  "Alex, your solar offer is ready" (31 chars)
// Subject B:  "You're pre-approved — see your plan" (35 chars)
// Subject C:  "Your home qualifies for solar, Alex" (35 chars)
// RECOMMENDED: Subject A
//
// Preheader A: "Estimated savings of ~$55/mo — no impact to your credit score."
// Preheader B: "Your Westhaven offer is ready. View your plan in 2 minutes."
// RECOMMENDED: Preheader A

export default function EmailPreview() {
  const navigate = useNavigate()
  const go = e => {
    e.preventDefault()
    navigate(CTA_ROUTE, {
      state: {
        firstName: 'Alex', lastName: 'Rivera',
        address: '1482 Sunridge Drive', city: 'Sacramento', state: 'CA',
      }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EDEAE6', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── Email client chrome ─────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 0' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#001660', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>WP</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Trevor Evanson — Westhaven Power</span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>trevor@westhavenpower.com</span>
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>To: alex.rivera@email.com</div>
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>Today, 9:14 AM</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', paddingLeft: 46 }}>
            Alex, your solar offer is ready
          </div>
        </div>
      </div>

      {/* ── Email body ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 640, margin: '28px auto', padding: '0 16px 60px' }}>
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 24px rgba(0,0,0,0.08)' }}>

          {/* HEADER */}
          <div style={{ padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
            <img src="/westhaven-logo-new.avif" alt="Westhaven Power" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Financing powered by</span>
                <img src="/greenlyne-logo.svg" alt="GreenLyne" style={{ height: 13, width: 'auto' }} />
              </div>
              <span style={{ fontSize: 10, color: '#C0C7D4' }}>Lending by Owning · NMLS #2611</span>
            </div>
          </div>

          {/* COVER PHOTO */}
          <div style={{ padding: '16px 16px 0' }}>
            <img
              src="/westhaven-hero.jpg"
              alt="Solar installation by Westhaven Power"
              style={{ width: '100%', height: 200, objectFit: 'cover', objectPosition: 'center 40%', borderRadius: 10, display: 'block' }}
            />
          </div>

          {/* HERO — must be above fold on mobile */}
          <div style={{ padding: '36px 32px 32px' }}>

            {/* Eyebrow */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EEF2FF', borderRadius: 20, padding: '4px 12px', marginBottom: 18 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', letterSpacing: '0.04em' }}>YOUR OFFER IS READY</span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#001660', lineHeight: 1.2, letterSpacing: '-0.5px', margin: '0 0 14px' }}>
              Hi Alex — your home qualifies for solar financing.
            </h1>

            {/* Narrative */}
            <p style={{ fontSize: 16, color: '#4B5563', lineHeight: 1.7, margin: '0 0 28px', maxWidth: 480 }}>
              Your Westhaven consultant pre-screened 1482 Sunridge Drive and
              we&apos;ve pre-built a solar HELOC offer for your property.
              No hard credit pull, no commitment — just your numbers.
            </p>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
              <div style={{ background: '#001660', borderRadius: 12, padding: '20px 20px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Est. Monthly Savings</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#93DDBA', letterSpacing: '-1px', lineHeight: 1 }}>~$55<span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(147,221,186,0.7)' }}>/mo</span></div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Based on your current bill</div>
              </div>
              <div style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '20px 20px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Pre-Approved Amount</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#001660', letterSpacing: '-1px', lineHeight: 1 }}>$131,800</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Solar Home Equity Line of Credit</div>
              </div>
            </div>

            {/* Primary CTA */}
            <a href="#" onClick={go} style={{
              display: 'block', textAlign: 'center',
              background: '#254BCE', color: '#fff',
              fontSize: 16, fontWeight: 700, letterSpacing: '-0.2px',
              padding: '16px 32px', borderRadius: 12,
              textDecoration: 'none', marginBottom: 12,
            }}>
              View My Offer →
            </a>

            {/* Plain-text fallback */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>Or copy: </span>
              <span style={{ fontSize: 12, color: '#254BCE' }}>westhavenpower.com/offer/alex-rivera</span>
            </div>

            {/* Social proof */}
            <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
              Checking eligibility won&apos;t affect your credit score · No obligation
            </div>
          </div>

          {/* DIVIDER */}
          <div style={{ height: 1, background: '#F3F4F6', margin: '0 32px' }} />

          {/* HOW IT WORKS — brief */}
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>What happens next</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { n: '1', title: 'Review your pre-built offer', body: 'Confirm a few details — takes about 5 minutes. No hard credit pull.' },
                { n: '2', title: 'Complete your application', body: 'Verify income and identity online. GreenLyne guides every step.' },
                { n: '3', title: 'Installation & savings begin', body: 'Westhaven schedules your install within days of funding.' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#4F46E5' }}>{s.n}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIVIDER */}
          <div style={{ height: 1, background: '#F3F4F6', margin: '0 32px' }} />

          {/* CONSULTANT */}
          <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#001660', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>TE</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2 }}>Your local energy consultant</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Trevor Evanson · Westhaven Power</div>
              <div style={{ fontSize: 12, color: '#4F46E5', marginTop: 2 }}>(530) 812-1006 · westhavenpower.com</div>
            </div>
          </div>

          {/* SOCIAL PROOF */}
          <div style={{ padding: '28px 32px', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', textAlign: 'center', lineHeight: 1.4, marginBottom: 20 }}>
              Over 10,000 Northern California Families Chose Westhaven — Here&apos;s Why
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { icon: '🏠', stat: '10,000+', label: 'Homes Powered', sub: 'Across Northern California' },
                { icon: '★★★★★', stat: 'Hundreds of', label: '5-Star Reviews', sub: 'Trusted & Verified' },
                { icon: '🔧', stat: 'In-House', label: 'Installation Team', sub: 'Built & Maintained for Decades' },
              ].map((item, i) => (
                <div key={i} style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '16px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#001660', lineHeight: 1.1, letterSpacing: '-0.5px' }}>{item.stat}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: 3, lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 1.4 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SECONDARY CTA */}
          <div style={{ background: '#F9FAFB', padding: '24px 32px', textAlign: 'center', borderTop: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 16px', lineHeight: 1.6 }}>
              Questions before you start? Reply to this email or call Trevor directly — no pressure, ever.
            </p>
            <a href="#" onClick={go} style={{
              display: 'inline-block',
              fontSize: 14, fontWeight: 700, color: '#254BCE',
              border: '1.5px solid #254BCE', borderRadius: 10,
              padding: '10px 24px', textDecoration: 'none',
            }}>
              See My Full Plan
            </a>
          </div>

          {/* FOOTER */}
          <div style={{ background: '#F3F4F6', padding: '24px 32px', borderTop: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              {[['Privacy Policy', '#'], ['Terms', '#'], ['Unsubscribe', '#'], ['Opt Out', 'https://optoutprescreen.com']].map(([label, href]) => (
                <a key={label} href={href} style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'none' }}>{label}</a>
              ))}
            </div>
            <p style={{ fontSize: 10, color: '#C0C7D4', lineHeight: 1.7, margin: 0 }}>
              Terms are estimates and subject to verification and approval. This offer is based on information indicating you meet certain criteria and is not a guaranteed commitment to lend. Checking eligibility uses a soft credit inquiry and will not affect your credit score. Final loan terms subject to full underwriting, property appraisal, and lender approval.
              <br /><br />
              Pre-screen opt-out: If you do not want to receive prescreened offers, call 1-888-5-OPT-OUT or visit optoutprescreen.com.
              Financing powered by GreenLyne. Lending by Owning, NMLS #2611. © 2025 Westhaven Power. CA Lic. 965111.
            </p>
          </div>

        </div>

        {/* Demo badge */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: 'rgba(37,75,206,0.08)', borderRadius: 20, border: '1px solid rgba(37,75,206,0.2)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#254BCE' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#254BCE', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demo — click any CTA to enter the flow</span>
          </div>
        </div>

      </div>
    </div>
  )
}
