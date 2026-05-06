/**
 * CSV Import history — Firestore-backed list of bulk-upload events used by
 * PMPro's "Bulk Upload Leads" modal (Pipeline.jsx → ImportCSVModal).
 *
 * Storage model: metadata only (no CSV bytes). The Firebase project is on
 * Spark (Storage disabled), so we keep docs small and skip persisting raw
 * file contents — the demo cares about history visibility, not file recall.
 *
 * Doc shape:
 *   csv_imports/{id} {
 *     file_name, file_size_bytes,
 *     household_count, homeowner_count_with_offer,
 *     status, createdAt,
 *     created_at_label?  // only present on seed rows so the original demo
 *                        // dates don't all collapse to the seed time.
 *   }
 */

import {
  collection, addDoc, deleteDoc, doc,
  query, orderBy, onSnapshot, serverTimestamp, getDocs,
} from 'firebase/firestore'
import { db } from './firebase'

const COLL = 'csv_imports'

export function subscribeImports(cb) {
  const q = query(collection(db, COLL), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    err => { console.warn('[imports] subscribe', err); cb([]) },
  )
}

/** Persist a new import. Returns the new doc id. */
export async function addImport(item) {
  const ref = await addDoc(collection(db, COLL), {
    ...stripUndefined(item),
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteImport(id) {
  await deleteDoc(doc(db, COLL, id))
}

function stripUndefined(o) {
  const out = {}
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v
  return out
}

/* ── Seed history on first run ─────────────────────────────────────────── */

const SEED = [
  { file_name: 'homeowners_march.csv',   household_count: 500, homeowner_count_with_offer: 312, status: 'OFFER_GENERATION_DONE',        created_at_label: 'Mar 8, 2026' },
  { file_name: 'miami_westside_feb.csv', household_count: 280, homeowner_count_with_offer: 194, status: 'OFFER_GENERATION_DONE',        created_at_label: 'Feb 21, 2026' },
  { file_name: 'austin_north_q1.csv',    household_count: 740, homeowner_count_with_offer: 0,   status: 'OFFER_GENERATION_IN_PROGRESS', created_at_label: 'Feb 14, 2026' },
  { file_name: 'dallas_suburbs.csv',     household_count: 155, homeowner_count_with_offer: 88,  status: 'OFFER_GENERATION_DONE',        created_at_label: 'Jan 30, 2026' },
  { file_name: 'phoenix_dec_batch.csv',  household_count: 620, homeowner_count_with_offer: 401, status: 'OFFER_GENERATION_DONE',        created_at_label: 'Dec 12, 2025' },
]

export async function seedImportsIfEmpty() {
  const snap = await getDocs(collection(db, COLL))
  if (!snap.empty) return
  // Seed in reverse so the newest row ends up at the top after orderBy desc.
  for (let i = SEED.length - 1; i >= 0; i--) {
    await addDoc(collection(db, COLL), {
      ...SEED[i],
      createdAt: serverTimestamp(),
    })
  }
}

/** Render either the seed's friendly label or a Firestore timestamp. */
export function formatImportDate(item) {
  if (item?.created_at_label) return item.created_at_label
  const ts = item?.createdAt
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ── CSV parsing helpers ────────────────────────────────────────────────── */

/** Read a File / Blob as UTF-8 text. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = e => resolve(e.target.result)
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsText(file)
  })
}

/**
 * Minimal CSV parser — sufficient for the demo template (comma-separated, no
 * embedded commas / quoted fields). For more complex files we'd swap in
 * Papa Parse, but keeping the dep tree small here.
 */
export function parseCSV(text) {
  const lines = (text || '').split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    const cells = line.split(',').map(c => c.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

/** Cap total stored rows to keep doc size under Firestore's 1MB limit. */
export const MAX_STORED_ROWS = 2000
