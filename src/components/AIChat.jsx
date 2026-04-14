import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const C = {
  navy:   '#001660',
  blue:   '#254BCE',
  teal:   '#016163',
  green:  '#93DDBA',
  white:  '#ffffff',
  bg:     '#F5F1EE',
  border: '#E5E7EB',
  muted:  '#6B7280',
  text:   '#111827',
}

// Per-route context that gets injected into the system prompt
const ROUTE_CONTEXT = {
  '/offer': {
    name: 'Solar Pre-Qualification',
    description: `The user is on the Westhaven Power solar HELOC pre-qualification flow. It's a 5-step form:
Step 1 – Refine estimate: monthly electric bill, home type, roof condition, address. Shows solar savings estimate.
Step 2 – Property info: address, city, state, zip, occupancy type, for-sale status.
Step 3 – Personal info: full legal name, date of birth.
Step 4 – Income: annual pre-tax income, other income, income source.
Step 5 – Project cost: estimated cost of the solar installation.
After Step 5, the application processes and shows a qualification outcome.`,
  },
  '/pre-qualified': {
    name: 'Pre-Qualified',
    description: `The user has been pre-qualified for a solar HELOC with Westhaven Power / GreenLyne. They can see their offer details and next steps to proceed to the full application.`,
  },
  '/create-account': {
    name: 'Create Account',
    description: `The user is creating a GreenLyne account before starting the full HELOC application. They need to set a password and agree to terms.`,
  },
  '/pos-demo': {
    name: 'HELOC Application (Application 1)',
    description: `The user is in the GreenLyne POS HELOC application — 7 phases, 16 states:
Phase 1 – Basic Info: name, DOB, SSN last 4, contact, marital status, purpose, property address, property value, mortgage balance.
Phase 2 – Select Your Offer: choose credit limit ($25k–$294k) and initial draw amount.
Phase 3 – Verify & Confirm: additional property info (HOA, flood zone), employment & income, link bank/income via Plaid, identity verification.
Phase 4 – Final Offer: operations review wait, then a confirmed loan offer with final APR, payment, and terms (or a decline).
Phase 5 – Review & Sign: document preparation, schedule notary appointment.
Phase 6 – Closing: notary meeting, e-sign or in-person signing.
Phase 7 – Funded: loan funded, funds disbursed.
The loan product is a Home Equity Line of Credit (HELOC) — a revolving credit line secured by home equity, used here for solar installation.`,
  },
  '/heloc-app': {
    name: 'HELOC Application (Application 2)',
    description: `The user is in the GreenLyne formal HELOC application — 4 screens:
Screen 1 – Confirm Details: review and edit pre-filled personal, property, and employment details.
Screen 2 – Loan Options: select credit limit and draw amount with live payment calculations.
Screen 3 – Verify & Confirm: income verification (Plaid link), identity check, property confirmation.
Screen 4 – Final Offer & Sign: review the final loan offer, APR, monthly payment, then e-sign closing documents.`,
  },
  '/qualification': {
    name: 'Qualification Flow',
    description: `The user is in an edge-case qualification scenario — one of: identity challenge, property not qualified, address challenge, add spouse income, debt consolidation, or full decline. Each scenario demonstrates a different path through the HELOC qualification process.`,
  },
}

const SYSTEM_BASE = `You are a helpful AI assistant embedded in a fintech mortgage/HELOC application demo called GreenLyne. You help users understand the application process, answer questions about the current step they're on, and explain financial concepts clearly.

Keep answers concise and friendly — 2-4 sentences max unless the user asks for more detail. Avoid jargon when possible, or explain it when you use it. Never fabricate specific numbers (interest rates, approval odds, etc.) — say those depend on the applicant's profile.`

export default function AIChat() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const ctx = ROUTE_CONTEXT[pathname] || {
    name: 'GreenLyne Demo',
    description: 'The user is exploring the GreenLyne HELOC demo application.',
  }

  const systemPrompt = `${SYSTEM_BASE}

Current page: ${ctx.name}
Context: ${ctx.description}`

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80)
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm here to help with the **${ctx.name}** step. Ask me anything about the process, what information you need, or how this loan works.`,
        }])
      }
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset greeting when route changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [pathname])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      const res = await fetch('/api/claude/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemPrompt,
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }

      const data = await res.json()
      const reply = data.content?.[0]?.text || '…'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Render simple markdown bold (**text**) inline
  function renderText(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : p
    )
  }

  return (
    <>
      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 9999,
          width: 340, height: 480,
          background: C.white,
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatSlideUp 0.22s ease',
          border: `1px solid ${C.border}`,
        }}>
          <style>{`
            @keyframes chatSlideUp {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            background: C.navy, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <SparkleIcon />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white, lineHeight: 1.2 }}>
                AI Assistant
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ctx.name}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center',
              borderRadius: 6,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginRight: 7, marginTop: 2,
                    background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <SparkleIcon size={12} />
                  </div>
                )}
                <div style={{
                  maxWidth: '80%',
                  padding: m.role === 'user' ? '8px 13px' : '9px 13px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? C.navy : '#F3F4F6',
                  color: m.role === 'user' ? C.white : C.text,
                  fontSize: 13.5, lineHeight: 1.5,
                }}>
                  {renderText(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <SparkleIcon size={12} />
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                  background: '#F3F4F6',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF',
                      animation: `chatDot 1.2s ease-in-out ${j * 0.2}s infinite`,
                    }} />
                  ))}
                  <style>{`@keyframes chatDot { 0%,80%,100%{transform:scale(0.7);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
                </div>
              </div>
            )}

            {error && (
              <div style={{ fontSize: 12, color: '#DC2626', padding: '6px 10px', background: '#FEF2F2', borderRadius: 8, textAlign: 'center' }}>
                {error.includes('api-key') || error.includes('401') || error.includes('403')
                  ? 'API key not configured. Add VITE_ANTHROPIC_API_KEY to .env.local'
                  : `Error: ${error}`}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px 14px', flexShrink: 0,
            borderTop: `1px solid ${C.border}`,
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Ask about this step…`}
              rows={1}
              style={{
                flex: 1, resize: 'none', border: `1.5px solid ${C.border}`,
                borderRadius: 12, padding: '9px 13px',
                fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
                color: C.text, lineHeight: 1.4, maxHeight: 90, overflowY: 'auto',
                background: '#F9FAFB',
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: !input.trim() || loading ? '#E5E7EB' : C.navy,
                border: 'none', cursor: !input.trim() || loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M13 7.5L2 2l2.5 5.5L2 13l11-5.5z"
                  fill={!input.trim() || loading ? '#9CA3AF' : C.white}
                  stroke={!input.trim() || loading ? '#9CA3AF' : C.white}
                  strokeWidth="0.5" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? C.teal : C.navy,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22), 0 1px 6px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s, transform 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.07)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="AI Assistant"
      >
        {open
          ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          : <SparkleIcon size={22} color="white" />
        }
      </button>
    </>
  )
}

function SparkleIcon({ size = 16, color = 'white' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2c0 4.5-3.5 8-8 8 4.5 0 8 3.5 8 8 0-4.5 3.5-8 8-8-4.5 0-8-3.5-8-8z"
        fill={color}
      />
    </svg>
  )
}
