/**
 * Partners — merchants & lenders configurable from the "Manage Demo" modal.
 * Cascades through the entire demo (email, offer, pre-qual, POS).
 *
 * Firestore:
 *   merchants/{id}                { name, kind, logoUrl, logoStoragePath, brandColor?, tagline?, createdAt, updatedAt }
 *   lenders/{id}                  { name, type, logoUrl, logoStoragePath, nmls?, brandColor?, tagline?, createdAt, updatedAt }
 *   app_config/active_partners    { merchantId, lenderId, updatedAt }
 *
 * Storage:
 *   partners/merchants/{id}.{ext}
 *   partners/lenders/{id}.{ext}
 */

import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, getDocs, query, orderBy, getDoc,
} from 'firebase/firestore'
import { db } from './firebase'

/* ── Constants ───────────────────────────────────────────────── */

export const MERCHANT_KINDS = [
  { id: 'solar',    label: 'Solar' },
  { id: 'pool',     label: 'Pool' },
  { id: 'hvac',     label: 'HVAC' },
  { id: 'roofing',  label: 'Roofing' },
  { id: 'windows',  label: 'Windows' },
  { id: 'other',    label: 'Other' },
]

export const LENDER_TYPES = [
  { id: 'bank',         label: 'Bank' },
  { id: 'credit_union', label: 'Credit Union' },
  { id: 'fintech',      label: 'Fintech' },
  { id: 'marketplace',  label: 'Marketplace' },
]

const ACTIVE_DOC = doc(db, 'app_config', 'active_partners')

/* ── Subscriptions ───────────────────────────────────────────── */

export function subscribeMerchants(cb) {
  const q = query(collection(db, 'merchants'), orderBy('name'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => { console.warn('[partners] subscribeMerchants', err); cb([]) })
}

export function subscribeLenders(cb) {
  const q = query(collection(db, 'lenders'), orderBy('name'))
  return onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => { console.warn('[partners] subscribeLenders', err); cb([]) })
}

export function subscribeActive(cb) {
  return onSnapshot(ACTIVE_DOC, snap => cb(snap.exists() ? snap.data() : { merchantId: null, lenderId: null }),
    err => { console.warn('[partners] subscribeActive', err); cb({ merchantId: null, lenderId: null }) })
}

/* ── Active selection ────────────────────────────────────────── */

export async function setActivePartner(role, id) {
  const field = role === 'merchant' ? 'merchantId' : 'lenderId'
  await setDoc(ACTIVE_DOC, { [field]: id, updatedAt: serverTimestamp() }, { merge: true })
}

/* ── Logo encoding (base64 inline — no Cloud Storage needed) ─── */

const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp', 'image/avif']
// Firestore docs cap at ~1MB. Base64 expands by 4/3, plus other fields.
// Cap raw input at 400KB → ~533KB encoded, leaving headroom.
const MAX_BYTES = 400_000

