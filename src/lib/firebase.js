import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBqndroH1-xrPm4WXyBGMa7PE2ZmGK3xLM',
  authDomain: 'greenlyne-demo-2026.firebaseapp.com',
  projectId: 'greenlyne-demo-2026',
  storageBucket: 'greenlyne-demo-2026.firebasestorage.app',
  messagingSenderId: '265060679430',
  appId: '1:265060679430:web:c75bc8d83043e9758b2887',
}

export const app = initializeApp(firebaseConfig)
export const db  = getFirestore(app)

const LEADS_COLL = 'prescreen_leads'

/**
 * Subscribe to leads added via Quick Prescreen — newest first.
 * Returns the unsubscribe function. Call onLeads with the live array.
 */
export function subscribeLeads(onLeads) {
  const q = query(collection(db, LEADS_COLL), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => {
    const leads = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    onLeads(leads)
  }, err => {
    console.warn('[firestore] subscribeLeads error', err)
    onLeads([])
  })
}

/** Add a lead to Firestore. Returns the doc ID. */
export async function addLead(lead) {
  const ref = await addDoc(collection(db, LEADS_COLL), {
    ...lead,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/** Delete a lead from Firestore by document ID. */
export async function deleteLead(id) {
  await deleteDoc(doc(db, LEADS_COLL, id))
}
