import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  subscribeMerchants, subscribeLenders, subscribeActive,
  seedDefaultsIfEmpty, FALLBACK_MERCHANT, FALLBACK_LENDER,
} from './partners'

const Ctx = createContext(null)

export function PartnersProvider({ children }) {
  const [merchants,  setMerchants]  = useState([])
  const [lenders,    setLenders]    = useState([])
  const [active,     setActive]     = useState({ merchantId: null, lenderId: null })
  const [loading,    setLoading]    = useState(true)
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
