import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: 'url(/login-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Subtle overlay to ensure contrast */}
      <div className="absolute inset-0" style={{background: 'rgba(0,10,50,0.35)'}} />

      <div className="relative z-10 w-full max-w-sm mx-4 flex flex-col gap-6"
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          padding: '40px 36px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
        }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <img src="/greenlyne-logo.svg" alt="Greenlyne" style={{height: 32, marginBottom: 2}} />
          <div className="text-sm text-gray-500">PrecisionMARKETER Pro — Demo</div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Username or Email</label>
            <input
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
              value="demo@greenlyne.ai"
              readOnly
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Password</label>
            <input
              type="password"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
              value="••••••••"
              readOnly
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => navigate('/pipeline')}
            className="w-full text-white rounded-lg py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: '#001660' }}
          >
            Enter Demo
          </button>

          <button
            onClick={() => navigate('/email')}
            className="w-full rounded-lg py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'none', border: '1.5px solid #001660', color: '#001660' }}
          >
            Consumer Flow Demo →
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          This is a prototype demo — no login required
        </p>
      </div>
    </div>
  )
}
