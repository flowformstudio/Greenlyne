import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { QUOTA } from '../lib/quota'
import { ThemeContext } from '../lib/theme'

const NAV_ITEMS = [
  {
    id: 'pipeline', label: 'Pipeline', path: '/pipeline',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    id: 'geo', label: 'Geo Campaigns', path: '/geo-campaigns',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  },
]

function IconSettings() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function IconHelp() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function QuotaBadge() {
  const [open, setOpen] = useState(false)
  const { org, user } = QUOTA
  const orgPct  = Math.round((org.monthlyUsed  / org.monthlyTotal)  * 100)
  const userPct = Math.round((user.monthlyUsed / user.monthlyTotal) * 100)
  const low     = user.monthlyRemaining <= 10

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex flex-col gap-1 px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors
          ${low
            ? 'border-amber-600/40 bg-amber-900/20 text-amber-300 hover:bg-amber-900/30'
            : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
        style={low ? {} : {color:'rgba(245,241,238,0.65)'}}
        title="Prescreen credits"
      >
        <span>{user.monthlyRemaining} credits left{low && <span className="text-amber-400 ml-1">!</span>}</span>
        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.1)'}}>
          <div className="h-full rounded-full" style={{width:`${100 - userPct}%`, background: low ? '#FBBF24' : '#93DDBA'}} />
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-40 overflow-hidden" style={{boxShadow:'0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'}}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Prescreen Credits</span>
                <span className="text-[10px] text-gray-400">{org.period}</span>
              </div>
            </div>

            {/* Org quota */}
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Org balance</span>
                <span className="text-[12px] font-semibold text-gray-900 ">
                  {org.monthlyRemaining.toLocaleString()} <span className="text-gray-400 font-normal">/ {org.monthlyTotal.toLocaleString()}</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${orgPct > 80 ? 'bg-amber-400' : 'bg-gray-900'}`}
                  style={{width: `${100 - orgPct}%`}}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                <span>{org.monthlyUsed} used MTD</span>
                <span>{orgPct}% consumed</span>
              </div>
            </div>

            {/* User quota */}
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Your balance</span>
                <span className={`text-[12px] font-semibold  ${low ? 'text-amber-600' : 'text-gray-900'}`}>
                  {user.monthlyRemaining} <span className="text-gray-400 font-normal">/ {user.monthlyTotal}</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${userPct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{width: `${100 - userPct}%`}}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                <span>{user.monthlyUsed} used MTD</span>
                <span>{userPct}% consumed</span>
              </div>
            </div>

            {/* YTD */}
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Org YTD</span>
                <span className="text-[12px] font-semibold text-gray-900 ">
                  {org.ytdUsed.toLocaleString()} <span className="text-gray-400 font-normal">/ {org.ytdTotal.toLocaleString()}</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full" style={{width:`${Math.round(org.ytdUsed/org.ytdTotal*100)}%`}} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                <span>{org.ytdTotal - org.ytdUsed} remaining YTD</span>
                <span>{Math.round(org.ytdUsed/org.ytdTotal*100)}% of annual</span>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 text-center">
              1 prescreen = 1 credit · resets monthly
            </div>

            <div className="px-3 py-3 flex gap-2 border-t border-gray-100">
              <button className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                Manage Credits
              </button>
              <button className="flex-1 px-3 py-2 rounded-lg text-[11px] font-semibold text-white transition-colors hover:opacity-90" style={{background:'#254BCE'}}>
                Buy More Credits
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const THEME_OPTIONS = [
  {
    key: 'dark',
    label: 'Dark',
    description: 'Dark interface',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
  },
  {
    key: 'light',
    label: 'Light',
    description: 'Light interface',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
  {
    key: 'browser',
    label: 'System',
    description: 'Follows system preference',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
      </svg>
    ),
  },
]

function computeDark(mode) {
  if (mode === 'light') return false
  if (mode === 'browser') return window.matchMedia('(prefers-color-scheme: dark)').matches
  return true // 'dark'
}

function UserMenu({ themeMode, setThemeMode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-opacity hover:opacity-80"
        style={{background:'rgba(255,255,255,0.2)', color:'#fff'}}
        title="Demo User · demo@greenlyne.ai"
      >
        DU
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 z-40 overflow-hidden"
            style={{
              background: '#fff',
              border: '1px solid rgba(0,22,96,0.1)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,22,96,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            }}>

            {/* User info */}
            <div className="px-4 py-3.5 flex items-center gap-3" style={{borderBottom:'1px solid rgba(0,22,96,0.07)'}}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0" style={{background:'#254BCE', color:'#fff'}}>
                DU
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight" style={{color:'#001660'}}>Demo User</div>
                <div className="text-[11px] mt-0.5 leading-tight truncate" style={{color:'rgba(0,22,96,0.4)'}}>demo@greenlyne.ai</div>
              </div>
            </div>

            {/* Appearance */}
            <div className="px-4 py-3" style={{borderBottom:'1px solid rgba(0,22,96,0.07)'}}>
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{color:'rgba(0,22,96,0.35)'}}>Appearance</div>
              <div className="flex p-0.5 rounded-lg" style={{background:'rgba(0,22,96,0.05)'}}>
                {[{key:'light',label:'Light'},{key:'dark',label:'Dark'}].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { setThemeMode(opt.key) }}
                    className="flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-all"
                    style={{
                      background: themeMode === opt.key ? '#fff' : 'transparent',
                      color: themeMode === opt.key ? '#001660' : 'rgba(0,22,96,0.4)',
                      boxShadow: themeMode === opt.key ? '0 1px 4px rgba(0,22,96,0.1)' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="px-2 py-1" style={{borderBottom:'1px solid rgba(0,22,96,0.07)'}}>
              <button
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
                style={{color:'rgba(0,22,96,0.6)'}}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,22,96,0.04)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <IconSettings />
                <span className="text-[13px] font-medium flex-1">Settings</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'rgba(0,22,96,0.25)'}}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            {/* Sign out */}
            <div className="px-2 py-1">
              <button
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
                style={{color:'rgba(0,22,96,0.45)'}}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(0,22,96,0.04)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span className="text-[13px] font-medium">Sign out</span>
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  )
}

export default function AppLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [themeMode, setThemeMode] = useState('light')
  const [dark, setDark] = useState(false)

  // Recompute dark whenever themeMode changes, and listen for system pref changes
  useEffect(() => {
    const update = () => setDark(computeDark(themeMode))
    update()
    if (themeMode === 'browser') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }
  }, [themeMode])

  const headerBg = themeMode === 'dark' ? '#172340' : '#254BCE'

  return (
    <ThemeContext.Provider value={{ dark, themeMode, setThemeMode: (m) => setThemeMode(m) }}>
    <div className="flex flex-col h-screen overflow-hidden" style={{background: dark ? '#0F172A' : '#F0F2F5'}}>
      {/* Top Nav */}
      <header className="h-12 flex items-center px-5 shrink-0 border-b" style={{background: headerBg, borderColor:'rgba(255,255,255,0.12)'}}>
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <img src="/greenlyne-logo-white.svg" alt="GreenLyne" style={{height: 20}} />
          <span className="text-[11px] font-medium" style={{color:'rgba(255,255,255,0.55)'}}>PMPro</span>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1.5">
          <QuotaBadge />
          <div className="w-px h-4 mx-1" style={{background:'rgba(255,255,255,0.12)'}} />
          <button className="p-1.5 rounded-lg transition-colors hover:bg-white/8" style={{color:'rgba(245,241,238,0.5)'}} title="Help">
            <IconHelp />
          </button>
          <button className="p-1.5 rounded-lg transition-colors hover:bg-white/8" style={{color:'rgba(245,241,238,0.5)'}} title="Notifications">
            <IconBell />
          </button>
          <div className="w-px h-4 mx-1" style={{background:'rgba(255,255,255,0.12)'}} />
          <UserMenu themeMode={themeMode} setThemeMode={setThemeMode} />
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Sidebar spacer — holds layout width so content never shifts */}
        <div className="shrink-0" style={{width: 40}} />

        {/* Sidebar — overlays content on expand */}
        <aside
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          className="absolute left-0 top-0 bottom-0 z-20 flex flex-col overflow-hidden"
          style={{
            background: dark ? '#172340' : '#fff',
            borderRight: dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,22,96,0.08)',
            width: sidebarExpanded ? 176 : 40,
            transition: 'width 160ms ease, background 200ms ease',
            boxShadow: sidebarExpanded ? (dark ? '4px 0 20px rgba(0,0,0,0.3)' : '4px 0 20px rgba(0,22,96,0.08)') : 'none',
          }}
        >
          <nav className="flex flex-col pt-3 gap-0.5 px-1.5">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.id}
                to={item.path}
                className="relative flex items-center gap-2.5 py-2 rounded-lg text-sm font-medium"
                style={({ isActive }) => ({
                  color: isActive ? (dark ? '#fff' : '#001660') : (dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,22,96,0.4)'),
                  paddingLeft: sidebarExpanded ? 10 : 6,
                  paddingRight: 10,
                  background: isActive
                    ? (item.demo ? 'rgba(37,75,206,0.12)' : (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,22,96,0.06)'))
                    : 'transparent',
                  transition: 'padding-left 160ms ease',
                })}
                onMouseOver={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,22,96,0.04)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {({ isActive }) => (
                  <>
                    <span className="shrink-0" style={{color: item.demo ? '#254BCE' : (isActive ? (dark ? '#fff' : '#001660') : (dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,22,96,0.45)'))}}>
                      {item.icon}
                    </span>
                    <span style={{
                      whiteSpace: 'nowrap',
                      opacity: sidebarExpanded ? 1 : 0,
                      transition: 'opacity 120ms ease',
                      color: item.demo ? '#254BCE' : (isActive ? (dark ? '#fff' : '#001660') : (dark ? 'rgba(255,255,255,0.55)' : 'rgba(0,22,96,0.55)')),
                      fontWeight: item.demo ? 600 : undefined,
                    }}>
                      {item.label}
                      {item.demo && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide px-1 py-0.5 rounded" style={{background:'rgba(37,75,206,0.12)', color:'#254BCE'}}>
                          demo
                        </span>
                      )}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto" style={{background: dark ? '#0F172A' : '#F0F2F5'}}>
          <Outlet />
        </main>
      </div>
    </div>
    </ThemeContext.Provider>
  )
}
