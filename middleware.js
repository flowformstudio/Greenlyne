import { next } from '@vercel/edge'

export const config = {
  // Run on every request. Vercel still serves the actual static asset / API route
  // when we call `next()`; we only return a Response when blocking or handling login.
  matcher: '/(.*)',
}

const COOKIE = 'demo_auth'
const TTL_DAYS = 14

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))
  return btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
}

async function makeToken(secret) {
  const exp = Date.now() + TTL_DAYS * 86400 * 1000
  const payload = String(exp)
  const sig = await hmac(secret, payload)
  return `${payload}.${sig}`
}

async function verifyToken(token, secret) {
  if (!token || !token.includes('.')) return false
  const [payload, sig] = token.split('.')
  const exp = Number(payload)
  if (!exp || exp < Date.now()) return false
  const expected = await hmac(secret, payload)
  return sig === expected
}

function loginHTML(error = '') {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Greenlyne Demo &middot; Sign in</title>
<style>
  *,*::before,*::after { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
    background: radial-gradient(1200px 700px at 20% -10%, rgba(99,140,255,0.35), transparent 60%),
                radial-gradient(900px 600px at 110% 110%, rgba(16,185,129,0.20), transparent 55%),
                #001660;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif; color:#001660; }
  .card { width:min(400px, 100%); background:#fff; border-radius:20px; padding:36px 32px;
    box-shadow:0 30px 80px rgba(0,0,0,0.40), 0 2px 6px rgba(0,0,0,0.20); }
  .brand { font-size:11px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:rgba(0,22,96,0.45); }
  h1 { margin:6px 0 6px; font-size:24px; letter-spacing:-0.01em; }
  p.lead { margin:0 0 22px; color:rgba(0,22,96,0.55); font-size:13px; line-height:1.45; }
  label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:rgba(0,22,96,0.55); margin-bottom:6px; }
  input { width:100%; padding:12px 14px; border:1px solid #E5E7EB; border-radius:10px; font-size:14px; color:#001660; outline:none; transition: border-color 120ms ease, box-shadow 120ms ease; }
  input:focus { border-color:#254BCE; box-shadow:0 0 0 3px rgba(37,75,206,0.12); }
  button { width:100%; margin-top:18px; padding:12px; border:none; border-radius:10px; background:#001660; color:#fff; font-weight:600; font-size:14px; cursor:pointer; transition: background 120ms ease, transform 120ms ease; }
  button:hover { background:#254BCE; }
  button:active { transform: translateY(1px); }
  .err { color:#DC2626; font-size:12px; margin-top:12px; min-height:16px; font-weight:500; }
  .foot { margin-top:18px; font-size:11px; color:rgba(0,22,96,0.40); text-align:center; }
</style></head><body>
<form class="card" method="POST" action="/_demo-login">
  <div class="brand">Greenlyne</div>
  <h1>Demo access</h1>
  <p class="lead">Enter the password to view the demo.</p>
  <label for="p">Password</label>
  <input id="p" name="password" type="password" autofocus autocomplete="current-password" />
  <button type="submit">Sign in</button>
  <div class="err">${error}</div>
  <div class="foot">Need access? Contact the team.</div>
</form>
</body></html>`
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const password = process.env.DEMO_PASSWORD || ''

  // Not configured yet → let everything through so the site stays usable
  // until the operator adds DEMO_PASSWORD in Vercel env vars.
  if (!password) return next()

  // Login page (GET shows form, POST verifies).
  if (url.pathname === '/_demo-login') {
    if (request.method === 'POST') {
      let submitted = ''
      try {
        const form = await request.formData()
        submitted = String(form.get('password') || '')
      } catch {}
      if (submitted && submitted === password) {
        const token = await makeToken(password)
        const res = new Response(null, { status: 303, headers: { Location: '/' } })
        res.headers.append(
          'Set-Cookie',
          `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL_DAYS * 86400}`,
        )
        return res
      }
      return new Response(loginHTML('Incorrect password.'), {
        status: 401,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }
    return new Response(loginHTML(), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  // Read auth cookie.
  const cookieHeader = request.headers.get('cookie') || ''
  const part = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))
  const token = part ? decodeURIComponent(part.slice(COOKIE.length + 1)) : ''

  if (await verifyToken(token, password)) {
    return next()
  }

  // Not signed in → bounce to login.
  return new Response(null, { status: 303, headers: { Location: '/_demo-login' } })
}
