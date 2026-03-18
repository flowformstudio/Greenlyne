import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl font-bold tracking-tight text-gray-900">Greenlyne</div>
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

        <button
          onClick={() => navigate('/pipeline')}
          className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          Enter Demo
        </button>

        <p className="text-center text-xs text-gray-400">
          This is a prototype demo — no login required
        </p>
      </div>
    </div>
  )
}
