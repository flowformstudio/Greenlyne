/**
 * Vercel Serverless proxy → Greenlyne dev API.
 *
 * Browser hits /api/glyne?p=<sub-path>&...   (or /api/glyne with the sub-path as
 * the `p` query param) and we forward it to https://api-dev.greenlyne.ai/api/<sub-path>
 * with a Bearer token from a cached server-side login.
 *
 * Env vars (Vercel — Production scope):
 *   GLYNE_USERNAME   — demo service-account email
 *   GLYNE_PASSWORD   — its password
 *   GLYNE_USER_TYPE  — 'loan_officer' (default)
 *   GLYNE_HOST_REF   — tenant origin to spoof, e.g. fbkc-pro-dev.greenlyne.ai
 *   GLYNE_API_BASE   — default https://api-dev.greenlyne.ai
 */

// Vercel — bump function timeout from default 10s to 60s for slow upstream calls.
export const config = { maxDuration: 60 }

const API_BASE  = process.env.GLYNE_API_BASE || 'https://api-dev.greenlyne.ai'
const HOST_REF  = process.env.GLYNE_HOST_REF || 'fbkc-pro-dev.greenlyne.ai'
const USER_TYPE = process.env.GLYNE_USER_TYPE || 'loan_officer'

let cachedToken     = null
let cachedExpiresAt = 0

async function getToken() {
  const now = Date.now()
  if (cachedToken && now < cachedExpiresAt - 30_000) return cachedToken

  const username = process.env.GLYNE_USERNAME
  const password = process.env.GLYNE_PASSWORD
  if (!username || !password) throw new Error('Missing GLYNE_USERNAME / GLYNE_PASSWORD env vars')

  const loginRes = await fetch(`${API_BASE}/api/login?send_auth_token=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin':  `https://${HOST_REF}`,
      'Referer': `https://${HOST_REF}/`,
    },
    body: JSON.stringify({ username_or_email: username, password, user_type: USER_TYPE }),
  })
  if (!loginRes.ok) {
    const txt = await loginRes.text().catch(() => '')
    throw new Error(`Upstream login ${loginRes.status}: ${txt.slice(0, 240)}`)
  }
  const loginJson = await loginRes.json()
  let token = loginJson?.access_token || loginJson?.access || loginJson?.token
  if (!token && loginJson?.login_id) {
    const tokRes = await fetch(`${API_BASE}/api/get-token-by-login-id?send_auth_token_to_secure_cookie=false&login_id=${encodeURIComponent(loginJson.login_id)}`, {
      headers: { 'Origin': `https://${HOST_REF}`, 'Referer': `https://${HOST_REF}/` },
    })
    if (!tokRes.ok) throw new Error(`Upstream token exchange ${tokRes.status}`)
    const tokJson = await tokRes.json()
    token = tokJson?.access || tokJson?.access_token || tokJson?.token
  }
  if (!token) throw new Error('No token in upstream login response')

  cachedToken     = token
  cachedExpiresAt = now + 50 * 60 * 1000
  return token
}

export default async function handler(req, res) {
  // Sub-path comes from query param `p`. Extra params are passed through.
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const sub = url.searchParams.get('p') || ''
  url.searchParams.delete('p')
  const upstreamPath = sub.replace(/^\/+/, '')
  const upstreamQs   = url.searchParams.toString()
  const upstream = `${API_BASE}/api/${upstreamPath}${upstreamQs ? '?' + upstreamQs : ''}`

  try {
    const token = await getToken()
    let body
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    }
    const upstreamRes = await fetch(upstream, {
      method: req.method,
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin':  `https://${HOST_REF}`,
        'Referer': `https://${HOST_REF}/`,
      },
      body,
    })
    res.status(upstreamRes.status)
    const ct = upstreamRes.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const j = await upstreamRes.json().catch(() => null)
      res.setHeader('content-type', 'application/json')
      res.send(JSON.stringify(j))
    } else {
      const t = await upstreamRes.text()
      res.setHeader('content-type', ct || 'text/plain')
      res.send(t)
    }
  } catch (err) {
    console.error('[glyne-proxy]', err)
    res.status(502).json({ error: 'Upstream auth/proxy failed', detail: String(err?.message || err) })
  }
}
