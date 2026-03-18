import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const SETTINGS_NAV = [
  { label: 'User Management', path: '/settings/users' },
  { label: 'Organizations',   path: '/settings/organizations' },
  { label: 'Change Password', path: '/settings/password' },
]

export default function Settings() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Admin — user management and organization settings</p>
      </div>
      <div className="flex gap-4">
        {/* Settings sidebar */}
        <div className="w-48 flex flex-col gap-0.5 shrink-0">
          {SETTINGS_NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 min-h-64">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
