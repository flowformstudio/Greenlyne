import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  subscribeMerchants, subscribeLenders, subscribeActive,
  seedDefaultsIfEmpty, FALLBACK_MERCHANT, FALLBACK_LENDER,
} from './partners'

const Ctx = createContext(null)

// localStorage cache for the active merchant + lender so that on subsequent
// page loads we can render the *correct* logos / cover synchronously, before
// Firestore subscriptions resolve. Without this, the demo flashes the seed
// defaults (Westhaven) for a split second after every reload.
const CACHE_KEY = 'greenlyne_active_partners_v1'

function readPartnersCache() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writePartnersCache(payload) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload)) }
  catch {} // localStorage can throw on quota / privacy mode
}

export function PartnersProvider({ children }) {
  // Hydrate from cache synchronously so the first render shows the correct
  // active merchant + lender (no Westhaven flash on reload).
  const cached = readPartnersCache()
  const [merchants,  setMerchants]  = useState(() => cached?.merchant ? [cached.merchant] : [])
  const [lenders,    setLenders]    = useState(() => cached?.lender   ? [cached.lender]   : [])
  const [active,     setActive]     = useState(() => ({
    merchantId: cached?.merchant?.id ?? null,
    lenderId:   cached?.lender?.id   ?? null,
  }))
  const [loading,    setLoading]    = useState(!cached)
  const [manageOpen, setManageOpen] = useState(false)
  const [manageTab,  setManageTab]  = useState('merchant') // 'merchant' | 'lender'

  // Seed defaults once, then subscribe.
  useEffect(() => {
    let cancelled = false
    seedDefaultsIfEmpty().catch(e => console.warn('[partners] seed', e))
    const unsubM = subscribeMerchants(v => { if (!cancelled) setMerchants(v) })
    const unsubL = subscribeLenders(v => { if (!cancelled) setLenders(v) })
    const unsubA = subscribeActive(v => { if (!cancelled) { setActive(v); setLoading(false) } })
    return () => { cancelled = true; unsubM(); unsubL(); unsubA() }
  }, [])

  const merchant = useMemo(
    () => merchants.find(m => m.id === active.merchantId) || merchants[0] || FALLBACK_MERCHANT,
    [merchants, active.merchantId],
  )
  const lender = useMemo(
    () => lenders.find(l => l.id === active.lenderId) || lenders[0] || FALLBACK_LENDER,
    [lenders, active.lenderId],
  )

  // Persist the resolved active pair so the next page load hydrates instantly.
  // Only cache real Firestore-backed entries — never the static fallbacks,
  // and only once Firestore has actually responded.
  useEffect(() => {
    if (loading) return
    if (!merchant || !lender) return
    if (merchant.id?.startsWith('__fallback') || lender.id?.startsWith('__fallback')) return
    writePartnersCache({ merchant, lender })
  }, [merchant, lender, loading])

  const openManage = useCallback((tab = 'merchant') => {
    setManageTab(tab)
    setManageOpen(true)
  }, [])
  const closeManage = useCallback(() => setManageOpen(false), [])

  const value = useMemo(() => ({
    merchants, lenders, active, merchant, lender, loading,
    manageOpen, manageTab, openManage, closeManage, setManageTab,
  }), [merchants, lenders, active, merchant, lender, loading, manageOpen, manageTab, openManage, closeManage])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePartners() {
  const v = useContext(Ctx)
  if (!v) {
    // Soft fallback so pages opened outside the provider (rare) don't crash.
    return {
      merchants: [], lenders: [], active: { merchantId: null, lenderId: null },
      merchant: FALLBACK_MERCHANT, lender: FALLBACK_LENDER, loading: true,
      manageOpen: false, manageTab: 'merchant',
      openManage: () => {}, closeManage: () => {}, setManageTab: () => {},
    }
  }
  return v
}

export function useActivePartners() {
  const { merchant, lender, loading } = usePartners()
  return { merchant, lender, loading }
}

export function useManageDemo() {
  const { openManage, closeManage, manageOpen } = usePartners()
  return { openManage, closeManage, manageOpen }
}