export async function fileToDataUri(file) {
  if (!file) throw new Error('No file selected')
  if (file.size > MAX_BYTES) {
    throw new Error(`Logo must be under ${Math.round(MAX_BYTES / 1000)} KB (got ${Math.round(file.size / 1000)} KB)`)
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

/* ── CRUD ────────────────────────────────────────────────────── */

const COLL = role => role === 'merchant' ? 'merchants' : 'lenders'

export async function createPartner(role, data, files = {}) {
  const logoUrl       = files.logo        ? await fileToDataUri(files.logo)        : ''
  const symbolLogoUrl = files.symbolLogo  ? await fileToDataUri(files.symbolLogo)  : ''
  const coverImageUrl = files.coverImage  ? await fileToDataUri(files.coverImage)  : ''
  const ref = await addDoc(collection(db, COLL(role)), {
    ...stripUndefined(data),
    logoUrl,
    ...(role === 'merchant' ? { symbolLogoUrl, coverImageUrl } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePartner(role, id, data, files = {}) {
  const patch = { ...stripUndefined(data), updatedAt: serverTimestamp() }
  if (files.logo)       patch.logoUrl        = await fileToDataUri(files.logo)
  if (files.symbolLogo) patch.symbolLogoUrl  = await fileToDataUri(files.symbolLogo)
  if (files.coverImage) patch.coverImageUrl  = await fileToDataUri(files.coverImage)
  await updateDoc(doc(db, COLL(role), id), patch)
}

export async function deletePartner(role, id) {
  await deleteDoc(doc(db, COLL(role), id))
}

function stripUndefined(o) {
  const out = {}
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v
  return out
}

/* ── Seed defaults on first run ──────────────────────────────── */

const DEFAULT_MERCHANTS = [
  {
    slug: 'westhaven',
    name: 'Westhaven Power',
    kind: 'solar',
    logoUrl: '/westhaven-logo-new.avif',
    symbolLogoUrl: '/westhaven-icon.svg',
    coverImageUrl: '/solar-heat-map.jpg',
    brandColor: '#e0271a',
    tagline: 'Northern California solar installer',
  },
]

const DEFAULT_LENDERS = [
  {
    slug: 'owning',
    name: 'Owning',
    type: 'fintech',
    logoUrl: '/owning-logo.webp',
    nmls: '2611',
    brandColor: '#001660',
  },
  {
    slug: 'grand-bank',
    name: 'Grand Bank',
    type: 'bank',
    logoUrl: '/grand-bank-logo.png',
    nmls: '2611',
    brandColor: '#001660',
  },
]

/**
 * Ensures defaults exist. Idempotent: only seeds when both collections are empty.
 * Returns { merchantId, lenderId } of the defaults so caller can set active.
 */
export async function seedDefaultsIfEmpty() {
  const [mSnap, lSnap, aSnap] = await Promise.all([
    getDocs(collection(db, 'merchants')),
    getDocs(collection(db, 'lenders')),
    getDoc(ACTIVE_DOC),
  ])
  let merchantDefaultId = null
  let lenderDefaultId   = null

  if (mSnap.empty) {
    for (const m of DEFAULT_MERCHANTS) {
      const ref = await addDoc(collection(db, 'merchants'), {
        ...m, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      if (m.slug === 'westhaven') merchantDefaultId = ref.id
    }
  }
  if (lSnap.empty) {
    for (const l of DEFAULT_LENDERS) {
      const ref = await addDoc(collection(db, 'lenders'), {
        ...l, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      if (l.slug === 'owning') lenderDefaultId = ref.id
    }
  }

  if (!aSnap.exists() || (!aSnap.data()?.merchantId && !aSnap.data()?.lenderId)) {
    // Fall back: pick the first of each if defaults weren't fresh-seeded
    if (!merchantDefaultId) {
      const all = await getDocs(collection(db, 'merchants'))
      merchantDefaultId = all.docs[0]?.id ?? null
    }
    if (!lenderDefaultId) {
      const all = await getDocs(collection(db, 'lenders'))
      lenderDefaultId = all.docs[0]?.id ?? null
    }
    if (merchantDefaultId || lenderDefaultId) {
      await setDoc(ACTIVE_DOC, {
        merchantId: merchantDefaultId,
        lenderId:   lenderDefaultId,
        updatedAt:  serverTimestamp(),
      }, { merge: true })
    }
  }
}

/* ── Static fallbacks (used before Firestore loads) ──────────── */

export const FALLBACK_MERCHANT = {
  id: '__fallback_merchant__',
  name: 'Westhaven Power',
  kind: 'solar',
  logoUrl: '/westhaven-logo-new.avif',
  symbolLogoUrl: '/westhaven-icon.svg',
  coverImageUrl: '/solar-heat-map.jpg',
  brandColor: '#e0271a',
}
export const FALLBACK_LENDER = {
  id: '__fallback_lender__',
  name: 'Owning',
  type: 'fintech',
  logoUrl: '/owning-logo.webp',
  brandColor: '#001660',
  nmls: '2611',
}
